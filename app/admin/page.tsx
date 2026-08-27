import type { Metadata } from "next";
import AdminApp from "./AdminApp";
import "./admin.css";

export const metadata: Metadata = {
  title: "运营后台",
  description: "中亚商机网询价与访问数据管理后台",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
