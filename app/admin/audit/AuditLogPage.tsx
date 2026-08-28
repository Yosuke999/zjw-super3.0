"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AdminAuditPage } from "../../backend/contracts";

const actionLabels: Record<string, string> = {
  "admin.login.success": "登录成功",
  "admin.login.failure": "登录失败",
  "admin.login.mfa_required": "等待 MFA 验证",
  "admin.logout": "退出登录",
  "admin.session.revoke": "撤销会话",
  "admin.inquiry.status_change": "修改询价状态",
  "admin.inquiry.csv_export": "导出询价 CSV",
  "admin.user.create": "创建管理员",
  "admin.user.activate": "启用管理员",
  "admin.user.deactivate": "停用管理员",
  "admin.user.role_change": "调整管理员角色",
  "admin.user.update": "更新管理员资料",
  "admin.mfa.reset": "重置 MFA",
  "admin.password.change": "修改管理员密码",
  "admin.identity.view": "查看身份或审计数据",
  "admin.dashboard.view": "查看运营后台",
  "admin.login.password": "登录密码验证（历史）",
  "admin.login.complete": "登录成功（历史）",
  "admin.login.mfa": "MFA 验证（历史）",
  "admin.session.revoke_all": "撤销全部会话（历史）",
  "admin.inquiry.status": "修改询价状态（历史）",
  "admin.inquiry.export": "导出询价（历史）",
};

const outcomeLabels = { success: "成功", failure: "失败", denied: "拒绝" } as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date(value));
}

function shortFingerprint(value: string) {
  return value ? `${value.slice(0, 8)}…${value.slice(-4)}` : "—";
}

function metadataText(metadata: Record<string, string | number | boolean>) {
  const entries = Object.entries(metadata);
  return entries.length ? entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ") : "—";
}

export default function AuditLogPage() {
  const router = useRouter();
  const [result, setResult] = useState<AdminAuditPage | null>(null);
  const [administrator, setAdministrator] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (page = 1, filters?: { administrator: string; action: string; from: string; to: string }) => {
    setLoading(true); setError("");
    try {
      const selected = filters ?? { administrator, action, from, to };
      const parameters = new URLSearchParams({ ...selected, page: String(page), pageSize: "50" });
      const response = await fetch(`/api/admin/audit?${parameters}`, { cache: "no-store" });
      if (response.status === 401) { router.push("/admin"); return; }
      const body = await response.json() as { result?: AdminAuditPage; error?: string };
      if (!response.ok || !body.result) throw new Error(body.error || "审计日志加载失败");
      setResult(body.result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "审计日志加载失败");
    } finally {
      setLoading(false);
    }
  }, [action, administrator, from, router, to]);

  useEffect(() => { const timer = window.setTimeout(() => void load(1), 0); return () => window.clearTimeout(timer); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (event: FormEvent) => { event.preventDefault(); void load(1); };
  const reset = () => {
    setAdministrator(""); setAction(""); setFrom(""); setTo("");
    void load(1, { administrator: "", action: "", from: "", to: "" });
  };

  return <main className="admin-audit-page">
    <header className="admin-audit-page-header">
      <div><a href="/admin">← 返回运营后台</a><span>安全与合规</span><h1>审计日志</h1><p>追踪管理员登录、会话、询价、导出与权限变更。时间统一按北京时间显示，IP 仅保留不可逆指纹。</p></div>
      <button type="button" onClick={() => void load(result?.page ?? 1)} disabled={loading}>{loading ? "刷新中…" : "刷新日志"}</button>
    </header>

    <section className="admin-audit-card">
      <form className="admin-audit-filters" onSubmit={submit}>
        <label><span>管理员</span><select value={administrator} onChange={(event) => setAdministrator(event.target.value)}><option value="">全部管理员</option>{result?.administrators.map((item) => <option key={item.id} value={item.id}>{item.displayName ? `${item.displayName} · ` : ""}{item.email}</option>)}</select></label>
        <label><span>动作</span><select value={action} onChange={(event) => setAction(event.target.value)}><option value="">全部动作</option>{result?.actions.map((item) => <option key={item} value={item}>{actionLabels[item] ?? item}</option>)}</select></label>
        <label><span>开始日期</span><input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)}/></label>
        <label><span>结束日期</span><input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)}/></label>
        <div><button type="submit" disabled={loading}>筛选</button><button type="button" className="secondary" onClick={reset}>重置</button></div>
      </form>

      {error && <div className="admin-audit-error" role="alert">{error}</div>}
      <div className="admin-audit-summary"><strong>{result ? `共 ${result.total} 条记录` : "正在读取…"}</strong><span>操作结果、请求编号与指纹均由服务端生成</span></div>
      <div className="admin-audit-table-wrap"><table className="admin-audit-table">
        <thead><tr><th>时间 / 操作人</th><th>动作 / 对象</th><th>结果</th><th>请求编号</th><th>IP 指纹</th><th>详情</th></tr></thead>
        <tbody>{result?.events.map((event) => <tr key={event.id}>
          <td><strong>{formatDate(event.createdAt)}</strong><span>{event.actorEmail || "系统 / 未识别"}</span></td>
          <td><strong>{actionLabels[event.action] ?? event.action}</strong><span>{event.targetType ? `${event.targetType}${event.targetId ? ` · ${event.targetId}` : ""}` : "—"}</span></td>
          <td><em className={`outcome-${event.outcome}`}>{outcomeLabels[event.outcome]}</em></td>
          <td><code title={event.requestId}>{event.requestId || "—"}</code></td>
          <td><code title={event.ipFingerprint}>{shortFingerprint(event.ipFingerprint)}</code></td>
          <td><small title={metadataText(event.metadata)}>{metadataText(event.metadata)}</small></td>
        </tr>)}</tbody>
      </table></div>
      {!loading && result && !result.events.length && <div className="admin-audit-empty">当前筛选条件下没有审计记录。</div>}
      {result && result.totalPages > 1 && <nav className="admin-pagination" aria-label="审计日志分页"><button type="button" disabled={loading || result.page <= 1} onClick={() => void load(result.page - 1)}>上一页</button><span>第 {result.page} / {result.totalPages} 页</span><button type="button" disabled={loading || result.page >= result.totalPages} onClick={() => void load(result.page + 1)}>下一页</button></nav>}
    </section>
  </main>;
}
