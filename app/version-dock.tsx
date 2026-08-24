import Link from "next/link";

export default function VersionDock({ active }: { active: 1 | 2 | 3 }) {
  const versions = [
    { n: 1, href: "/", name: "丝路可信" },
    { n: 2, href: "/v2", name: "现代集市" },
    { n: 3, href: "/v3", name: "铁路智联" },
  ] as const;
  return <nav className="version-dock" aria-label="设计方案切换">
    <span className="version-dock-label">设计提案</span>
    {versions.map((item) => <Link className={active === item.n ? "active" : ""} href={item.href} prefetch={false} key={item.n}><b>0{item.n}</b><span>{item.name}</span></Link>)}
  </nav>;
}

