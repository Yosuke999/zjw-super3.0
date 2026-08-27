"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { BASE_PATH } from "../base-path";
import { buildPhoneHref, buildWhatsappHref, customerServiceCopy, type ContactMethod, type SiteLanguage } from "../customer-service";
import { formatUnitCurrency, type Currency } from "../currency";
import CustomerServiceDock from "./CustomerServiceDock";
import { getClientContext } from "../lib/analytics-client";

type Props = {
  lang: SiteLanguage;
  product: {
    kind: string;
    name: string;
    image: string;
    moq: number;
    costCny: number;
  };
  currency: Currency;
};

const copy = {
  ru: {
    add: "Добавить в запрос", whatsapp: "Спросить в WhatsApp", phone: "Позвонить менеджеру",
    title: "Получить точную цену с доставкой", subtitle: "Товар уже добавлен. Укажите количество и контакты — менеджер подготовит расчёт.",
    quantity: "Количество", destination: "Город доставки", cities: ["Бишкек", "Ош", "Ташкент"], phoneLabel: "Контактный телефон",
    sameWhatsapp: "WhatsApp совпадает с телефоном", note: "Комментарий", notePlaceholder: "Модель, цвет, упаковка или срок",
    submit: "Отправить запрос", response: "Бесплатный расчёт · без обязательства заказывать", success: "Запрос отправлен. Менеджер свяжется с вами.", close: "Закрыть",
  },
  ky: {
    add: "Сурамга кошуу", whatsapp: "WhatsApp аркылуу суроо", phone: "Менеджерге чалуу",
    title: "Жеткирүү менен так бааны алыңыз", subtitle: "Товар кошулду. Санын жана байланыш маалыматын көрсөтүңүз — менеджер эсеп даярдайт.",
    quantity: "Саны", destination: "Жеткирүү шаары", cities: ["Бишкек", "Ош", "Ташкент"], phoneLabel: "Байланыш телефону",
    sameWhatsapp: "WhatsApp телефону менен бирдей", note: "Кошумча маалымат", notePlaceholder: "Модель, түс, таңгак же мөөнөт",
    submit: "Сурам жөнөтүү", response: "Акысыз эсеп · сатып алуу милдеттүү эмес", success: "Сурам жөнөтүлдү. Менеджер сиз менен байланышат.", close: "Жабуу",
  },
  uz: {
    add: "So‘rovga qo‘shish", whatsapp: "WhatsApp orqali so‘rash", phone: "Menejerga qo‘ng‘iroq",
    title: "Yetkazib berish bilan aniq narx", subtitle: "Mahsulot qo‘shildi. Miqdor va aloqani kiriting — menejer hisob tayyorlaydi.",
    quantity: "Miqdor", destination: "Yetkazish shahri", cities: ["Toshkent", "Bishkek", "Samarqand"], phoneLabel: "Aloqa telefoni",
    sameWhatsapp: "WhatsApp telefon bilan bir xil", note: "Izoh", notePlaceholder: "Model, rang, qadoq yoki muddat",
    submit: "So‘rov yuborish", response: "Bepul hisob · buyurtma majburiy emas", success: "So‘rov yuborildi. Menejer siz bilan bog‘lanadi.", close: "Yopish",
  },
  zh: {
    add: "加入询价单", whatsapp: "WhatsApp 咨询", phone: "电话联系采购经理",
    title: "获取准确到货价", subtitle: "商品已加入询价，请确认数量并留下联系方式。",
    quantity: "采购数量", destination: "收货城市", cities: ["比什凯克", "奥什", "塔什干"], phoneLabel: "联系电话",
    sameWhatsapp: "WhatsApp 与联系电话相同", note: "备注", notePlaceholder: "需要的型号、颜色、包装或交期",
    submit: "提交询价", response: "免费报价 · 不产生订购义务", success: "询价已提交，采购经理将尽快与您联系。", close: "关闭",
  },
} as const;

function CartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h2l1.5 9h9.8l1.6-6H7M9 19h.1M17 19h.1"/></svg>;
}

function WhatsappIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.4a8.4 8.4 0 0 0-7.2 12.7L3.7 20l4-1a8.4 8.4 0 1 0 4.3-15.6Zm0 15.3c-1.3 0-2.6-.4-3.7-1.1l-.3-.2-2.3.6.6-2.2-.2-.4A6.8 6.8 0 1 1 12 18.7Z"/></svg>;
}

export default function ProductInquiryActions({ lang, product, currency }: Props) {
  const text = copy[lang];
  const service = customerServiceCopy[lang];
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(product.moq);
  const [sameWhatsapp, setSameWhatsapp] = useState(true);
  const [preferred, setPreferred] = useState<ContactMethod>("phone");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const idempotencyKey = useRef("");
  const message = `${service.manager}: ${product.name} × ${quantity}`;
  const whatsappHref = buildWhatsappHref(message);
  const phoneHref = buildPhoneHref();

  const openInquiry = (method: ContactMethod = "phone") => {
    setPreferred(method);
    setSubmitted(false);
    setOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setSubmitted(false);
    setSubmitError("");
    try {
      const context = getClientContext();
      idempotencyKey.current ||= crypto.randomUUID();
      const phone = `${String(data.get("phoneCountryCode") ?? "")} ${String(data.get("phone") ?? "")}`.trim();
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey.current },
        body: JSON.stringify({
          ...context,
          website: data.get("website"),
          destination: data.get("destination"),
          phone,
          whatsapp: sameWhatsapp ? phone : data.get("whatsapp"),
          preferredContact: preferred,
          note: data.get("note"),
          language: lang,
          currency,
          market: lang === "uz" ? "uz" : "kg",
          items: [{ kind: product.kind, name: product.name, quantity, unitPriceCny: product.costCny }],
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Inquiry submission failed");
      setSubmitted(true);
      idempotencyKey.current = "";
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : "Inquiry submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return <>
    <div className="detail-action-group">
      <button className="detail-add-inquiry" type="button" onClick={() => openInquiry()} aria-controls="product-inquiry-drawer"><CartIcon/>{text.add}</button>
      {whatsappHref
        ? <a className="detail-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer"><WhatsappIcon/>{text.whatsapp}</a>
        : <button className="detail-whatsapp" type="button" onClick={() => openInquiry("whatsapp")}><WhatsappIcon/>{text.whatsapp}</button>}
      {phoneHref
        ? <a className="detail-phone-link" href={phoneHref}>{text.phone}</a>
        : <button className="detail-phone-link" type="button" onClick={() => openInquiry("phone")}>{text.phone}</button>}
    </div>

    <CustomerServiceDock lang={lang} context={message} onRequest={openInquiry}/>

    {open && <button className="drawer-backdrop" type="button" onClick={() => setOpen(false)} aria-label={text.close}/>}
    <aside id="product-inquiry-drawer" className={`inquiry-drawer product-inquiry-drawer ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="product-inquiry-title" aria-hidden={!open}>
      <header className="drawer-header">
        <div><span>{service.manager}</span><h2 id="product-inquiry-title">{text.title}</h2><p>{text.subtitle}</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label={text.close}>×</button>
      </header>
      <div className="inquiry-products detail-inquiry-product">
        <article>
          <Image src={`${BASE_PATH}${product.image}`} alt="" width={58} height={58} sizes="58px"/>
          <div className="inquiry-product-copy">
            <h3>{product.name}</h3>
            <span>{formatUnitCurrency(product.costCny, currency)}</span>
            <label>{text.quantity}<input type="number" min={product.moq} step="1" value={quantity} onChange={(event) => { setQuantity(Math.max(product.moq, Number(event.target.value) || product.moq)); setSubmitted(false); }}/></label>
          </div>
          <div className="inquiry-product-side"><strong>{formatUnitCurrency(product.costCny * quantity, currency)}</strong></div>
        </article>
      </div>
      <form className="contact-form" onSubmit={submit}>
        <label className="form-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
        <label className="field full"><span>{text.destination}</span><select name="destination" defaultValue={text.cities[0]}>{text.cities.map((city) => <option key={city}>{city}</option>)}</select></label>
        <label className="field full"><span>{text.phoneLabel} *</span><div className="phone-field"><select name="phoneCountryCode" defaultValue={lang === "uz" ? "+998" : "+996"}><option>+996</option><option>+998</option><option>+7</option><option>+86</option></select><input name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="000 000 000"/></div></label>
        <label className="check-field full"><input type="checkbox" checked={sameWhatsapp} onChange={(event) => setSameWhatsapp(event.target.checked)}/><span>{text.sameWhatsapp}</span></label>
        {!sameWhatsapp && <label className="field full"><span>WhatsApp</span><input name="whatsapp" type="tel" inputMode="tel" placeholder="000 000 000"/></label>}
        <fieldset className="contact-preference full"><legend>{service.manager}</legend><div>
          <button type="button" className={preferred === "phone" ? "active" : ""} onClick={() => setPreferred("phone")}>{service.phone}</button>
          <button type="button" className={preferred === "whatsapp" ? "active" : ""} onClick={() => setPreferred("whatsapp")}>{service.whatsapp}</button>
        </div></fieldset>
        <label className="field full"><span>{text.note}</span><textarea name="note" rows={3} placeholder={text.notePlaceholder}/></label>
        <button className="submit-inquiry full" type="submit" disabled={submitting}>{submitting ? "…" : text.submit}</button>
        <p className="response-note full">{service.response}<span>{text.response}</span></p>
        {submitError && <div className="inquiry-error full" role="alert">{submitError}</div>}
        {submitted && <div className="inquiry-success full" role="status">✓ {text.success}</div>}
      </form>
    </aside>
  </>;
}
