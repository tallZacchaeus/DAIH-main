export type PolicyType = "TERMS_OF_SERVICE" | "PRIVACY_POLICY";

export interface LegalPolicyRecord {
  id: string;
  type: PolicyType;
  title: string;
  content: string;
  version: string;
  effectiveDate: Date;
  updatedAt: Date;
  updatedBy?: string | null;
}

export interface UpdatePolicyDTO {
  title?: string;
  content: string;
  version?: string;
}
