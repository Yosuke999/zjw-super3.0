export type SiteLanguage = "ru" | "ky" | "uz" | "zh";
export type ContactMethod = "phone" | "whatsapp";

// Only publish verified contact details here. Empty values keep the UI working
// by opening the on-page inquiry form instead of exposing a fake number.
export const customerServiceConfig = {
  phoneNumber: "",
  whatsappNumber: "",
} as const;

export const customerServiceCopy = {
  ru: {
    manager: "Менеджер по закупкам",
    response: "Ответим в рабочее время за 30 минут",
    phone: "Позвонить",
    whatsapp: "WhatsApp",
    inquiry: "Получить расчёт",
    heroContact: "Связаться с менеджером",
    genericTitle: "Связаться с менеджером",
    genericSubtitle: "Оставьте телефон или WhatsApp — уточним товар, количество и доставку.",
    genericHint: "Товар можно выбрать позже. Опишите задачу в комментарии.",
  },
  ky: {
    manager: "Сатып алуу боюнча менеджер",
    response: "Иш убактысында 30 мүнөттө жооп беребиз",
    phone: "Чалуу",
    whatsapp: "WhatsApp",
    inquiry: "Эсеп алуу",
    heroContact: "Менеджер менен байланышуу",
    genericTitle: "Менеджер менен байланышуу",
    genericSubtitle: "Телефон же WhatsApp калтырыңыз — товарды, санын жана жеткирүүнү тактайбыз.",
    genericHint: "Товарды кийин тандасаңыз болот. Каалооңузду комментарийге жазыңыз.",
  },
  uz: {
    manager: "Xarid bo‘yicha menejer",
    response: "Ish vaqtida 30 daqiqada javob beramiz",
    phone: "Qo‘ng‘iroq",
    whatsapp: "WhatsApp",
    inquiry: "Hisob olish",
    heroContact: "Menejer bilan bog‘lanish",
    genericTitle: "Menejer bilan bog‘lanish",
    genericSubtitle: "Telefon yoki WhatsApp qoldiring — mahsulot, miqdor va yetkazishni aniqlashtiramiz.",
    genericHint: "Mahsulotni keyinroq tanlashingiz mumkin. Talabni izohda yozing.",
  },
  zh: {
    manager: "采购经理",
    response: "工作时间内 30 分钟回复",
    phone: "电话联系",
    whatsapp: "WhatsApp",
    inquiry: "获取报价",
    heroContact: "联系采购经理",
    genericTitle: "联系采购经理",
    genericSubtitle: "留下电话或 WhatsApp，我们先确认商品、数量和运输需求。",
    genericHint: "暂时没有选好商品也可以，直接在备注里描述采购需求。",
  },
} as const;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function buildPhoneHref() {
  const number = customerServiceConfig.phoneNumber.trim();
  return number ? `tel:${number}` : null;
}

export function buildWhatsappHref(message: string) {
  const number = digitsOnly(customerServiceConfig.whatsappNumber);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
