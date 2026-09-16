export type PolicyType = "TERMS_OF_SERVICE" | "PRIVACY_POLICY";

export interface PolicyDocument {
  id: string;
  type: PolicyType;
  title: string;
  content: string;
  version: string;
  effectiveDate?: string | Date;
  updatedAt: string | Date;
  updatedBy?: string | null;
}

export interface UpdatePolicyDTO {
  title?: string;
  content: string;
  version?: string;
}
