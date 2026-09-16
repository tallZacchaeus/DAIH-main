import { config } from "../../config/env.js";

export interface PaystackInitParams {
  email: string;
  amount: number; // in kobo (e.g. 10000 kobo = 100 NGN)
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
  channels?: string[];
}

export interface PaystackInitResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResult {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number; // in kobo
    message?: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address?: string;
    metadata?: any;
    log?: any;
    fees?: number | null;
    customer: {
      id?: number;
      first_name?: string | null;
      last_name?: string | null;
      email: string;
      customer_code?: string;
      phone?: string | null;
      metadata?: any;
      risk_action?: string;
    };
    authorization?: {
      authorization_code?: string;
      bin?: string;
      last4?: string;
      exp_month?: string;
      exp_year?: string;
      card_type?: string;
      bank?: string;
      country_code?: string;
      brand?: string;
      account_name?: string;
    };
  };
}

export class PaystackClient {
  private secretKey: string;
  private baseUrl = "https://api.paystack.co";

  constructor(secretKey: string = config.paystack.secretKey) {
    this.secretKey = secretKey;
  }

  /**
   * Initializes a transaction with Paystack
   */
  async initializeTransaction(
    params: PaystackInitParams,
  ): Promise<PaystackInitResult> {
    // If mock key or test environment without real key, return deterministic mock
    if (!this.secretKey || this.secretKey.includes("mock")) {
      return {
        authorization_url: `https://checkout.paystack.com/mock-checkout-${params.reference}`,
        access_code: `mock_code_${params.reference}`,
        reference: params.reference,
      };
    }

    const payload: Record<string, any> = {
      email: params.email,
      amount: Math.round(params.amount), // ensure integer kobo
      reference: params.reference,
    };

    if (params.callbackUrl) {
      payload.callback_url = params.callbackUrl;
    }
    if (params.metadata) {
      payload.metadata = params.metadata;
    }
    if (params.channels && params.channels.length > 0) {
      payload.channels = params.channels;
    }

    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json: any = await response.json();

      if (!response.ok || !json.status) {
        throw new Error(
          json.message ||
            `Paystack initialization failed with HTTP ${response.status}`,
        );
      }

      return {
        authorization_url: json.data.authorization_url,
        access_code: json.data.access_code,
        reference: json.data.reference,
      };
    } catch (err: any) {
      console.error("❌ Paystack initializeTransaction error:", err.message);
      throw err;
    }
  }

  /**
   * Verifies a transaction on Paystack
   */
  async verifyTransaction(
    reference: string,
  ): Promise<PaystackVerifyResult | null> {
    if (!this.secretKey || this.secretKey.includes("mock")) {
      // Mock response for test/mock environment
      return {
        status: true,
        message: "Verification successful",
        data: {
          id: Math.floor(100000 + Math.random() * 900000),
          domain: "test",
          status: "success",
          reference,
          amount: 1000000,
          gateway_response: "Approved",
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          channel: "card",
          currency: "NGN",
          customer: {
            email: "member@daih.ng",
          },
        },
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      const json: any = await response.json();

      if (!response.ok) {
        if (
          response.status === 404 ||
          json?.message?.toLowerCase().includes("not found")
        ) {
          return null;
        }
        throw new Error(
          json.message ||
            `Paystack verification failed with HTTP ${response.status}`,
        );
      }

      return json as PaystackVerifyResult;
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("not found")) {
        return null;
      }
      console.error(
        `❌ Paystack verifyTransaction error for '${reference}':`,
        err.message,
      );
      throw err;
    }
  }
}

export const paystackClient = new PaystackClient();
