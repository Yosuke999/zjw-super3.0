export const inquiryStatuses = ["new", "contacted", "quoting", "won", "invalid"] as const;

export type InquiryStatus = (typeof inquiryStatuses)[number];

export const inquiryStatusLabels: Record<InquiryStatus, string> = {
  new: "新询价",
  contacted: "已联系",
  quoting: "报价中",
  won: "已成交",
  invalid: "无效询价",
};

export type InquiryItem = {
  kind: string;
  name: string;
  quantity: number;
  unitPriceCny: number;
};

export type InquiryRecord = {
  id: string;
  status: InquiryStatus;
  destination: string;
  phone: string;
  whatsapp: string;
  email: string;
  preferredContact: "phone" | "whatsapp" | "email";
  note: string;
  language: string;
  currency: string;
  market: string;
  sourcePath: string;
  source: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  visitorId: string;
  sessionId: string;
  items: InquiryItem[];
  totalCny: number;
  createdAt: string;
  updatedAt: string;
};

export type TrendPoint = {
  date: string;
  pageViews: number;
  visitors: number;
  inquiries: number;
};

export type RankedMetric = {
  label: string;
  pageViews: number;
  inquiries: number;
};

export type AdminSnapshot = {
  periodDays: number;
  metrics: {
    pageViews: number;
    visitors: number;
    sessions: number;
    inquiries: number;
    inquiryVisitors: number;
    conversionRate: number;
    validInquiryRate: number;
  };
  trend: TrendPoint[];
  sources: RankedMetric[];
  pages: RankedMetric[];
  inquiries: InquiryRecord[];
  totalInquiries: number;
};
