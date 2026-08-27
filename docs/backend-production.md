# 中亚商机网 Vercel 上线配置

## 生产架构

- 前端与 API：Vercel（Next.js Node.js Runtime）
- 数据库：Supabase PostgreSQL，通过服务端 REST API 访问
- 管理后台：`https://你的域名/admin`
- 健康检查：`https://你的域名/api/health`
- 数据表与统计函数：在 Supabase SQL Editor 中执行一次 `migrations/0001_supabase.sql`

生产环境不会使用临时内存存储。如果 Supabase 未配置，询价与后台接口会返回 503，避免数据看似提交成功却实际丢失。

## 必须配置的生产密钥

在 Vercel 项目的 Environment Variables 中配置：

- `SUPABASE_URL`：Supabase 项目的 API URL
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase 的 `service_role` 密钥，只能配置在服务端，严禁添加 `NEXT_PUBLIC_` 前缀
- `ADMIN_USERNAME`：管理员账号
- `ADMIN_PASSWORD`：高强度管理员密码，建议至少 16 位
- `ADMIN_SESSION_SECRET`：不少于 32 字节的随机字符串
- `NEXT_PUBLIC_SITE_URL`：正式 HTTPS 域名，例如 `https://example.com`
- `NEXT_PUBLIC_COMPANY_NAME`：真实法律主体名称
- `NEXT_PUBLIC_COMPANY_REGISTRATION`：注册号或统一识别号
- `NEXT_PUBLIC_COMPANY_ADDRESS`：注册地址
- `NEXT_PUBLIC_BUSINESS_CONTACT`：商务与隐私联系方式

不要把这些值写入 Git、源码或公开环境变量文件。管理员账号不开放自助注册。

本地开发时，可将项目根目录的 `.env.example` 复制为 `.env.local` 并填写 Supabase 信息；`.env.local` 已被 Git 忽略。

本地开发在没有上述变量时可使用 `admin / change-me-now`。这个默认账号仅在开发环境生效，生产环境缺少密钥时会拒绝登录。

## 可选的新询价通知

邮件通知（Resend）：

- `RESEND_API_KEY`
- `INQUIRY_NOTIFICATION_EMAIL`
- `INQUIRY_NOTIFICATION_FROM`，例如 `中亚商机网 <inquiry@your-domain.com>`

或者配置 `INQUIRY_WEBHOOK_URL`，每条新询价会以 `inquiry.created` JSON 事件发送到你的 CRM、企业微信中转服务或自动化平台。通知失败不会造成询价数据丢失。

## 上线前验收

1. 在 Supabase SQL Editor 中执行 `migrations/0001_supabase.sql`。
2. 在 Vercel 中配置上述生产环境变量后重新部署。
3. 打开 `/api/health`，确认返回 `database: "supabase"`。
4. 打开 `/admin`，使用生产管理员账号登录。
5. 从公开网站提交一条测试询价，确认后台能看到商品、客户、来源和提交页面。
6. 修改询价状态并导出 CSV。
7. 检查自定义域名 HTTPS、DNS 和 `NEXT_PUBLIC_SITE_URL`。
8. 在公司信息页补充真实运营主体、注册地址、注册号、商务邮箱和隐私联系方式。
9. 如业务覆盖多个国家或地区，请让当地法律顾问确认隐私告知、Cookie、跨境数据和营销联系要求。
