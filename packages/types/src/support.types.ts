export interface FAQItemDTO {
  id: string;
  category: string;
  question: string;
  answer: string;
  isPublished: boolean;
  orderIndex: number;
}

export interface SupportContactChannelsDTO {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  operatingHours: string;
}

export interface SupportSettingsRecord {
  id: string;
  contact: SupportContactChannelsDTO;
  faqs: FAQItemDTO[];
  updatedAt: string;
  updatedBy?: string | null;
}

export interface UpdateSupportSettingsDTO {
  contact?: Partial<SupportContactChannelsDTO>;
  faqs?: FAQItemDTO[];
}
