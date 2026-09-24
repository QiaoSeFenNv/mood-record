# 心情晴雨表 MVP 实施计划

## 当前进度（2026-09-23）

- 核心小程序/API/SQLite 链路已在上一提交实现。本轮补齐 17 项小程序组件与页面测试、定期幂等回执清理、SQLite 在线备份/隔离恢复演练/过期清理、单实例本地 Compose 示例和发布边界文档。
- 本轮已通过 lint、格式、类型检查、单元/集成测试、API E2E、API 构建与微信小程序构建；备份脚本 5 项测试通过。
- 原创分层位图与静态痕迹已由 09-23 小程序重设计任务补齐；视频与逐帧动效不纳入首版。仍未完成：微信开发者工具真机/手感验收、Docker 实际启动演练。当前机器无 Docker，项目也尚无 AppID；不得据此勾选最终质量门或声称可公开发布。
- 已新增 H5 浏览器预览入口，供先看效果并迭代；H5 与微信构建均已通过。浏览器测试不替代微信平台验收。

## 1. Preconditions

- 当前任务保持 planning，只有用户在最终规划摘要之后明确批准，才运行 task.py start。
- 仓库当前没有业务代码且不是 Git 仓库；开始实现前初始化 Git，确认忽略 SQLite 数据、密钥、构建产物和本地配置。
- 使用当前 Node.js LTS、pnpm workspace，并把实际版本锁定到根 package.json 的 engines 和 packageManager。
- 所有真实密钥只进入未跟踪的环境文件；仓库只提供 .env.example。

## 2. Ordered Implementation Checklist

### Phase A. Workspace and shared domain

- [ ] 初始化 pnpm workspace、根脚本、TypeScript、ESLint、Prettier 和测试配置。
- [ ] 创建 apps/miniapp、apps/api、packages/contracts、packages/domain。
- [ ] 在 domain 中实现 Torque 到 MoodBand 的唯一映射、TimeRange、共鸣公式和时区日窗口。
- [ ] 为 -100 到 100 全值、八个区间边界、共鸣边界与单调性添加单元测试。
- [ ] 在 contracts 中定义请求、响应和错误结构，并使用 Zod 在网络边界解析 unknown。

验收门：共享包可构建，核心纯函数测试全部通过，前后端不各自复制区间常量。

### Phase B. NestJS and SQLite foundation

- [ ] 创建 NestJS 应用、版本化 /v1 前缀、配置校验、统一异常过滤和 requestId。
- [ ] 集成 TypeORM better-sqlite3，创建显式迁移；启动时设置 WAL、foreign_keys 和 busy_timeout。
- [ ] 创建 users、mood_records、mutation_receipts 表及约束、外键和索引。
- [ ] 创建 repository 接口与 SQLite adapter，业务 service 不直接依赖数据库驱动。
- [ ] 使用临时 SQLite 文件测试迁移可重复执行、约束生效和重启持久性。

验收门：API 能在干净目录迁移并启动；数据库检查符合 design.md。

### Phase C. Development identity and auth boundary

- [ ] 实现 AuthProvider adapter 和当前用户上下文。
- [ ] 实现仅 development + ENABLE_DEV_AUTH=true 可用的测试会话端点。
- [ ] 使用 testUserCode 创建相互隔离的 TEST 用户，签发短期 JWT。
- [ ] 添加生产启动保护：正式环境启用开发身份或缺少正式认证配置时拒绝不安全启动/访问。
- [ ] 添加跨用户读取、删除和导出拒绝测试。

验收门：两个测试身份能稳定区分，正式配置不能走开发入口。

### Phase D. Record, idempotency, today and resonance

- [ ] 实现 POST /v1/moods、GET /v1/moods/today 和 DELETE /v1/moods/:id。
- [ ] 用 UNIQUE(user_id, client_mutation_id) 和 mutation receipt 实现幂等保存。
- [ ] 删除时将短期回执标为 REVERSED，验证迟到的重复 POST 不会复活记录。
- [ ] 实现当地自然日 UTC 窗口、COUNT DISTINCT 共鸣查询和固定估算公式。
- [ ] 实现 GET /v1/resonance，仅支持 TODAY 并拒绝未知枚举。
- [ ] 覆盖重复请求、跨日、同用户同区间多次、排除本人、删除/撤销后的聚合测试。

验收门：两个测试身份的真实 SQLite 记录能产生可审计且正确去重的今日共鸣。

### Phase E. Miniapp shell and API layer

- [ ] 初始化 uni-app Vue 3 TypeScript 项目和“今天 / 回顾 / 我的”tabBar。
- [ ] 建立平台适配层、API client、JWT 存储、Zod 响应解析和统一错误映射。
- [ ] 添加仅开发构建包含的测试身份页和醒目的“测试环境”标识。
- [ ] Pinia 只保存会话、环境和用户设置；页面请求与拖动状态保持局部。

验收门：微信开发者工具能打开三页，两个测试身份可调用真实 API。

### Phase F. Torque, tree and today experience

- [ ] 实现 MoodTorque，覆盖 -100 到 100、五段名称、跟手拖动和负向视觉重量。
- [ ] 震动由用户开关和平台能力共同决定；任何情况下不改变拖动值。
- [ ] 实现 MoodTree 的分层渲染、稳定记录种子、预览和静态降级。
- [ ] 使用 l0veyou-imagegen skill 生成天空草地、两种植物和两种动物；五类痕迹由小型图形层绘制，记录生成提示词与后处理来源。
- [ ] 实现 DayTimeline 和记录详情删除确认。
- [ ] 松手保持预览，点击确认后使用一次 clientMutationId 保存；成功后显示 5 秒 UndoBar，失败保留选值并复用幂等键重试。
- [ ] 实现 ResonanceCard 的 N=0、估算披露和测试环境状态。

验收门：在开发者工具中，10 秒内可完成记录；低动效、无震动和素材失败时仍可用。

### Phase G. Review

- [ ] 实现 weekly 和 calendar API，返回每日有效记录摘要、趋势点和事实洞察。
- [ ] 实现七天森林、日历和七天趋势组件。
- [ ] 洞察由确定性规则生成，不使用诊断、人格判断或好坏评分。
- [ ] 验证删除记录后森林、日历、趋势和洞察同步重建。

验收门：多天测试数据能生成一致回顾，无记录日期保持中性。

### Phase H. Privacy lifecycle

- [ ] 实现带 UTF-8 BOM 的 CSV 流式导出和 RFC 4180 转义/公式注入防护。
- [ ] 实现全部清除和账号注销，撤销会话并物理删除在线记录和回执。
- [ ] 单条删除、清空和注销均提供明确确认、loading、防重复提交和结果反馈。
- [ ] 增加备份隔离、每日快照、完整性检查、30 天清理和临时目录恢复验证脚本。
- [ ] 审计日志字段，确认不记录令牌、扭矩、CSV 或请求正文。

验收门：删除后在线 API 和共鸣立即不再看到数据；备份脚本行为有文档和测试。

### Phase I. Deployment and release boundary

- [ ] 添加单副本 Dockerfile/Compose 或等价部署说明，挂载本地持久数据目录。
- [ ] 添加反向代理 HTTPS 示例、health/readiness 和优雅停止。
- [ ] README 说明本地启动、微信开发者工具导入、环境变量、迁移、备份和恢复。
- [ ] 发布清单列出 AppID、小程序备案、微信登录、request 域名、ICP/HTTPS 和公安联网备案核验，不宣称已完成。
- [ ] 明确 Cloudflare 另一个项目不属于本系统拓扑。

验收门：新环境可按文档启动；单实例和正式认证限制清晰可验证。

## 3. Validation Commands

具体包名在脚手架创建后以根 package.json 为准，至少提供并执行：

    pnpm install --frozen-lockfile
    pnpm lint
    pnpm typecheck
    pnpm test
    pnpm --filter api test:e2e
    pnpm --filter api build
    pnpm --filter miniapp build:mp-weixin

附加验证：

- 对临时 SQLite 文件运行迁移、PRAGMA 检查和 integrity_check。
- 运行共鸣公式的属性测试，验证 N 非负范围内 displayCount 非递减且 K 位于 1 到 10。
- 用两个测试身份执行保存、重复保存、撤销、迟到重试、删除、导出、清空和注销。
- 人工检查微信开发者工具中的滑动手感、5 秒撤销、三页导航、低动效、跨日刷新和测试环境标识。
- 检查小程序构建产物和主包大小；超过微信平台当前限制时，优先拆分资源分包或减少帧素材。

## 4. Risky Areas and Rollback Points

- 区间和共鸣公式：只允许修改 packages/domain，任何变更必须先更新边界测试。
- 幂等与删除：mutation receipt 的 ACTIVE/REVERSED 转换是数据一致性关键点；没有集成测试不得调整。
- 时区：所有今日查询必须经过共享窗口函数，禁止 controller/repository 自行计算日期。
- SQLite：禁止把数据文件置于网络盘或启动第二个写实例；迁移前必须备份并完成 integrity_check。
- 动画素材：首版使用静态分层图与轻微预览动效；低动效模式保留静态痕迹。未来视频或逐帧资源须单独验收性能。
- 删除与注销：上线前用隔离测试库演练，禁止在开发脚本中使用宽泛路径删除文件。
- 认证：微信 adapter 未完成时正式配置保持 fail closed，不以开发身份兜底。

## 5. Cross-Layer Review Checklist

- [ ] torque、moodBand、timeRange 和错误码在 contracts/domain 中只有一个权威定义。
- [ ] API 日期为带时区的 ISO 字符串，数据库 UTC 与前端当地时间转换有往返测试。
- [ ] 当前用户只来自已验证令牌，每个 repository 查询都限定 user_id。
- [ ] 保存响应中的记录 id 驱动树、时间轴、撤销和派生查询失效。
- [ ] 删除后前端不保留乐观幽灵状态，服务端聚合也不再统计记录。
- [ ] TEST/LIVE 环境不混合统计，测试 UI 始终披露环境。
- [ ] N=0 不出现虚构人数，N>0 总是显示估算披露。
- [ ] 低动效和素材加载失败不会阻塞核心记录。

## 6. Final Quality Gate

- [ ] prd.md 的每条验收标准都有自动化测试或明确人工验收步骤。
- [ ] lint、typecheck、unit、integration、e2e 和两个应用构建全部通过。
- [ ] 没有敏感数据、SQLite 数据文件、备份或本地密钥进入版本库。
- [ ] 没有实现 PRD 明确排除的树洞、AI 陪伴、提醒、文字日记或多实例基础设施。
- [ ] 部署说明不把当前测试身份、备案状态或估算人数描述成已具备公开生产条件。
- [ ] 运行 trellis-check 完成规范、跨层、复用和测试审查后，再进入 spec 更新和提交阶段。
