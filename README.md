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

## 质量检查

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @mood-record/api test:e2e
pnpm build
```

## 规划文档

- [产品需求与验收标准](.trellis/tasks/09-22-mood-weather-mvp/prd.md)
- [技术设计](.trellis/tasks/09-22-mood-weather-mvp/design.md)
- [实施计划](.trellis/tasks/09-22-mood-weather-mvp/implement.md)
- [备案与域名核验](.trellis/tasks/09-22-mood-weather-mvp/research/filing-and-domain.md)
- [Trellis 开发流程](.trellis/workflow.md)与[项目规范](.trellis/spec/)

技术栈为 uni-app / Vue 3、NestJS 和单实例 SQLite。生产构建目前会保持关闭：在微信认证与平台配置完成前，服务端不会回退到开发身份。
