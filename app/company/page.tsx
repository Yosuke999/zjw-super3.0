import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "公司信息", description: "中亚商机网本地演示版的运营状态、服务范围与交易提示。", alternates: { canonical: "/company" } };

export default function CompanyPage() {
  return <main className="legal-shell"><header><Link href="/">中亚商机网</Link><Link href="/">← 返回首页</Link></header><article><span>COMPANY DISCLOSURE</span><h1>公司与平台信息</h1><p className="legal-lead">当前版本是本地功能演示，不代表已完成上线、主体备案或在线交易能力。</p><section><h2>平台定位</h2><p>中亚商机网用于展示中国源头商品、采购参考价与面向吉尔吉斯斯坦、乌兹别克斯坦的物流信息，并提供人工询价入口。</p></section><section><h2>运营主体状态</h2><dl><div><dt>产品名称</dt><dd>中亚商机网</dd></div><div><dt>当前环境</dt><dd>本地演示版</dd></div><div><dt>法律主体</dt><dd>待正式上线前补充并核验</dd></div><div><dt>注册地址 / 统一识别号</dt><dd>待正式上线前补充并核验</dd></div><div><dt>商务与隐私联系方式</dt><dd>待正式上线前开通</dd></div></dl></section><section><h2>交易提示</h2><p>本地版不收款、不创建具有法律效力的订单，也不承诺库存和交期。页面价格、销量和物流时效均为演示或参考信息，正式交易必须以经双方确认的合同、报价单与付款条款为准。</p></section><aside>上线前必须将本页待补充字段替换为经核验的真实公司名称、注册号、地址、电话和邮箱。</aside></article></main>;
}
