import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "公司信息", description: "中亚商机网运营主体、服务范围与交易提示。", alternates: { canonical: "/company" } };

export default function CompanyPage() {
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "待配置";
  const companyRegistration = process.env.NEXT_PUBLIC_COMPANY_REGISTRATION ?? "待配置";
  const companyAddress = process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? "待配置";
  const businessContact = process.env.NEXT_PUBLIC_BUSINESS_CONTACT ?? "待配置";
  const incomplete = [companyName, companyRegistration, companyAddress, businessContact].includes("待配置");
  return <main className="legal-shell"><header><Link href="/">中亚商机网</Link><Link href="/">← 返回首页</Link></header><article><span>COMPANY DISCLOSURE</span><h1>公司与平台信息</h1><p className="legal-lead">中亚商机网连接中国源头商品与中亚采购需求，提供商品展示、人工询价和采购协助服务。</p><section><h2>平台定位</h2><p>平台展示中国源头商品、采购参考价与面向吉尔吉斯斯坦、乌兹别克斯坦的物流信息，并将客户询价交由采购经理跟进。</p></section><section><h2>运营主体</h2><dl><div><dt>产品名称</dt><dd>中亚商机网</dd></div><div><dt>法律主体</dt><dd>{companyName}</dd></div><div><dt>注册号 / 统一识别号</dt><dd>{companyRegistration}</dd></div><div><dt>注册地址</dt><dd>{companyAddress}</dd></div><div><dt>商务与隐私联系方式</dt><dd>{businessContact}</dd></div></dl></section><section><h2>交易提示</h2><p>网站询价不等同于下单或付款，也不自动创建具有法律效力的订单。页面价格、销量和物流时效均为参考信息，库存、交期、质量标准和最终费用以双方确认的报价单、合同及付款条款为准。</p></section>{incomplete && <aside>正式公开上线前，必须通过生产环境变量补充并核验真实公司名称、注册号、地址和联系方式。</aside>}</article></main>;
}
