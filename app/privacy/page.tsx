import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "隐私政策", description: "中亚商机网询价服务与访问统计隐私政策。", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return <main className="legal-shell"><header><Link href="/">中亚商机网</Link><Link href="/">← 返回首页</Link></header><article><span>PRIVACY NOTICE · 2026-08-27</span><h1>隐私政策</h1><p className="legal-lead">我们仅为提供采购询价、客户跟进和改进网站体验而处理必要信息，不出售客户个人信息。</p><section><h2>我们收集的信息</h2><p>当你提交询价时，我们会保存收货城市、联系电话、WhatsApp、邮箱、偏好联系方式、商品及数量、备注、提交页面和营销来源。网站还会使用随机访客编号和会话编号统计页面浏览、独立访客及询价转化；不会在统计记录中保存完整 IP 地址。</p></section><section><h2>处理目的</h2><p>这些信息用于准备采购与物流报价、联系和跟进客户、识别无效或重复询价、衡量页面与推广渠道效果，以及保障接口安全。网站不提供在线支付，也不会要求身份证件、银行卡密码或验证码。</p></section><section><h2>保存与安全</h2><p>询价数据保存在受访问控制的数据库中，仅授权管理员可以查看。管理员登录采用加密签名会话、登录频率限制和安全 Cookie。运营主体应根据成交、争议处理和法定义务确定最终保存期限，并定期删除不再需要的数据。</p></section><section><h2>服务提供商</h2><p>网站使用专业托管与网络安全服务，使用 Supabase 提供 PostgreSQL 数据库基础设施；如启用新询价邮件通知，通知服务商仅接收发送通知所需的信息。除履行服务、遵守法律或取得你的同意外，我们不会向其他机构共享个人信息。</p></section><section><h2>你的权利</h2><p>你可以请求查询、更正或删除已提交的信息，也可以反对非必要的统计处理。正式上线前，运营主体必须在公司信息页公布有效的隐私与商务联系方式，以便处理这些请求。</p></section></article></main>;
}
