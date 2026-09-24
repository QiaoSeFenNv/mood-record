# 心情晴雨表（mood-record）

一款以心情树为核心视觉的微信小程序 MVP：通过连续“心情扭矩”快速记录情绪，并用匿名、去重的今日共鸣帮助用户感受到“此刻有人和我一样”。

当前版本已连通 uni-app 小程序、NestJS API 与单实例 SQLite 数据库。身份仅用于本地开发测试；真实微信登录、正式服务域名与公开发布仍属于后续里程碑。

## 本地运行

环境要求：Node.js 22～24、pnpm 10。

```powershell
pnpm install --frozen-lockfile
Copy-Item apps/api/.env.example apps/api/.env
pnpm dev:api
```

另开一个终端构建小程序：

```powershell
pnpm dev:miniapp
```

使用微信开发者工具导入 `apps/miniapp/dist/dev/mp-weixin`。首次进入后选择“测试身份”；不同测试代码对应相互隔离的本地用户。API 默认地址为 `http://127.0.0.1:3000/v1`，需要修改时设置 `VITE_API_BASE_URL`。

也可以先在浏览器预览相同的 uni-app 页面。启动 API 后另开终端运行：

```powershell
pnpm dev:h5
```

打开 `http://127.0.0.1:5173/`。浏览器与微信小程序共用业务代码和本地测试数据库；浏览器预览不能替代后续微信开发者工具及真机验收。`.env` 中的 `JWT_SECRET` 和 `DEV_AUTH_PEPPER` 请替换为各自独立的随机值，切勿公开开发身份 API。

## 质量检查

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @mood-record/api test:e2e
pnpm build
node --test deploy/scripts/sqlite-ops.test.mjs
```

## 部署与数据保护

[单实例容器演练、SQLite 在线备份、临时恢复校验及 30 天清理说明](deploy/README.md)。部署示例仅供本地测试，监听主机回环地址；当前开发身份绝不可公开暴露。备份需存放于独立的加密受限存储，删除用户数据后不得通过恢复旧快照重新上线其数据。

正式发布仍须完成微信登录、AppID 与小程序备案、隐私协议、HTTPS `request` 域名、ICP 及公安联网备案适用性核验。现有代码在缺少微信认证时拒绝生产环境启动，不应把 Docker 或代理示例视为生产就绪。

## 规划文档

- [产品需求与验收标准](.trellis/tasks/09-22-mood-weather-mvp/prd.md)
- [技术设计](.trellis/tasks/09-22-mood-weather-mvp/design.md)
- [实施计划](.trellis/tasks/09-22-mood-weather-mvp/implement.md)
- [备案与域名核验](.trellis/tasks/09-22-mood-weather-mvp/research/filing-and-domain.md)
- [Trellis 开发流程](.trellis/workflow.md)与[项目规范](.trellis/spec/)

技术栈为 uni-app / Vue 3、NestJS 和单实例 SQLite。生产构建目前会保持关闭：在微信认证与平台配置完成前，服务端不会回退到开发身份。
