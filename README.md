# Modelink Image Studio

基于 [Modelink](https://modelink.ai/) API 的 AI 图片生成与编辑工作台。**纯前端实现**（React + Vite），无后端：API Key 仅保存在浏览器 localStorage，请求由浏览器直接发往 Modelink 接口。

**在线使用**：`https://kaguya154.github.io/imageapp/`

## 功能

- 文生图 / 图片编辑（参考图 + 提示词）
- 模型（依据官方文档）：
  - OpenAI：GPT-Image-2、GPT-Image-2.5-Flare、GPT-Image-2.5-Sunburst
  - Google：Gemini-2.5-Flash-Image、Gemini-3.0-Pro-Image、Gemini-3.1-Flash-Image、Gemini-3.1-Flash-Lite-Image
  - Kling：Kling-Image-O1
- 双协议支持：OpenAI Images / Chat Completions（同步）与 FAL 队列（异步轮询）
- 拖拽 / 粘贴上传参考图，结果下载、一键复用为参考图
- 历史记录本地持久化（localStorage，上限 24 条，自动压缩存储）

## 使用

1. 在 [Modelink 控制台](https://modelink.ai/) 创建 API Key
2. 打开网站，点击右上角「配置 API Key」填入（可选：自定义 API 地址用于反向代理）
3. 选择模式与模型，输入提示词开始生成

## 开发

```bash
npm install
npm run dev     # 本地开发
npm run build   # 构建到 dist/
```

部署到 GitHub Pages 通过 `.github/workflows/deploy.yml` 自动完成（push 到 main 触发）。

## 接口说明

默认 API 地址为 `https://api.qnaigc.com`（来自 Modelink 官方文档）：

| 协议 | 端点 | 认证 |
| --- | --- | --- |
| OpenAI Images | `POST /v1/images/generations`、`POST /v1/images/edits` | `Authorization: Bearer <key>` |
| Chat Completions | `POST /v1/chat/completions`（Gemini 生图，图片位于 `message.images`） | 同上 |
| FAL 队列 | `POST /queue/.../` → `GET .../requests/{id}/status`（202 轮询）→ `GET .../requests/{id}` | 同上（也接受 `Key <key>`） |
