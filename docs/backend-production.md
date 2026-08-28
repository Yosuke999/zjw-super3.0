# 中亚商机网 Vercel 上线配置

## 生产架构

- 前端与 API：Vercel（Next.js Node.js Runtime）
- 数据库：Supabase PostgreSQL，通过服务端 REST API 访问
- 管理后台：`https://你的域名/admin`
- 健康检查：`https://你的域名/api/health`
- 数据表与统计函数：按编号顺序执行 `migrations/` 中的全部 SQL 文件

生产环境不会使用临时内存存储。如果 Supabase 未配置，询价与后台接口会返回 503，避免数据看似提交成功却实际丢失。

## 必须配置的生产密钥

在 Vercel 项目的 Environment Variables 中配置：

- `SUPABASE_URL`：Supabase 项目的 API URL
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase 的 `service_role` 密钥，只能配置在服务端，严禁添加 `NEXT_PUBLIC_` 前缀
- `ADMIN_SESSION_SECRET`：不少于 32 字节的随机字符串
- `ADMIN_SESSION_SECONDS`：管理员会话寿命，默认 28800 秒（8 小时），允许 900–86400 秒
- `IP_HASH_SECRET`：不少于 32 字节的独立随机字符串，用于不可逆限流指纹
- `NEXT_PUBLIC_SITE_URL`：正式 HTTPS 域名，例如 `https://example.com`
- `NEXT_PUBLIC_COMPANY_NAME`：真实法律主体名称
- `NEXT_PUBLIC_COMPANY_REGISTRATION`：注册号或统一识别号
- `NEXT_PUBLIC_COMPANY_ADDRESS`：注册地址
- `NEXT_PUBLIC_BUSINESS_CONTACT`：商务与隐私联系方式

不要把这些值写入 Git、源码或公开环境变量文件。管理员账号不开放自助注册。`ADMIN_USERNAME` 与 `ADMIN_PASSWORD` 只用于未连接 Supabase 的本地回退模式，不再用于生产登录。

本地开发时，可将项目根目录的 `.env.example` 复制为 `.env.local` 并填写 Supabase 信息；`.env.local` 已被 Git 忽略。

本地开发在没有 Supabase 时可使用 `admin / change-me-now`。这个默认账号仅在开发环境生效，生产环境缺少身份配置或迁移时会拒绝登录。

## 管理员身份初始化

生产管理员使用 Supabase Auth 邮箱密码、TOTP MFA、数据库角色与可撤销服务端会话。依次完成 `0004_admin_identity.sql` 与 `0004_admin_identity_audit.sql` 后，从可信的本地终端执行一次：

1. 在 Supabase Dashboard 的 Authentication → Multi-Factor Authentication 中启用 TOTP；不要仅启用电话验证码。
2. 在本地 `.env.local` 临时配置 `ADMIN_BOOTSTRAP_EMAIL`、`ADMIN_BOOTSTRAP_PASSWORD` 和 `ADMIN_BOOTSTRAP_NAME`。
3. 运行 `npm run admin:bootstrap`，创建第一个 `owner`。引导脚本拒绝静默提升已存在的 Auth 用户。
4. 立即从 `.env.local` 删除 `ADMIN_BOOTSTRAP_PASSWORD`，不要把引导密码配置到 Vercel。
5. 使用引导邮箱和密码登录 `/admin`，扫描二维码并验证六位 TOTP 动态码。
6. 再创建并验证至少一个备用 `owner`，避免唯一所有者丢失验证器后无法恢复。
7. 后续管理员统一由后台“管理员身份”区域创建；默认强制 MFA。完整日志在后台“审计日志”页面按管理员、动作和日期筛选。

角色权限：

- `owner`：管理员、角色、启停、MFA 策略、会话撤销、审计、导出与询价操作；
- `manager`：导出客户数据并处理询价；
- `operator`：查看看板并处理询价；
- `viewer`：只读看板与询价。

账号停用、角色变化、MFA 策略变化或所有者撤销会话后，现有应用会话立即失效。数据库触发器禁止停用或降级最后一个有效 `owner`。

每位管理员都可在“安全设置”中验证当前密码并修改密码；成功后该账号的所有会话会立即撤销。管理员遗失验证器时，只能由另一位 `owner` 重置 MFA，重置后下次登录必须重新绑定。Owner 也可为其他管理员设置至少 14 位的临时密码；临时密码应通过独立安全渠道传递并要求对方登录后立即自助修改。

## 可选的新询价通知

邮件通知（Resend）：

- `RESEND_API_KEY`
- `INQUIRY_NOTIFICATION_EMAIL`
- `INQUIRY_NOTIFICATION_FROM`，例如 `中亚商机网 <inquiry@your-domain.com>`

或者配置 `INQUIRY_WEBHOOK_URL`，每条新询价会以 `inquiry.created` JSON 事件发送到你的 CRM、企业微信中转服务或自动化平台。通知失败不会造成询价数据丢失。

## 上线前验收

1. 在 Supabase SQL Editor 中按文件名顺序执行 `migrations/` 中的全部 SQL 文件，当前必须执行至 `0004_admin_identity_audit.sql`。必须先迁移数据库再部署包含身份与审计系统的应用代码，否则管理员接口会因缺表而返回 503。
2. 在 Vercel 中配置上述生产环境变量后重新部署；生产环境不要配置 `ADMIN_USERNAME` 或 `ADMIN_PASSWORD`。
3. 打开 `/api/health`，确认返回 `database: "supabase"`、`schema: "identity-audit-v4"` 和 `latestMigration: "0004_admin_identity_audit"`。迁移未执行或只执行一部分时健康检查会返回 503。
4. 执行一次管理员引导，打开 `/admin`，完成邮箱密码与 TOTP MFA 登录。
5. 从公开网站提交一条测试询价，确认后台能看到商品、客户、来源和提交页面。
6. 修改询价状态并导出 CSV。
7. 检查自定义域名 HTTPS、DNS 和 `NEXT_PUBLIC_SITE_URL`。
8. 在公司信息页补充真实运营主体、注册地址、注册号、商务邮箱和隐私联系方式。
9. 如业务覆盖多个国家或地区，请让当地法律顾问确认隐私告知、Cookie、跨境数据和营销联系要求。

## 数据保留与审计

- `request_limits` 会在限流 RPC 执行时自动删除 24 小时前的记录。
- `cleanup_backend_data()` 默认删除 400 天前的匿名分析事件和 24 小时前的限流记录。建议在 Supabase Cron 中每天执行一次：`select * from public.cleanup_backend_data();`。
- `cleanup_admin_sessions()` 默认删除过期或已撤销超过 30 天的管理员会话。建议在 Supabase Cron 中每天执行一次：`select public.cleanup_admin_sessions();`。
- `admin_audit_logs` 是仅追加日志，记录登录成功/失败、退出与会话撤销、询价状态修改、CSV 导出以及管理员创建、停用、角色调整。每条日志包含操作人、北京时间、服务端请求编号、结果和不可逆 IP 指纹；不保存完整 IP 地址，也不允许修改或删除历史记录。
- 审计日志仅对 `owner` 开放，可在 `/admin/audit` 按管理员、动作、开始日期和结束日期筛选。
- 询价属于业务记录，不会被自动删除；应根据公司合同、税务和隐私政策另行确定保留期限。
- 管理员修改询价状态后，变更前后状态、管理员账号和时间会写入 `inquiry_status_history`。
- 登录成功/失败、MFA 验证与重置、退出、改密、看板访问、客户数据导出、询价状态修改、管理员创建/修改和会话撤销会写入 `admin_audit_logs`。

## 生产监控

API 错误日志采用单行 JSON，包含事件名、请求编号和时间。建议为 Vercel 配置日志汇聚与告警，并至少监控：

- `/api/health` 连续返回 503；
- `inquiry.create`、`notification delivery failed` 和 `admin.login` 异常增长；
- Supabase 数据库容量、API 延迟和连接数；
- 每日询价数量异常归零或突然激增。
