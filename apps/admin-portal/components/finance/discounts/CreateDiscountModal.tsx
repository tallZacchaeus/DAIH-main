"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Tag,
  Percent,
  Calendar,
  Building,
  Users,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";
import {
  DiscountType,
  CustomerEligibility,
  ResourceCategory,
  FacilityResource,
  CustomerRecord,
} from "@daih/types";

export interface CreateDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const CreateDiscountModal: React.FC<CreateDiscountModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<
    "general" | "targeting" | "limits"
  >("general");

  // Form fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<DiscountType>(DiscountType.PERCENTAGE);
  const [value, setValue] = useState<number | "">("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | "">("");
  const [minOrderAmount, setMinOrderAmount] = useState<number | "">("");
  const [isAutomatic, setIsAutomatic] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Scope: Resources
  const [spaceScope, setSpaceScope] = useState<
    "ALL" | "CATEGORIES" | "SPECIFIC"
  >("ALL");
  const [selectedCategories, setSelectedCategories] = useState<
    ResourceCategory[]
  >([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);

  // Scope: Customers
  const [customerScope, setCustomerScope] = useState<CustomerEligibility>(
    CustomerEligibility.ALL,
  );
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [emailDomainsInput, setEmailDomainsInput] = useState("");

  // Usage Limits & Dates
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [maxUsageTotal, setMaxUsageTotal] = useState<number | "">("");
  const [maxUsagePerUser, setMaxUsagePerUser] = useState<number | "">(1);

  // Resources & Customers for pickers
  const [availableResources, setAvailableResources] = useState<
    FacilityResource[]
  >([]);
  const [availableCustomers, setAvailableCustomers] = useState<
    CustomerRecord[]
  >([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingOptions(true);
      Promise.all([
        api.catalogue.getResources().catch(() => []),
        api.customers
          .getCustomers({ limit: 100 })
          .catch(() => ({ customers: [] })),
      ])
        .then(([resources, customersData]) => {
          setAvailableResources(resources || []);
          setAvailableCustomers(customersData?.customers || []);
        })
        .finally(() => setIsLoadingOptions(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateRandomCode = () => {
    const prefix = "DAIH";
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    setCode(`${prefix}-${random}`);
  };

  const handleCategoryToggle = (category: ResourceCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const handleResourceToggle = (id: string) => {
    setSelectedResourceIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const handleCustomerToggle = (id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.warning("Please enter a promotion name.", {
        title: "Name Required",
      });
      setActiveTab("general");
      return;
    }

    if (!isAutomatic && !code.trim()) {
      toast.warning("Promo code is required for non-automatic discounts.", {
        title: "Code Required",
      });
      setActiveTab("general");
      return;
    }

    if (value === "" || Number(value) <= 0) {
      toast.warning(
        "Please enter a valid discount rate or amount greater than 0.",
        {
          title: "Valid Value Required",
        },
      );
      setActiveTab("general");
      return;
    }

    if (type === DiscountType.PERCENTAGE && Number(value) > 100) {
      toast.warning("Percentage discount rate cannot exceed 100%.", {
        title: "Invalid Percentage",
      });
      setActiveTab("general");
      return;
    }

    if (spaceScope === "CATEGORIES" && selectedCategories.length === 0) {
      toast.warning("Please select at least one workspace category.", {
        title: "Category Required",
      });
      setActiveTab("targeting");
      return;
    }

    if (spaceScope === "SPECIFIC" && selectedResourceIds.length === 0) {
      toast.warning("Please select at least one specific facility workspace.", {
        title: "Workspace Required",
      });
      setActiveTab("targeting");
      return;
    }

    if (
      customerScope === CustomerEligibility.SPECIFIC_CUSTOMERS &&
      selectedCustomerIds.length === 0
    ) {
      toast.warning("Please select at least one whitelisted customer.", {
        title: "Customer Required",
      });
      setActiveTab("targeting");
      return;
    }

    const emailDomains = emailDomainsInput
      .split(",")
      .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean);

    if (
      customerScope === CustomerEligibility.DOMAIN_MATCH &&
      emailDomains.length === 0
    ) {
      toast.warning("Please enter at least one valid email domain.", {
        title: "Domain Required",
      });
      setActiveTab("targeting");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.discounts.create({
        code: !isAutomatic ? code.trim().toUpperCase() : undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        value: Number(value),
        maxDiscountAmount:
          maxDiscountAmount !== "" && Number(maxDiscountAmount) > 0
            ? Number(maxDiscountAmount)
            : undefined,
        minOrderAmount:
          minOrderAmount !== "" && Number(minOrderAmount) > 0
            ? Number(minOrderAmount)
            : 0,
        currency: "NGN",
        isAutomatic,
        isActive,
        appliesToAll: spaceScope === "ALL",
        targetCategories: spaceScope === "CATEGORIES" ? selectedCategories : [],
        targetResourceIds: spaceScope === "SPECIFIC" ? selectedResourceIds : [],
        customerEligibility: customerScope,
        targetCustomerIds:
          customerScope === CustomerEligibility.SPECIFIC_CUSTOMERS
            ? selectedCustomerIds
            : [],
        targetEmailDomains:
          customerScope === CustomerEligibility.DOMAIN_MATCH
            ? emailDomains
            : [],
        validFrom: validFrom ? new Date(validFrom).toISOString() : undefined,
        validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
        maxUsageTotal:
          maxUsageTotal !== "" && Number(maxUsageTotal) > 0
            ? Number(maxUsageTotal)
            : undefined,
        maxUsagePerUser: Number(maxUsagePerUser) || 1,
      });

      toast.success(`Promotion '${name}' created successfully!`, {
        title: "Promotion Created",
      });

      if (onCreated) onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create discount rule.", {
        title: "Error Creating Promotion",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-[#EBE7F5] shadow-xl text-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EBE7F5] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[#23055c]">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Create Promotion or Discount Rule
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Configure coupons, space promotions, or customer discounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#EBE7F5] px-6 bg-[#FAF9FF]">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "general"
                ? "border-[#23055c] text-[#23055c]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Tag className="w-4 h-4" />
            1. General &amp; Rate
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("targeting")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "targeting"
                ? "border-[#23055c] text-[#23055c]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building className="w-4 h-4" />
            2. Spaces &amp; Customers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("limits")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "limits"
                ? "border-[#23055c] text-[#23055c]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar className="w-4 h-4" />
            3. Limits &amp; Schedule
          </button>
        </div>

        {/* Content Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          {/* TAB 1: General */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Promotion Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Summer Innovators 20% Off"
                  className="w-full bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#23055c] focus:ring-1 focus:ring-[#23055c] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short internal note or public reason"
                  className="w-full bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#23055c] focus:ring-1 focus:ring-[#23055c] transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Promo Code{" "}
                      {!isAutomatic && <span className="text-rose-500">*</span>}
                    </label>
                    {!isAutomatic && (
                      <button
                        type="button"
                        onClick={handleGenerateRandomCode}
                        className="text-[11px] font-bold text-[#23055c] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" /> Auto-Generate
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={isAutomatic}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder={
                      isAutomatic
                        ? "Automatic rule (no code required)"
                        : "e.g. SUMMER20"
                    }
                    className="w-full bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 uppercase tracking-wider font-mono font-bold focus:outline-none focus:border-[#23055c] focus:ring-1 focus:ring-[#23055c] transition disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Discount Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as DiscountType)}
                    className="w-full bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#23055c] transition cursor-pointer"
                  >
                    <option value={DiscountType.PERCENTAGE}>
                      Percentage (% Off)
                    </option>
                    <option value={DiscountType.FIXED_AMOUNT}>
                      Fixed Amount (₦ Off)
                    </option>
                    <option value={DiscountType.FIXED_PRICE}>
                      Override Fixed Rate (Flat ₦)
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {type === DiscountType.PERCENTAGE
                      ? "Percentage Rate (%)"
                      : type === DiscountType.FIXED_AMOUNT
                        ? "Deduction Amount (₦)"
                        : "Override Rate (₦)"}{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0.01}
                      max={type === DiscountType.PERCENTAGE ? 100 : undefined}
                      step={type === DiscountType.PERCENTAGE ? "0.1" : "100"}
                      value={value}
                      onChange={(e) =>
                        setValue(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      placeholder={
                        type === DiscountType.PERCENTAGE ? "20" : "5000"
                      }
                      className="w-full bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-[#23055c] focus:ring-1 focus:ring-[#23055c] transition"
                    />
                    <div className="absolute left-3 top-2.5 text-slate-400">
                      {type === DiscountType.PERCENTAGE ? (
                        <Percent className="w-4 h-4" />
                      ) : (
                        <span className="text-xs font-bold">₦</span>
                      )}
                    </div>
                  </div>
                </div>

                {type === DiscountType.PERCENTAGE && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Max Discount Cap (₦ Optional)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={maxDiscountAmount}
                      onChange={(e) =>
                        setMaxDiscountAmount(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      placeholder="e.g. 15000 (limits 20% to max ₦15k)"
                      className="w-full bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#23055c] focus:ring-1 focus:ring-[#23055c] transition"
                    />
                  </div>
                )}
              </div>

              {/* Automatic toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl cursor-pointer hover:bg-purple-50/50 transition">
                  <input
                    type="checkbox"
                    checked={isAutomatic}
                    onChange={(e) => setIsAutomatic(e.target.checked)}
                    className="w-4 h-4 rounded border-[#EBE7F5] text-[#23055c] focus:ring-[#23055c] focus:ring-offset-0"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Apply Automatically at Checkout
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Eligible customers will receive this discount without
                      typing a coupon code.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: Targeting */}
          {activeTab === "targeting" && (
            <div className="space-y-5">
              {/* Product / Workspace Scope */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Workspace / Product Applicability
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "ALL", label: "All Spaces" },
                    { id: "CATEGORIES", label: "Space Categories" },
                    { id: "SPECIFIC", label: "Specific Spaces" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSpaceScope(s.id as any)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition text-center cursor-pointer ${
                        spaceScope === s.id
                          ? "bg-purple-50 border-[#23055c] text-[#23055c] shadow-xs"
                          : "bg-[#FAF9FF] border-[#EBE7F5] text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {spaceScope === "CATEGORIES" && (
                  <div className="p-3 bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl space-y-2">
                    <div className="text-xs text-slate-500 font-medium mb-2">
                      Select qualifying categories:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.values(ResourceCategory).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleCategoryToggle(cat)}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs font-medium transition cursor-pointer ${
                            selectedCategories.includes(cat)
                              ? "bg-purple-50 border-[#23055c] text-[#23055c]"
                              : "bg-white border-[#EBE7F5] text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold ${
                              selectedCategories.includes(cat)
                                ? "bg-[#23055c] text-white"
                                : "border border-slate-300"
                            }`}
                          >
                            {selectedCategories.includes(cat) && "✓"}
                          </div>
                          <span className="truncate">
                            {cat.replace(/_/g, " ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {spaceScope === "SPECIFIC" && (
                  <div className="p-3 bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl space-y-2">
                    <div className="text-xs text-slate-500 font-medium mb-2">
                      Select specific facility resources:
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {availableResources.map((res) => (
                        <button
                          key={res.id}
                          type="button"
                          onClick={() => handleResourceToggle(res.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg border text-left text-xs transition cursor-pointer ${
                            selectedResourceIds.includes(res.id)
                              ? "bg-purple-50 border-[#23055c] text-[#23055c]"
                              : "bg-white border-[#EBE7F5] text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className="font-semibold truncate">
                            {res.name}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">
                            {res.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Targeting Scope */}
              <div className="space-y-3 pt-2 border-t border-[#EBE7F5]">
                <label className="block text-xs font-bold text-slate-800">
                  Customer Eligibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: CustomerEligibility.ALL, label: "All Customers" },
                    {
                      id: CustomerEligibility.FIRST_TIME_ONLY,
                      label: "First-Time Bookers Only",
                    },
                    {
                      id: CustomerEligibility.SPECIFIC_CUSTOMERS,
                      label: "Specific Members",
                    },
                    {
                      id: CustomerEligibility.DOMAIN_MATCH,
                      label: "Corporate Email Domain",
                    },
                  ].map((cs) => (
                    <button
                      key={cs.id}
                      type="button"
                      onClick={() => setCustomerScope(cs.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition text-left cursor-pointer ${
                        customerScope === cs.id
                          ? "bg-purple-50 border-[#23055c] text-[#23055c] shadow-xs"
                          : "bg-[#FAF9FF] border-[#EBE7F5] text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {cs.label}
                    </button>
                  ))}
                </div>

                {customerScope === CustomerEligibility.SPECIFIC_CUSTOMERS && (
                  <div className="p-3 bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl space-y-2">
                    <div className="text-xs text-slate-500 font-medium mb-2">
                      Select whitelisted member accounts:
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {availableCustomers.map((cust) => {
                        const targetId = cust.userId || cust.id;
                        return (
                          <button
                            key={targetId}
                            type="button"
                            onClick={() => handleCustomerToggle(targetId)}
                            className={`w-full flex items-center justify-between p-2 rounded-lg border text-left text-xs transition cursor-pointer ${
                              selectedCustomerIds.includes(targetId)
                                ? "bg-purple-50 border-[#23055c] text-[#23055c]"
                                : "bg-white border-[#EBE7F5] text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <div>
                              <div className="font-bold text-slate-900">
                                {cust.firstName} {cust.lastName}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {cust.email}
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {cust.id}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {customerScope === CustomerEligibility.DOMAIN_MATCH && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Allowed Email Domains (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={emailDomainsInput}
                      onChange={(e) => setEmailDomainsInput(e.target.value)}
                      placeholder="e.g. acme.com, google.com, paystack.com"
                      className="w-full bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#23055c] focus:ring-1 focus:ring-[#23055c] transition"
                    />
                    <p className="text-[11px] text-slate-400 font-medium">
                      Users booking with emails ending in these domains will be
                      eligible.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Limits & Schedule */}
          {activeTab === "limits" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Valid From (Start Date/Time)
                  </label>
                  <input
                    type="datetime-local"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#23055c] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Valid Until (Expiration Date/Time)
                  </label>
                  <input
                    type="datetime-local"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#23055c] transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Total Redemption Limit (System-wide)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxUsageTotal}
                    onChange={(e) =>
                      setMaxUsageTotal(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="Leave empty for unlimited"
                    className="w-full bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#23055c] focus:ring-1 focus:ring-[#23055c] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Limit Per Customer
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxUsagePerUser}
                    onChange={(e) => setMaxUsagePerUser(Number(e.target.value))}
                    className="w-full bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#23055c] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Minimum Order Value (₦ Optional)
                </label>
                <input
                  type="number"
                  min={0}
                  value={minOrderAmount}
                  onChange={(e) =>
                    setMinOrderAmount(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  placeholder="e.g. 10000 (only applies if total reservation >= ₦10,000)"
                  className="w-full bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#23055c] focus:ring-1 focus:ring-[#23055c] transition"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl cursor-pointer hover:bg-purple-50/50 transition">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-[#EBE7F5] text-[#23055c] focus:ring-[#23055c] focus:ring-offset-0"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Activate Immediately
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Promotion is ready for redemption as soon as saved.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#EBE7F5] px-6 py-4 bg-[#FAF9FF] rounded-b-2xl">
          <div className="text-xs text-slate-400 font-medium">
            {activeTab === "general"
              ? "Step 1 of 3"
              : activeTab === "targeting"
                ? "Step 2 of 3"
                : "Step 3 of 3"}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-[#EBE7F5] rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            {activeTab !== "limits" ? (
              <button
                type="button"
                onClick={() =>
                  setActiveTab((prev) =>
                    prev === "general" ? "targeting" : "limits",
                  )
                }
                className="px-5 py-2 text-xs font-bold text-white bg-[#23055c] hover:bg-[#392271] rounded-xl transition cursor-pointer shadow-xs"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-5 py-2 text-xs font-bold text-white bg-[#23055c] hover:bg-[#392271] rounded-xl transition flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating Rule...
                  </>
                ) : (
                  "Create Promotion"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
