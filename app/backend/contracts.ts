export const inquiryStatuses = ["new", "contacted", "quoting", "won", "invalid"] as const;

export type InquiryStatus = (typeof inquiryStatuses)[number];

export const analyticsEventNames = [
  "page_view",
  "product_view",
  "product_card_click",
  "search_performed",
  "category_selected",
  "market_changed",
  "inquiry_item_added",
  "inquiry_opened",
  "inquiry_started",
  "inquiry_validation_error",
  "inquiry_submitted",
  "contact_clicked",
  "language_changed",
  "currency_changed",
  "page_engagement",
  "page_error",
  "web_vital",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export type AnalyticsPropertyValue = string | number | boolean;
export type AnalyticsProperties = Record<string, AnalyticsPropertyValue>;

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
  tracking: {
    eventCount: number;
    identifiedViewRate: number;
    lastEventAt: string;
    funnel: Partial<Record<AnalyticsEventName, number>>;
  };
  inquiries: InquiryRecord[];
  totalInquiries: number;
  inquiryPage: {
    page: number;
    pageSize: number;
    totalPages: number;
  };
};
