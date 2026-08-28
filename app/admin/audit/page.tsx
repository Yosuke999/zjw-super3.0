import type { Metadata } from "next";
import AuditLogPage from "./AuditLogPage";
import "../admin.css";

export const metadata: Metadata = {
  title: "审计日志 · 运营后台",
  description: "管理员安全与业务操作审计日志",
  robots: { index: false, follow: false },
};

export default function AdminAuditPage() {
  return <AuditLogPage />;
}
