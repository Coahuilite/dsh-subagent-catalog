# dsh-subagent-catalog

A session-header control for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web client that lists every subagent beneath the current session as one card. Running subagents come first, and each card states the model and reasoning effort that subagent actually uses alongside the durable figures the client already holds: context occupancy, heuristic context composition, decode speed, cache-hit share, cumulative tokens, active-turn duration, and step/turn counts.

## Install

```sh
dsh plugin --profile web add dsh-subagent-catalog
```

Then restart `dsh web`: the profile is composed at startup, so a new card takes effect on the next boot.

## What it does

The plugin contributes one control to the public `conversation.session.header.actions` slot. It adds no host code, no RPC, and no session-log event: every fact it shows already reaches the browser through the session list.

- **Running first** - siblings are ordered running-first, then by session id, so a refresh only moves a card when its activity actually changes.
- **One card per child** - the identity line carries a status mark and the activity badge, the badge line carries the model facts, the context line carries a bar with its reading, and a metric grid carries the measured figures.
- **Depth** - descendants are listed in pre-order with an indent step per level.

## What each card shows

| Figure | Projection | Reading |
| --- | --- | --- |
| Identity and activity | `subagent` identity plus the summary's `running` | status mark, label, running / not running badge |
| Model route | `modelSelection` | `provider/model`, reasoning effort, and a `Selected` or `Next` marker for a choice no request has used yet |
| Context occupancy | `contextPressure` | `62% · ~123.4k / 200k` beside a bar whose fill is the clamped percentage |
| Context composition | `contextBreakdown` | system / tools / messages legend, painted as the bar's own segments |
| Decode speed | `sessionStats` | `42 tok/s` |
| Cache-hit share | `tokenUsage` | `88%` |
| Cumulative tokens | `tokenUsage` | compact `1.2M` |
| Duration | `subagentTiming` | `3m 12s`, extending live while the card runs |
| Steps and turns | `sessionStats` | `14` and `3` |

## Reading rules

Every figure is a reading of durable client state, never an estimate this plugin invents:

- **Context** uses `projectedTokens ?? pressureTokens` over the newest known `contextWindow`, the same rule the composer's context meter applies. The bar clamps at 100 while the token reading still shows the real size; without a known capacity there is no scale to fill against, so the track stays hatched and only the token figure is shown.
- **Cache hit** is `cacheRead / (uncachedInput + cacheRead + cacheWrite)` over prompt-side billed input. A partial hit never rounds up to 100: the reading falls back to one decimal, then two, and a share that even two decimals cannot distinguish reads `99.99+`.
- **Speed** is `decodeTokens / decodeMs` from the whole-log stats fold, exactly the throughput the chat stats pill reports; it only counts steps that reported provider output tokens.
- **Tokens** sum the three prompt-side buckets plus output - the same aggregate the chat usage pill labels.
- **Composition** is the token meter's fixed-density heuristic, so its parts are shown with a `~` and are labelled as composition rather than as a billed total.
- **Absent data** renders as `-`, never as a zero that was never measured.

Information is separated by structure rather than colour alone: a state mark distinguishes running from idle, the identity line carries the name, badges carry the model facts, the context bar prints its reading, and every metric cell carries its label.

## Requirements

- A dsh build whose web profile exposes the `conversation.session.header.actions` slot, the shared client primitives (`@deepseek-ai/dsh-client-ui-primitives`), and the `tokenUsage`, `contextPressure`, `contextBreakdown`, `sessionStats`, and `subagentTiming` projections. A build without one of them renders that card's figure as absent instead of failing.
- The browser half resolves `react`, `react-dom`, and the primitives from the shell's module table; nothing else is required at runtime.

## Known limitations

- The control is a second entry point; it does not modify the catalog dropdown that `@deepseek-ai/dsh-client-ui-subagent` renders in the session header. That dropdown's rows are a private implementation behind a `single` slot, so an out-of-tree plugin cannot change them.
- It lists and opens subagents; it does not offer the native dropdown's tree expansion or its "open in sidebar" action.
- One-shot subagents carry no model fields in their durable descriptor, so model information depends entirely on the `modelSelection` projection and shows as unrecorded until that projection reaches the client.
- The card's figures appear once each projection reaches the session list; a cold session whose cache row lacks a projection shows that figure as absent.

## License

MIT
