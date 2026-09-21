# dsh-subagent-catalog

一个用于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web 客户端的会话头控件：把当前会话下的每个子代理列成一张卡片。运行中的子代理排在最前；每张卡片除了写明该子代理实际使用的模型与推理等级，还一并列出客户端已经持有的持久数据：上下文占用、启发式上下文构成、解码速度、缓存命中占比、累计 token、活动轮次时长，以及步数/轮数。

## 安装

```sh
dsh plugin --profile web add dsh-subagent-catalog
```

然后重启 `dsh web`：profile 在启动时组装，新卡片要在下一次启动才生效。

## 它做什么

插件向公开的 `conversation.session.header.actions` 槽位贡献一个控件。它不添加宿主代码、不加 RPC、不产生会话日志事件：它展示的每一项事实都已经通过会话列表到达浏览器。

- **运行中优先** —— 同级之间先按运行中排序，再按 session id 排序；因此一次刷新只有在活动真正变化时才会让卡片移动位置。
- **每个子代理一张卡片** —— 身份行带状态标记与活动徽标，徽标行带模型信息，上下文行带进度条及其读数，指标网格带实测数值。
- **层级** —— 后代按前序（pre-order）列出，每层缩进一级。

## 每张卡片显示什么

| 指标 | 投影 | 读数 |
| --- | --- | --- |
| 身份与活动 | `subagent` 身份加上摘要里的 `running` | 状态标记、标签、running / not running 徽标 |
| 模型路由 | `modelSelection` | `provider/model`、推理等级，以及尚未被任何请求使用过的选项标记 `Selected` 或 `Next` |
| 上下文占用 | `contextPressure` | 进度条旁的 `62% · ~123.4k / 200k`，填充为截断后的百分比 |
| 上下文构成 | `contextBreakdown` | system / tools / messages 图例，作为进度条自身的分段绘制 |
| 解码速度 | `sessionStats` | `42 tok/s` |
| 缓存命中占比 | `tokenUsage` | `88%` |
| 累计 token | `tokenUsage` | 紧凑写法 `1.2M` |
| 时长 | `subagentTiming` | `3m 12s`，卡片运行期间实时增长 |
| 步数与轮数 | `sessionStats` | `14` 和 `3` |

## 读数规则

每项指标都是对客户端持久状态的读数，绝不是本插件臆造的估计：

- **上下文** 用 `projectedTokens ?? pressureTokens` 除以最新已知的 `contextWindow`，与输入框上下文仪表采用的规则相同。进度条在 100 处截断，而 token 读数仍显示真实大小；没有已知容量时便没有可填充的刻度，此时轨道保持斜线底纹，只显示 token 数字。
- **缓存命中** 是 `cacheRead / (uncachedInput + cacheRead + cacheWrite)`，作用于 prompt 侧计费输入。部分命中绝不向上取整到 100：读数先退到一位小数，再退到两位；连两位小数都区分不出的占比读作 `99.99+`。
- **速度** 是整份日志统计折叠出的 `decodeTokens / decodeMs`，与聊天统计胶囊报告的同一条吞吐完全一致；只计入报告了 provider 输出 token 的步骤。
- **Token** 把 prompt 侧的三个桶加上输出求和 —— 与聊天用量胶囊标注的口径相同。
- **构成** 采用 token 计的固定密度启发式，因此各部分带 `~` 显示，并标注为构成而非计费总量。
- **缺失数据** 渲染为 `-`，绝不渲染成从未测量过的 0。

信息依靠结构而非仅靠颜色来区分：状态标记区分运行中与空闲，身份行承载名称，徽标承载模型信息，上下文进度条打印读数，每个指标格子都带标签。

## 环境要求

- 一份 dsh 构建，其 web profile 暴露 `conversation.session.header.actions` 槽位、共享客户端原语（`@deepseek-ai/dsh-client-ui-primitives`），以及 `tokenUsage`、`contextPressure`、`contextBreakdown`、`sessionStats`、`subagentTiming` 投影。缺少其中任何一项时，该卡片对应的指标显示为缺失，而不是直接报错。
- 浏览器侧从 shell 的模块表解析 `react`、`react-dom` 和这些原语；运行时不需要其他依赖。

## 已知限制

- 本控件是第二个入口；它不修改 `@deepseek-ai/dsh-client-ui-subagent` 在会话头渲染的目录下拉列表。该下拉列表的行是 `single` 槽位背后的私有实现，树外插件无法改动。
- 它只负责列出并打开子代理；不提供原生下拉列表的树展开，也不提供「在侧边栏打开」动作。
- 一次性子代理的持久描述符里没有模型字段，所以模型信息完全依赖 `modelSelection` 投影，在该投影到达客户端之前显示为未记录。
- 卡片中的指标要等对应投影到达会话列表后才出现；冷会话的缓存行缺少某个投影时，该指标显示为缺失。

## 许可证

MIT
