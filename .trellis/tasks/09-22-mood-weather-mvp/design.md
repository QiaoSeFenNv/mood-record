# 心情晴雨表 MVP 技术设计

## 1. Architecture

采用 pnpm workspace 单仓库，保持前端、后端和契约分离：

    apps/
      miniapp/        uni-app + Vue 3 + TypeScript 微信小程序
      api/            Node.js + NestJS + TypeScript REST API
    packages/
      contracts/      跨端枚举、请求响应模型、Zod 运行时校验
      domain/         心情区间、共鸣公式、时间窗口等纯函数
    assets/
      mood-tree/      原创分层插画、帧序列和来源清单
    deploy/
      docker/         单实例 API、持久卷和反向代理示例
      scripts/        备份、恢复验证和过期备份清理

前端只通过版本化 API 访问数据，不直接了解数据库结构。packages/domain 不依赖 Vue、NestJS 或数据库，保证心情区间和共鸣公式只有一个实现。packages/contracts 负责跨层数据形状和入口校验，禁止前后端分别手写同名但不同含义的枚举。

## 2. Runtime Topology

MVP 运行形态固定为：

    微信小程序
        |
        | HTTPS JSON / CSV
        v
    反向代理
        |
        v
    单个 NestJS API 实例
        |
        v
    服务器本地持久磁盘上的 SQLite

SQLite 使用 better-sqlite3 驱动和 TypeORM repository adapter，启用 WAL、foreign_keys、busy_timeout。数据库文件不得位于 NFS、SMB 等网络共享盘，不部署多个同时写入同一文件的 API 实例。

选择 TypeORM 是为了利用 NestJS 集成、显式迁移和 repository 边界；业务服务不得直接拼接散落 SQL。必要的去重聚合可在 repository 中使用参数化查询实现，并由集成测试固定行为。

## 3. Main Data Flow

### 3.1 Record and resonance

    用户拖动扭矩
        |
        +-- move: 仅更新组件本地预览，不请求 API
        |
        +-- release
              |
              v
        生成 clientMutationId
              |
              v
        POST /v1/moods
              |
              +-- 校验身份、扭矩、时区偏移和幂等键
              +-- 事务写入 mood_records 与 mutation_receipts
              +-- 查询当地今日同区间去重用户，排除本人
              +-- 计算披露后的估算值
              |
              v
        返回记录 + resonance + serverTime
              |
              +-- 更新树和时间轴
              +-- 显示共鸣
              +-- 展示 5 秒撤销条

5 秒是客户端“无确认快速撤销”入口的可见时间。撤销和之后的确认删除最终都调用同一个受权删除能力，因此不会出现客户端还能点击而服务端因网络延迟拒绝的时钟竞争。5 秒结束后 UI 不再显示“撤销”，但用户仍能进入记录详情确认删除。

### 3.2 Delete and rebuild

    DELETE /v1/moods/:id
        |
        +-- 验证记录属于当前用户
        +-- 事务删除 mood_records
        +-- 将短期幂等回执标为 REVERSED
        |
        v
    前端失效 today / review / resonance 查询
        |
        v
    由剩余有效记录重建树、时间轴和洞察

mutation_receipts 只保存幂等键、资源标识、状态和过期时间，不保存扭矩或心情内容；最多保留 24 小时，用于阻止删除后到达的重复 POST 把记录重新创建。账号注销时一并删除。

## 4. Domain Model

### 4.1 Shared enums

- MoodBand: VERY_LOW, LOW, CALM, HAPPY, VERY_HAPPY。
- TimeRange: 首版仅 TODAY；未知值返回 400。
- AuthProvider: DEV, WECHAT。
- DataEnvironment: TEST, LIVE。
- MutationState: ACTIVE, REVERSED。

### 4.2 Torque mapping

唯一映射函数接收整数 -100 到 100：

- -100 到 -61：VERY_LOW。
- -60 到 -21：LOW。
- -20 到 20：CALM。
- 21 到 60：HAPPY。
- 61 到 100：VERY_HAPPY。

前端预览、API 入参校验、存储值、趋势和共鸣聚合都依赖同一 domain package，不复制边界常量。

### 4.3 Resonance calculation

基础人数 N 由数据库执行 COUNT DISTINCT user_id 得到，过滤条件为：

- occurred_at_utc 位于请求者当前当地自然日换算出的 UTC 半开区间内。
- mood_band 等于目标区间。
- user_id 不等于当前用户。
- 仅统计与请求者相同的 data_environment（TEST 或 LIVE），不混合测试与真实用户。

展示计算为：

- N 为 0：displayCount 为 null，不生成“有人”文案。
- 1 到 10：K 为 10。
- 11 到 999：K 为 sqrt(1000 / N)。
- 1000 及以上：K 为 1。
- displayCount 为 Math.round(N * K)。

响应同时包含 baseCount、coefficient、displayCount、range、windowStartUtc、windowEndUtc 和 estimated=true，便于测试和审计。公开 UI 可隐藏 baseCount，但测试和受保护接口契约保留该字段。

## 5. Persistence Model

### 5.1 users

- id: UUID 文本主键。
- auth_provider: DEV 或 WECHAT。
- provider_subject_hash: 提供方标识的不可逆摘要，唯一。
- data_environment: TEST 或 LIVE。
- created_at_utc。

测试用户和未来真实用户通过 data_environment 隔离。正式环境启动时如果 ENABLE_DEV_AUTH 为 true，应用直接拒绝启动。

### 5.2 mood_records

- id: UUID 文本主键。
- user_id: 外键。
- torque: 整数，数据库 CHECK 限制 -100 到 100。
- mood_band: 枚举文本，数据库 CHECK 限制五种值。
- occurred_at_utc: 服务端接收并确认保存的 UTC 时间。
- timezone_offset_minutes: 提交时设备偏移，范围 -840 到 840。
- client_mutation_id: 客户端生成的 UUID。
- created_at_utc。

约束和索引：

- UNIQUE(user_id, client_mutation_id) 防止重复保存。
- INDEX(user_id, occurred_at_utc) 支持个人时间轴和导出。
- INDEX(mood_band, occurred_at_utc, user_id) 支持今日共鸣去重。

不提供 UPDATE 心情记录的 API。单条删除、清空和注销对 mood_records 使用物理删除。

### 5.3 mutation_receipts

- user_id。
- client_mutation_id。
- record_id，删除记录后允许置空并保留 REVERSED 回执直到过期。
- state。
- expires_at_utc。

该表不存储心情值。后台清理任务删除超过 24 小时的回执。

## 6. API Contract

统一前缀为 /v1。错误响应结构为 code、message、requestId、details；message 可安全展示，details 仅包含字段级校验信息，不包含敏感数据。

### 6.1 Authentication

- POST /v1/auth/dev/session：只在 development 且 ENABLE_DEV_AUTH=true 时存在，输入固定格式 testUserCode，返回短期 JWT。
- 后续微信实现通过 AuthProvider adapter 接入，不改变受保护业务接口。
- 业务接口只从已验证令牌取得当前用户，拒绝请求体或查询参数传入 userId。

### 6.2 Mood and today

- POST /v1/moods：输入 torque、timezoneOffsetMinutes、clientMutationId；返回 record、resonance、serverTime。
- GET /v1/moods/today：输入 timezoneOffsetMinutes；返回当天有效记录，按 occurredAt 升序。
- DELETE /v1/moods/:id：仅记录所有者可调用；重复删除返回幂等成功语义。
- GET /v1/resonance：输入 moodBand、range=TODAY、timezoneOffsetMinutes。

### 6.3 Review

- GET /v1/review/weekly：输入 timezoneOffsetMinutes 和可选 anchorDate；返回七天每日记录摘要、趋势点和事实型洞察。
- GET /v1/review/calendar：输入 year、month、timezoneOffsetMinutes；返回有记录日期及每日区间分布。

### 6.4 Privacy

- GET /v1/me/export.csv：返回带 UTF-8 BOM 的 CSV 附件。
- DELETE /v1/me/moods：确认后清空当前用户全部记录与相关回执。
- DELETE /v1/me：撤销令牌后删除记录、回执和用户身份关联。

CSV 列固定为 occurred_at_local、timezone_offset、torque、mood_name；字段按 RFC 4180 转义，任何以 =、+、-、@ 开头的文本字段都进行表格公式注入防护。

## 7. Frontend Design

### 7.1 Pages

- pages/today：当天树、时间轴、扭矩、保存反馈和共鸣。
- pages/review：七天森林、日历、趋势和事实洞察。
- pages/me：匿名说明、震动与低动效设置、导出和删除操作。
- pages/dev-login：仅开发构建包含，用于切换明确标识的测试用户。

### 7.2 Components

- MoodTorque：高频手势和预览值只保存在组件本地 ref；松手只发出一次 commit 事件。
- MoodTree：输入有效记录数组和 previewTorque；通过稳定的 record id 哈希决定痕迹位置，确保刷新后布局一致。
- DayTimeline：输入按时间排序的记录，不重新实现区间映射。
- ResonanceCard：区分 N=0 空状态和 estimatedCount 文案。
- UndoBar：收到保存成功结果后运行 5 秒倒计时；页面隐藏或组件卸载时清理计时器。

Pinia 只保存认证会话、环境标识和用户设置；拖动帧、粒子状态和页面请求状态不进入全局 store。API 数据由页面级 composable 管理，保存或删除后按依赖关系失效并重新读取。

### 7.3 Tree rendering

- 一棵中性基础树作为底层。
- 五类透明效果层按记录稳定排序叠加。
- 同一区间记录过多时，不创建无限 DOM 节点；每条记录仍参与稳定种子和密度计算，由固定数量的渲染槽合成效果，时间轴继续保留全部记录。
- 每类关键动画 6 到 8 帧；呼吸、光晕和粒子采用 CSS 或 Canvas 驱动。
- 低动效模式关闭帧循环、粒子漂移和震动，仅显示对应静态关键帧。
- 素材清单记录提示词摘要、生成日期、后处理说明和文件哈希。实际生成在实施阶段按 imagegen skill 执行并进行透明边缘与尺寸检查。

## 8. Time and Date Rules

- 服务端使用 UTC 保存 occurred_at_utc，不信任客户端提供可回填的发生时间。
- 客户端提交当前 timezoneOffsetMinutes；服务端验证范围并据此计算请求者的当地自然日 UTC 边界。
- 今日查询使用半开区间 start <= occurred_at_utc < end，避免午夜重复。
- 每条记录保留提交时偏移，CSV 用该偏移还原当时当地时间。
- 用户跨时区后，“今天”以当前请求偏移为准；历史记录本身的显示仍使用记录时保存的偏移。

## 9. Security and Privacy

- 所有非开发访问使用 HTTPS；令牌只存储在小程序安全存储中，不写入日志。
- API 启用请求体大小限制、DTO 校验、速率限制和统一异常过滤器。
- 日志记录 requestId、路由、状态码、耗时和匿名用户哈希；不记录 JWT、原始 provider subject、扭矩值、CSV 内容或请求正文。
- 所有个人查询和删除在 repository 条件中同时限定当前 user_id，避免仅靠前端隐藏。
- 正式环境缺少微信认证配置时，认证功能不可用；绝不回退到开发身份。

## 10. SQLite Operations

启动检查：

- journal_mode=WAL。
- foreign_keys=ON。
- busy_timeout=5000。
- schema migration 版本与应用兼容。
- 数据目录存在、可写且不位于临时目录。

部署固定单副本。每日使用 SQLite 在线备份能力生成隔离快照，再进行完整性检查；生产备份应放在加密存储，最多保留 30 天。在线业务永不读取备份。恢复演练在临时目录进行，不覆盖在线数据库。

## 11. Compatibility and Migration

- repository 接口屏蔽 TypeORM/SQLite 细节，业务服务不依赖 SQLite 专有返回格式。
- 主键使用 UUID、时间使用 UTC ISO/Date、枚举使用显式字符串，降低迁往 MySQL/PostgreSQL 的成本。
- 不使用 Redis 双写。出现经测量的锁等待、写吞吐或多实例需求后，再通过一次性迁移导出、校验行数与校验和、切换连接、保留只读旧库的流程迁移。
- TimeRange 枚举允许以后新增 LAST_7_DAYS 等值；首版未知值必须拒绝，不能静默回退为 TODAY。

## 12. Failure Handling

- POST 超时：客户端使用同一 clientMutationId 重试。
- 保存失败：保留当前选值并显示“尚未保存”，不更新正式树或共鸣。
- 删除失败：恢复界面中的记录或重新拉取服务端状态。
- SQLite busy：在 busy_timeout 后返回可重试错误，不吞掉失败。
- 日期跨越午夜：页面回到前台时重新取得服务端时间和今日数据。
- 素材加载失败：回退到五段静态关键帧和文字名称。

## 13. Validation Strategy

- domain 单元测试：区间全部边界、共鸣公式边界与单调性、当地日 UTC 窗口。
- API 集成测试：临时 SQLite 文件、迁移、外键、WAL、幂等保存、删除后迟到重试、用户隔离、跨日和 CSV 注入防护。
- API 端到端测试：两个测试身份完成保存、共鸣、撤销、导出、清空和注销。
- 前端单元与组件测试：拖动全范围、松手单次提交、5 秒 UndoBar、失败重试、低动效与 N=0 文案。
- 构建检查：TypeScript、lint、测试、NestJS build、uni-app mp-weixin build。
- 人工验收：微信开发者工具中的三页导航、滑动手感、树的分层效果、时间轴和测试环境标识。

## 14. Rollout and Rollback

- 本地阶段只使用 TEST 环境数据库和测试身份。
- 部署前先执行迁移 dry run 和备份完整性检查，再启动单实例容器。
- 应用回滚前确认旧版本能够读取当前 schema；破坏性迁移拆成“先扩展、后清理”两次发布。
- 新动画素材出现性能或兼容问题时，可通过配置切换到静态关键帧，不回滚用户数据。
- 真实微信认证和公开发布作为独立后续里程碑，不与当前开发身份混用。
