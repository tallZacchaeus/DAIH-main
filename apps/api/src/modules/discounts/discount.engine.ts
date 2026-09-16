import {
  DiscountType,
  CustomerEligibility,
  ResourceCategory,
} from "@daih/types";

export interface CalculateDiscountParams {
  basePrice: number;
  type: DiscountType;
  value: number;
  maxDiscountAmount?: number | null;
  taxRate?: number; // e.g. 0.075 for 7.5% VAT, default 0
}

export interface DiscountBreakdown {
  basePrice: number;
  discountAmount: number;
  netTaxableSubtotal: number;
  taxAmount: number;
  grandTotal: number;
}

/**
 * Pure function: Calculates pre-tax discount and resulting tax/total.
 * Formula:
 *  - Discount applied pre-tax directly to base list price.
 *  - Net Taxable Subtotal = max(0, Base Price - Discount Amount)
 *  - Tax = round(Net Taxable Subtotal * taxRate)
 *  - Grand Total = Net Taxable Subtotal + Tax
 */
export function calculatePreTaxDiscount(
  params: CalculateDiscountParams,
): DiscountBreakdown {
  const { basePrice, type, value, maxDiscountAmount, taxRate = 0 } = params;

  let calculatedDiscount = 0;

  if (type === DiscountType.PERCENTAGE) {
    const rawDiscount = (basePrice * value) / 100;
    if (
      maxDiscountAmount !== undefined &&
      maxDiscountAmount !== null &&
      maxDiscountAmount > 0
    ) {
      calculatedDiscount = Math.min(rawDiscount, maxDiscountAmount);
    } else {
      calculatedDiscount = rawDiscount;
    }
  } else if (type === DiscountType.FIXED_AMOUNT) {
    calculatedDiscount = Math.min(basePrice, value);
  } else if (type === DiscountType.FIXED_PRICE) {
    // If basePrice is 50,000 and fixed override price is 30,000, discount is 20,000.
    calculatedDiscount = Math.max(0, basePrice - value);
  }

  // Ensure discount does not exceed basePrice and is non-negative
  calculatedDiscount = Math.min(basePrice, Math.max(0, calculatedDiscount));

  // Round discount to 2 decimal places
  calculatedDiscount = Math.round(calculatedDiscount * 100) / 100;

  const netTaxableSubtotal = Math.max(0, basePrice - calculatedDiscount);
  const taxAmount = Math.round(netTaxableSubtotal * taxRate * 100) / 100;
  const grandTotal = Math.round((netTaxableSubtotal + taxAmount) * 100) / 100;

  return {
    basePrice,
    discountAmount: calculatedDiscount,
    netTaxableSubtotal,
    taxAmount,
    grandTotal,
  };
}

export interface DiscountValidationRuleInput {
  discount: {
    id: string;
    code: string | null;
    name: string;
    type: DiscountType;
    value: number | any;
    maxDiscountAmount?: number | any | null;
    minOrderAmount: number | any;
    isActive: boolean;
    validFrom: Date | string;
    validUntil?: Date | string | null;
    maxUsageTotal?: number | null;
    maxUsagePerUser: number;
    currentUsageCount: number;
    appliesToAll: boolean;
    targetCategories: ResourceCategory[] | string[];
    customerEligibility: CustomerEligibility;
    targetEmailDomains: string[];
    targetResources?: { resourceId: string }[];
    targetCustomers?: { userId: string }[];
  };
  context: {
    userId: string;
    userEmail?: string;
    userPriorBookingsCount: number;
    userPriorRedemptionsCount: number;
    resourceId: string;
    resourceCategory: ResourceCategory;
    basePrice: number;
    now?: Date;
  };
}

export interface DiscountValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates whether a given customer and space qualifies for a discount rule.
 */
export function validateDiscountEligibility(
  input: DiscountValidationRuleInput,
): DiscountValidationResult {
  const { discount, context } = input;
  const now = context.now || new Date();

  // 1. Check Active status
  if (!discount.isActive) {
    return { valid: false, reason: "This promotion is currently inactive." };
  }

  // 2. Check Validity Date Window (with 60-second grace for sub-second clock skew on fresh rules)
  const from = new Date(discount.validFrom);
  if (now.getTime() + 60000 < from.getTime()) {
    return {
      valid: false,
      reason: `This promotion starts on ${from.toLocaleDateString()}.`,
    };
  }
  if (discount.validUntil) {
    const until = new Date(discount.validUntil);
    if (now > until) {
      return {
        valid: false,
        reason: "This promotion has expired.",
      };
    }
  }

  // 3. Check Global Usage Limit
  if (
    discount.maxUsageTotal !== null &&
    discount.maxUsageTotal !== undefined &&
    discount.currentUsageCount >= discount.maxUsageTotal
  ) {
    return {
      valid: false,
      reason: "This promotion has reached its maximum total redemptions limit.",
    };
  }

  // 4. Check Per-User Redemption Limit
  if (context.userPriorRedemptionsCount >= discount.maxUsagePerUser) {
    return {
      valid: false,
      reason: `You have already redeemed this promotion the maximum permitted number of times (${discount.maxUsagePerUser}).`,
    };
  }

  // 5. Check Minimum Order Amount
  const minOrder = Number(discount.minOrderAmount) || 0;
  if (minOrder > 0 && context.basePrice < minOrder) {
    return {
      valid: false,
      reason: `This promotion requires a minimum booking value of ₦${minOrder.toLocaleString()}.`,
    };
  }

  // 6. Check Product / Space Targeting
  if (!discount.appliesToAll) {
    const hasCategoryTarget =
      discount.targetCategories && discount.targetCategories.length > 0;
    const hasResourceTarget =
      discount.targetResources && discount.targetResources.length > 0;

    const matchesCategory =
      hasCategoryTarget &&
      discount.targetCategories.includes(context.resourceCategory);

    const matchesResource =
      hasResourceTarget &&
      discount.targetResources!.some(
        (r) => r.resourceId === context.resourceId,
      );

    if (hasCategoryTarget || hasResourceTarget) {
      if (!matchesCategory && !matchesResource) {
        return {
          valid: false,
          reason: "This promotion is not applicable to the selected workspace.",
        };
      }
    }
  }

  // 7. Check Customer Eligibility
  if (discount.customerEligibility === CustomerEligibility.SPECIFIC_CUSTOMERS) {
    const allowedUsers = discount.targetCustomers || [];
    const isWhitelisted = allowedUsers.some((u) => u.userId === context.userId);
    if (!isWhitelisted) {
      return {
        valid: false,
        reason: "This exclusive discount is restricted to designated members.",
      };
    }
  } else if (
    discount.customerEligibility === CustomerEligibility.FIRST_TIME_ONLY
  ) {
    if (context.userPriorBookingsCount > 0) {
      return {
        valid: false,
        reason:
          "This promotion is reserved exclusively for first-time bookers.",
      };
    }
  } else if (
    discount.customerEligibility === CustomerEligibility.DOMAIN_MATCH
  ) {
    if (!context.userEmail) {
      return {
        valid: false,
        reason: "Valid corporate email is required to redeem this promotion.",
      };
    }
    const emailDomain = context.userEmail.split("@")[1]?.toLowerCase();
    const allowedDomains = (discount.targetEmailDomains || []).map((d) =>
      d.toLowerCase().replace(/^@/, ""),
    );
    if (!emailDomain || !allowedDomains.includes(emailDomain)) {
      return {
        valid: false,
        reason: `This promotion is exclusive to eligible corporate email domains (${allowedDomains.map((d) => `@${d}`).join(", ")}).`,
      };
    }
  }

  return { valid: true };
}
