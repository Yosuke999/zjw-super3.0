# 中亚商机网 · ZJW Super 3.0

面向吉尔吉斯斯坦与乌兹别克斯坦商贩的中国源头商品采购平台设计原型，围绕中吉乌铁路带来的跨境物流机会构建。

## 页面

- `/`：丝路可信（当前确定方向）
- `/v2`：现代集市（历史候选保留）
- `/v3`：铁路智联（历史候选保留）

第一版包含 6 套可切换的网页 Logo 候选、完整 VI、四语界面、商品目录、询价与物流测算交互。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 构建

```bash
npm run build
```

项目使用 Next.js 静态导出，构建结果位于 `out/`。推送到 `main` 后，GitHub Actions 会自动构建并部署 GitHub Pages。
