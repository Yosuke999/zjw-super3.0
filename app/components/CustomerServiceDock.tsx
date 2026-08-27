"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import {
  buildPhoneHref,
  buildWhatsappHref,
  customerServiceCopy,
  type ContactMethod,
  type SiteLanguage,
} from "../customer-service";
import { trackAnalytics } from "../lib/analytics-client";

type Props = {
  lang: SiteLanguage;
  context?: string;
  onRequest: (method: ContactMethod) => void;
};

function PhoneIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 3.5 9.5 8 7.9 9.6c.8 2.1 2.4 3.7 4.5 4.5l1.6-1.6 4.5 2.3-.8 3.4c-.2.8-1 1.4-1.8 1.3C9.5 18.8 5.2 14.5 4.5 8.1c-.1-.8.5-1.6 1.3-1.8l1.4-2.8Z"/></svg>;
}

function WhatsappIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.4a8.4 8.4 0 0 0-7.2 12.7L3.7 20l4-1a8.4 8.4 0 1 0 4.3-15.6Zm0 15.3c-1.3 0-2.6-.4-3.7-1.1l-.3-.2-2.3.6.6-2.2-.2-.4A6.8 6.8 0 1 1 12 18.7Zm3.8-5.1c-.2-.1-1.2-.6-1.4-.6-.2-.1-.3-.1-.5.1l-.7.8c-.1.2-.3.2-.5.1-1.2-.6-2.2-1.4-3-2.6-.2-.2 0-.4.1-.5l.4-.4.2-.4c.1-.1 0-.3 0-.4l-.6-1.5c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.6.6-.9 1.4-.8 2.2.1 1 .5 1.9 1.1 2.7 1.5 2.1 3.5 3.7 5.9 4.3.7.2 1.5.1 2.1-.3.6-.4 1-1 1.1-1.7.1-.2 0-.4-.1-.5-.5-.4-1-.6-1.6-.8Z"/></svg>;
}

export default function CustomerServiceDock({ lang, context = "", onRequest }: Props) {
  const copy = customerServiceCopy[lang];
  const message = context || copy.genericSubtitle;
  const phoneHref = buildPhoneHref();
  const whatsappHref = buildWhatsappHref(message);

  const contactControl = (method: ContactMethod, className: string, label: string, icon: ReactNode) => {
    const href = method === "phone" ? phoneHref : whatsappHref;
    const recordContact = () => void trackAnalytics("contact_clicked", { method, target: "customer-service" });
    return href ? <a className={className} href={href} target={method === "whatsapp" ? "_blank" : undefined} rel={method === "whatsapp" ? "noreferrer" : undefined} onClick={recordContact}>{icon}<span>{label}</span></a>
      : <button className={className} type="button" onClick={() => { recordContact(); onRequest(method); }}>{icon}<span>{label}</span></button>;
  };

  return <>
    <aside className="service-dock" aria-label={copy.manager}>
      <div className="service-dock-copy"><Image className="service-avatar" src="/avatars/procurement-manager-v1.jpg" alt="" width={34} height={34} sizes="34px"/><span><strong>{copy.manager}</strong><small>{copy.response}</small></span></div>
      <div className="service-dock-actions">
        {contactControl("phone", "service-phone", copy.phone, <PhoneIcon/>)}
        {contactControl("whatsapp", "service-whatsapp", copy.whatsapp, <WhatsappIcon/>)}
      </div>
    </aside>
    <nav className="mobile-service-bar" aria-label={copy.manager}>
      {contactControl("phone", "service-phone", copy.phone, <PhoneIcon/>)}
      {contactControl("whatsapp", "service-whatsapp", copy.whatsapp, <WhatsappIcon/>)}
    </nav>
  </>;
}
