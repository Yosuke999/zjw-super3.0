import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "隐私政策", description: "中亚商机网本地演示版隐私政策。", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return <main className="legal-shell"><header><Link href="/">中亚商机网</Link><Link href="/">← 返回首页</Link></header><article><span>PRIVACY NOTICE · 2026-08-25</span><h1>隐私政策</h1><p className="legal-lead">本地演示版不会把询价表单发送至服务器；刷新或关闭页面后，表单内容不会由本项目保存。</p><section><h2>可能填写的信息</h2><p>询价表单可能包含收货城市、联系电话、WhatsApp、邮箱、偏好联系方式、商品数量及备注。请勿在演示环境填写身份证件、银行卡、密码或其他敏感信息。</p></section><section><h2>本地版如何处理</h2><p>当前“提交”仅在浏览器内显示成功状态，不会发起网络提交，也没有数据库、用户账户、支付或第三方分析服务。商品筛选、语言、货币和询价单状态仅存在于当前页面会话。</p></section><section><h2>正式上线前</h2><p>若未来接入询价接口、客户管理、统计、Cookie 或第三方服务，本政策必须同步更新，明确运营主体、处理目的、保存期限、共享对象、跨境传输、安全措施以及访问、更正和删除渠道，并在收集前取得必要同意。</p></section><section><h2>你的选择</h2><p>在本地演示阶段，可直接关闭页面或刷新以清除当前会话中的表单与询价状态。正式联系方式将在公司主体完成核验后公布。</p></section></article></main>;
}
