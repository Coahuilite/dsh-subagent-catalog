/**
 * Pure derivation of the header control's cards from the client session list.
 *
 * Every fact comes from data the client already holds: a summary carries the
 * durable subagent identity and model selection plus the token-usage, context
 * pressure, context composition, whole-log stats, and active-turn timing
 * projections, so this plugin needs no host change, no new RPC, and no session
 * it has not been handed.
 *
 * Projection values cross a JSON boundary, so every read narrows the raw value
 * field by field: a shape this code does not recognize is reported as not
 * recorded rather than rendered as a number that was never measured.
 *
 * @module dsh-subagent-catalog/rows
 */

import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ModelSelectionProjection } from '@deepseek-ai/dsh-api-session-controller/types'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** Translate seat bound to this plugin's dictionary. */
type Translate = TranslateNS<'subagent-catalog'>

/** One child's model route together with how the client learned it. */
export interface SubagentRowModel {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
  /**
   * 'used' when a recorded request already used this route; 'selected' or
   * 'next' when it is a choice the session has not requested with yet, so a row
   * never describes a pending choice as something that already happened.
   */
  readonly state: 'used' | 'selected' | 'next'
}

/** The four disjoint provider usage buckets accumulated over a child's log. */
export interface TokenUsageValue {
  readonly uncachedInputTokens: number
  readonly outputTokens: number
  readonly cacheReadTokens: number
  readonly cacheWriteTokens: number
}

/**
 * Approximate context occupancy: the provider-anchored prompt size of the most
 * recent request plus a heuristic repricing of the surface movement since, and
 * the newest route capacity. The fields are last-wins records of different
 * moments and deliberately not one atomic request observation.
 */
export interface ContextPressureValue {
  readonly pressureTokens?: number
  readonly projectedTokens?: number
  readonly contextWindow?: number
}

/** Heuristic system/tools/message composition of the next request. */
export interface ContextBreakdownValue {
  readonly systemTokens: number
  readonly toolsTokens: number
  readonly messageTokens: number
}

/** Whole-log turn/step counts and wall times of one child. */
export interface SessionStatsValue {
  readonly turns: number
  readonly steps: number
  readonly llmMs: number
  readonly toolMs: number
  readonly ttftMs: number
  readonly ttftSteps: number
  readonly decodeMs: number
  readonly decodeTokens: number
}

/** Durable active-turn timing of one descriptor-backed child. */
export interface SubagentTimingValue {
  /** Milliseconds accumulated across completed turns after the child's own descriptor. */
  readonly settledMs: number
  /** Same-cut bounds of the currently open turn, when one has not reached turn/end. */
  readonly active?: { readonly since: number; readonly through: number }
}

/** One subagent card the header control can open. */
export interface SubagentRow {
  readonly id: SessionId
  readonly parentId: SessionId
  /** 1 for a direct child, 2 for a grandchild, and so on. */
  readonly depth: number
  readonly label: string
  readonly mode: 'one-shot' | 'continuable'
  readonly running: boolean
  readonly model?: SubagentRowModel
  readonly usage?: TokenUsageValue
  readonly context?: ContextPressureValue
  readonly breakdown?: ContextBreakdownValue
  readonly stats?: SessionStatsValue
  readonly timing?: SubagentTimingValue
}

/** One route plus its optional effort, as both the projection and a row spell it. */
interface Route {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
}

/** How deep the walk descends; a cycle guard, not a product limit. */
const MAX_DEPTH = 8

/** Whether a value is a usable non-negative token count or timestamp. */
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Read one raw projection value off a summary without assuming its shape. */
function projectionOf(summary: SessionSummary, key: string): unknown {
  const values: unknown = summary.projectionValues
  return typeof values === 'object' && values !== null
    ? (values as Record<string, unknown>)[key]
    : undefined
}

/** Narrow a raw value to a record, or undefined for anything else. */
function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined
}

/** Narrow one raw token-usage projection. */
function tokenUsageOf(value: unknown): TokenUsageValue | undefined {
  const record = recordOf(value)
  if (record === undefined) return undefined
  const { uncachedInputTokens, outputTokens, cacheReadTokens, cacheWriteTokens } = record
  return isCount(uncachedInputTokens) && isCount(outputTokens)
    && isCount(cacheReadTokens) && isCount(cacheWriteTokens)
    ? { uncachedInputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }
    : undefined
}

/** Narrow one raw context-pressure projection; either optional field may be absent. */
function contextPressureOf(value: unknown): ContextPressureValue | undefined {
  const record = recordOf(value)
  if (record === undefined) return undefined
  const pressureTokens = record.pressureTokens
  const projectedTokens = record.projectedTokens
  const contextWindow = record.contextWindow
  if (pressureTokens !== undefined && !isCount(pressureTokens)) return undefined
  if (projectedTokens !== undefined && !isCount(projectedTokens)) return undefined
  if (contextWindow !== undefined && !isCount(contextWindow)) return undefined
  return {
    ...pressureTokens === undefined ? {} : { pressureTokens },
    ...projectedTokens === undefined ? {} : { projectedTokens },
    ...contextWindow === undefined ? {} : { contextWindow },
  }
}

/** Narrow one raw context-breakdown projection. */
function contextBreakdownOf(value: unknown): ContextBreakdownValue | undefined {
  const record = recordOf(value)
  if (record === undefined) return undefined
  const { systemTokens, toolsTokens, messageTokens } = record
  return isCount(systemTokens) && isCount(toolsTokens) && isCount(messageTokens)
    ? { systemTokens, toolsTokens, messageTokens }
    : undefined
}

/** Narrow one raw whole-log stats projection. */
function sessionStatsOf(value: unknown): SessionStatsValue | undefined {
  const record = recordOf(value)
  if (record === undefined) return undefined
  const fields = [
    'turns', 'steps', 'llmMs', 'toolMs', 'ttftMs', 'ttftSteps', 'decodeMs', 'decodeTokens',
  ] as const
  const missing = fields.some(field => !isCount(record[field]))
  if (missing) return undefined
  return {
    turns: record.turns as number,
    steps: record.steps as number,
    llmMs: record.llmMs as number,
    toolMs: record.toolMs as number,
    ttftMs: record.ttftMs as number,
    ttftSteps: record.ttftSteps as number,
    decodeMs: record.decodeMs as number,
    decodeTokens: record.decodeTokens as number,
  }
}

/** Narrow one raw active-turn timing projection. */
function subagentTimingOf(value: unknown): SubagentTimingValue | undefined {
  const record = recordOf(value)
  if (record === undefined || !isCount(record.settledMs)) return undefined
  const active = recordOf(record.active)
  if (active === undefined) return { settledMs: record.settledMs }
  return isCount(active.since) && isCount(active.through)
    ? { settledMs: record.settledMs, active: { since: active.since, through: active.through } }
    : undefined
}

/** Whether two routes name the same model and effort. */
function sameRoute(left: Route, right: Route): boolean {
  return left.provider === right.provider
    && left.model === right.model
    && left.reasoningEffort === right.reasoningEffort
}

/**
 * Read one session summary's durable model selection.
 * @param summary - the child's client summary.
 * @returns the route the card should show plus its state, or undefined without a record.
 */
function modelOf(summary: SessionSummary): SubagentRowModel | undefined {
  const selection: ModelSelectionProjection | undefined = summary.projectionValues?.modelSelection
  const lastUsed = selection?.lastUsed ?? null
  const next = selection?.next ?? null
  const shown = next ?? lastUsed
  if (shown === null) return undefined
  const route = {
    provider: shown.provider,
    model: shown.model,
    ...(shown.reasoningEffort === undefined ? {} : { reasoningEffort: shown.reasoningEffort }),
  }
  // A pending choice the session has not requested with yet still names the next
  // route, so it is worth showing - labelled.
  if (next === null) return { ...route, state: 'used' }
  if (lastUsed === null) return { ...route, state: 'selected' }
  return { ...route, state: sameRoute(lastUsed, next) ? 'used' : 'next' }
}

/**
 * Index every subagent summary by its direct parent.
 * @param summaries - the client session list.
 * @returns children keyed by parent id.
 */
function indexChildren(
  summaries: Readonly<Record<SessionId, SessionSummary>>,
): ReadonlyMap<SessionId, readonly SessionSummary[]> {
  const children = new Map<SessionId, SessionSummary[]>()
  for (const summary of Object.values(summaries)) {
    if (summary.origin !== 'subagent' || summary.parentId === undefined) continue
    const bucket = children.get(summary.parentId)
    if (bucket === undefined) children.set(summary.parentId, [summary])
    else bucket.push(summary)
  }
  return children
}

/**
 * Order one sibling group: running first, then by session id. The id tiebreak
 * keeps the order identical between refreshes, so only an activity change moves
 * a card.
 * @param summaries - one parent's children.
 * @returns the siblings in display order.
 */
function orderSiblings(summaries: readonly SessionSummary[]): readonly SessionSummary[] {
  return [...summaries].sort((left, right) => {
    if (left.running !== right.running) return left.running ? -1 : 1
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  })
}

/**
 * Collect every subagent beneath one session as a pre-order walk: a parent is
 * always followed by its own children, and each sibling group is ordered
 * running-first. Depth therefore tracks a card's nesting exactly.
 * @param summaries - the client session list.
 * @param rootSessionId - the session whose header hosts the control.
 * @returns the descendant cards in display order, each with the projection values it can read.
 */
export function buildSubagentRows(
  summaries: Readonly<Record<SessionId, SessionSummary>>,
  rootSessionId: SessionId,
): readonly SubagentRow[] {
  const children = indexChildren(summaries)
  const rows: SubagentRow[] = []
  const seen = new Set<SessionId>([rootSessionId])
  const visit = (parentId: SessionId, depth: number): void => {
    if (depth > MAX_DEPTH) return
    for (const summary of orderSiblings(children.get(parentId) ?? [])) {
      if (seen.has(summary.id)) continue
      seen.add(summary.id)
      const identity = summary.projectionValues?.subagent ?? undefined
      const model = modelOf(summary)
      const usage = tokenUsageOf(projectionOf(summary, 'tokenUsage'))
      const context = contextPressureOf(projectionOf(summary, 'contextPressure'))
      const breakdown = contextBreakdownOf(projectionOf(summary, 'contextBreakdown'))
      const stats = sessionStatsOf(projectionOf(summary, 'sessionStats'))
      const timing = subagentTimingOf(projectionOf(summary, 'subagentTiming'))
      rows.push({
        id: summary.id,
        parentId,
        depth,
        label: identity?.label ?? summary.displayTitle,
        mode: identity?.mode ?? 'one-shot',
        running: summary.running,
        ...(model === undefined ? {} : { model }),
        ...(usage === undefined ? {} : { usage }),
        ...(context === undefined ? {} : { context }),
        ...(breakdown === undefined ? {} : { breakdown }),
        ...(stats === undefined ? {} : { stats }),
        ...(timing === undefined ? {} : { timing }),
      })
      visit(summary.id, depth + 1)
    }
  }
  visit(rootSessionId, 1)
  return rows
}

/** One card's model information, split so each part renders as its own badge. */
export interface RowModelParts {
  /** False when the client holds no usable selection; the other fields are then unset. */
  readonly known: boolean
  /** Localized Selected / Next marker, present only for a choice not yet requested with. */
  readonly pending?: string
  /** Localized model route, present when known. */
  readonly model?: string
  /** Localized reasoning effort, present when known. */
  readonly reasoning?: string
}

/**
 * Split one card's model information into separately renderable parts.
 * @param row - the card to describe.
 * @param t - translate function bound to this plugin's dictionary.
 * @returns the parts; known: false carries no model text.
 */
export function rowModelParts(row: SubagentRow, t: Translate): RowModelParts {
  const model = row.model
  if (model === undefined) return { known: false }
  return {
    known: true,
    ...(model.state === 'used'
      ? {}
      : { pending: t(model.state === 'selected' ? 'selection.selected' : 'selection.next') }),
    model: t('model.value', { route: model.provider + '/' + model.model }),
    reasoning: model.reasoningEffort === undefined
      ? t('reasoning.default')
      : t('reasoning.value', { effort: model.reasoningEffort }),
  }
}

/** One card's context-occupancy reading. */
export interface RowContext {
  /** Prompt-side tokens the next request is expected to cost. */
  readonly usedTokens: number
  /** Newest recorded route capacity; absent when no adapter advertised one. */
  readonly contextWindow?: number
  /** 0..100 while the capacity is known. A bar cannot overflow, so an overrun clamps here while the token reading still shows the real size. */
  readonly percent?: number
}

/**
 * Resolve one card's bounded context occupancy.
 * @param row - the card to read.
 * @returns occupancy, or undefined until a pressure sample is known.
 */
export function rowContext(row: SubagentRow): RowContext | undefined {
  const pressure = row.context
  if (pressure === undefined) return undefined
  const usedTokens = pressure.projectedTokens ?? pressure.pressureTokens
  if (usedTokens === undefined) return undefined
  const contextWindow = pressure.contextWindow
  return contextWindow === undefined
    ? { usedTokens }
    : { usedTokens, contextWindow, percent: Math.min(100, Math.round(usedTokens / contextWindow * 100)) }
}

/** One card's cache-hit reading over prompt-side billed input. */
export interface RowCache {
  readonly readTokens: number
  readonly promptTokens: number
  /** Display text in percent units, never rounding a partial hit up to 100. */
  readonly percent: string
}

/**
 * Display-ready cache-hit share, in percent units.
 *
 * A partial hit never rounds up to 100: when the integer would, one more
 * decimal is added, then two, and a share that even two decimals cannot
 * distinguish from a full hit reads as 99.99+ instead of claiming a full hit
 * the tokens do not support.
 * @param cacheReadTokens - prompt tokens served from cache.
 * @param promptTokens - billed prompt tokens (uncached + cache read + cache write).
 * @returns percent text, or undefined when nothing was billed.
 */
export function cachePercentText(cacheReadTokens: number, promptTokens: number): string | undefined {
  if (promptTokens <= 0) return undefined
  if (cacheReadTokens >= promptTokens) return '100'
  const ratio = cacheReadTokens / promptTokens * 100
  const whole = String(Math.round(ratio))
  if (whole !== '100') return whole
  const oneDecimal = ratio.toFixed(1)
  if (oneDecimal !== '100.0') return oneDecimal
  const twoDecimals = ratio.toFixed(2)
  return twoDecimals === '100.00' ? '99.99+' : twoDecimals
}

/**
 * Read one card's cache-hit share.
 * @param row - the card to read.
 * @returns the share plus its token basis, or undefined without billed input.
 */
export function rowCache(row: SubagentRow): RowCache | undefined {
  const usage = row.usage
  if (usage === undefined) return undefined
  const promptTokens = usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
  const percent = cachePercentText(usage.cacheReadTokens, promptTokens)
  return percent === undefined ? undefined : { readTokens: usage.cacheReadTokens, promptTokens, percent }
}

/**
 * Read one card's cumulative token total: both prompt-side and output buckets.
 * @param row - the card to read.
 * @returns the total, or undefined without a usage record.
 */
export function rowTotalTokens(row: SubagentRow): number | undefined {
  const usage = row.usage
  return usage === undefined
    ? undefined
    : usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens + usage.outputTokens
}

/**
 * Read one card's decode throughput over steps that reported output tokens.
 * @param row - the card to read.
 * @returns tokens per second, or undefined without a timed, reported decode.
 */
export function rowSpeed(row: SubagentRow): number | undefined {
  const stats = row.stats
  if (stats === undefined || stats.decodeMs <= 0) return undefined
  return stats.decodeTokens / (stats.decodeMs / 1_000)
}

/**
 * Read one card's active-turn duration, open turn included.
 * @param row - the card to read.
 * @param now - current wall-clock time used to extend a running card's open turn.
 * @returns milliseconds, or undefined without a timing record.
 */
export function rowDurationMs(row: SubagentRow, now: number): number | undefined {
  const timing = row.timing
  if (timing === undefined) return undefined
  if (timing.active === undefined) return timing.settledMs
  const end = row.running ? now : timing.active.through
  return timing.settledMs + Math.max(0, end - timing.active.since)
}

/** Zero-pad one duration unit to two digits. */
function pad2(value: number): string {
  return value < 10 ? '0' + String(value) : String(value)
}

/**
 * Format a whole-second duration with decreasing precision at larger scales.
 * @param ms - duration in milliseconds.
 * @param t - translate function bound to this plugin's dictionary.
 * @returns the localized compact duration.
 */
export function formatDurationMs(ms: number, t: Translate): string {
  const total = Math.max(0, Math.floor(ms / 1_000))
  const hours = Math.floor(total / 3_600)
  const minutes = Math.floor(total / 60) % 60
  const seconds = total % 60
  if (hours >= 24) {
    return t('duration.days', { days: String(Math.floor(hours / 24)), hours: pad2(hours % 24) })
  }
  if (hours > 0) {
    return t('duration.hours', { hours: String(hours), minutes: pad2(minutes), seconds: pad2(seconds) })
  }
  // Only the smaller units inside a larger reading are padded; a lone seconds
  // reading stays unpadded, exactly as the chat transcript's duration reads.
  return minutes > 0
    ? t('duration.minutes', { minutes: String(minutes), seconds: pad2(seconds) })
    : t('duration.seconds', { seconds: String(seconds) })
}

/**
 * Format a token count compactly: 517 / 12.2k / 517k / 1.2M.
 * @param value - non-negative token count.
 * @param t - translate function bound to this plugin's dictionary.
 * @returns the compact localized count.
 */
export function formatTokenCount(value: number, t: Translate): string {
  const scaled = (candidate: number): string => candidate >= 100
    ? String(Math.round(candidate))
    : String(Math.round(candidate * 10) / 10)
  if (value < 1_000) return String(Math.round(value))
  if (value < 1_000_000) return t('tokens.thousand', { value: scaled(value / 1_000) })
  return t('tokens.million', { value: scaled(value / 1_000_000) })
}

/**
 * Format a decode throughput: whole tokens from ten up, one decimal below.
 * @param value - tokens per second.
 * @param t - translate function bound to this plugin's dictionary.
 * @returns the localized speed reading.
 */
export function formatSpeed(value: number, t: Translate): string {
  const clamped = Math.max(0, value)
  return t('speed.value', {
    value: clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10),
  })
}

/** One metric cell on a card. */
export interface RowMetric {
  readonly key: 'speed' | 'cache' | 'total' | 'duration' | 'steps' | 'turns'
  readonly label: string
  readonly value: string
}

/**
 * Build one card's metric grid, in display order.
 * @param row - the card to read.
 * @param t - translate function bound to this plugin's dictionary.
 * @param now - current wall-clock time used to extend a running card's duration.
 * @returns six cells; an unmeasured figure carries the absent marker.
 */
export function rowMetrics(row: SubagentRow, t: Translate, now: number): readonly RowMetric[] {
  const speed = rowSpeed(row)
  const cache = rowCache(row)
  const total = rowTotalTokens(row)
  const duration = rowDurationMs(row, now)
  const stats = row.stats
  const absent = t('value.absent')
  return [
    { key: 'speed', label: t('metric.speed'), value: speed === undefined ? absent : formatSpeed(speed, t) },
    {
      key: 'cache',
      label: t('metric.cache'),
      value: cache === undefined ? absent : t('cache.value', { percent: cache.percent }),
    },
    { key: 'total', label: t('metric.total'), value: total === undefined ? absent : formatTokenCount(total, t) },
    {
      key: 'duration',
      label: t('metric.duration'),
      value: duration === undefined ? absent : formatDurationMs(duration, t),
    },
    { key: 'steps', label: t('metric.steps'), value: stats === undefined ? absent : String(stats.steps) },
    { key: 'turns', label: t('metric.turns'), value: stats === undefined ? absent : String(stats.turns) },
  ]
}

/** One card's rendered context line. */
export interface RowContextText {
  /** The reading beside the bar: percent with both figures, or the tokens alone. */
  readonly reading: string
  /** Bar fill width in percent; absent while the capacity is unknown. */
  readonly percent?: number
  /** The whole sentence for the accessible name and the bar's value text. */
  readonly aria: string
}

/**
 * Compose one card's context line.
 * @param row - the card to read.
 * @param t - translate function bound to this plugin's dictionary.
 * @returns the reading, or undefined without a usable pressure sample.
 */
export function rowContextText(row: SubagentRow, t: Translate): RowContextText | undefined {
  const context = rowContext(row)
  if (context === undefined) return undefined
  const used = formatTokenCount(context.usedTokens, t)
  if (context.contextWindow === undefined || context.percent === undefined) {
    return {
      reading: t('context.reading.open', { used }),
      aria: t('context.aria.open', { used }),
    }
  }
  const percent = String(context.percent)
  const window = formatTokenCount(context.contextWindow, t)
  return {
    reading: t('context.reading', { percent, used, window }),
    percent: context.percent,
    aria: t('context.aria', { percent, used, window }),
  }
}

/** One segment of a card's heuristic context composition. */
export interface RowBreakdownPart {
  readonly key: 'system' | 'tools' | 'messages'
  readonly label: string
  /** Ready-to-render label plus compact count. */
  readonly text: string
  /** Share of the heuristic total, 0..1; the segment widths use it. */
  readonly share: number
}

/**
 * Compose one card's heuristic context composition.
 * @param row - the card to read.
 * @param t - translate function bound to this plugin's dictionary.
 * @returns three parts in bar-segment order, or undefined without a positive total.
 */
export function rowBreakdownParts(row: SubagentRow, t: Translate): readonly RowBreakdownPart[] | undefined {
  const breakdown = row.breakdown
  if (breakdown === undefined) return undefined
  const total = breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens
  if (total <= 0) return undefined
  const part = (
    key: RowBreakdownPart['key'],
    labelKey: 'breakdown.system' | 'breakdown.tools' | 'breakdown.messages',
    tokens: number,
  ): RowBreakdownPart => {
    const label = t(labelKey)
    return {
      key,
      label,
      text: t('breakdown.item', { label, value: formatTokenCount(tokens, t) }),
      share: tokens / total,
    }
  }
  return [
    part('system', 'breakdown.system', breakdown.systemTokens),
    part('tools', 'breakdown.tools', breakdown.toolsTokens),
    part('messages', 'breakdown.messages', breakdown.messageTokens),
  ]
}

/** One filled span of a card's context bar. */
export interface RowBarSegment {
  readonly key: 'total' | 'system' | 'tools' | 'messages'
  /** Width in percent of the whole bar, already scaled by the occupancy. */
  readonly width: number
}

/**
 * Split a card's occupancy into filled spans: the heuristic composition when it
 * is known and positive, otherwise one span carrying the whole occupancy.
 * Nothing is filled while the capacity is unknown, because there is no scale to
 * fill against.
 * @param row - the card to read.
 * @param percent - the clamped occupancy, or undefined without a capacity.
 * @returns the spans in paint order.
 */
export function rowBarSegments(row: SubagentRow, percent: number | undefined): readonly RowBarSegment[] {
  if (percent === undefined) return []
  const breakdown = row.breakdown
  const total = breakdown === undefined
    ? 0
    : breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens
  if (breakdown === undefined || total <= 0) return [{ key: 'total', width: percent }]
  const parts: readonly (readonly [RowBarSegment['key'], number])[] = [
    ['system', breakdown.systemTokens],
    ['tools', breakdown.toolsTokens],
    ['messages', breakdown.messageTokens],
  ]
  // A zero-width part is dropped rather than painted: the total stays the same
  // and no hairline segment claims a share the tokens do not have.
  return parts
    .filter(([, tokens]) => tokens > 0)
    .map(([key, tokens]) => ({ key, width: percent * tokens / total }))
}

/**
 * One line naming everything about a card, for its accessible label.
 * @param row - the card to describe.
 * @param t - translate function bound to this plugin's dictionary.
 * @param now - current wall-clock time used to extend a running card's duration.
 * @returns the localized summary.
 */
export function rowAriaSummary(row: SubagentRow, t: Translate, now: number): string {
  const activity = t(row.running ? 'activity.running' : 'activity.inactive')
  const mode = t(row.mode === 'one-shot' ? 'mode.oneShot' : 'mode.continuable')
  const model = rowModelParts(row, t)
  const modelText = model.known
    ? [model.pending, model.model, model.reasoning].filter(part => part !== undefined).join(' · ')
    : t('detail.unknown')
  const context = rowContextText(row, t)
  const breakdown = rowBreakdownParts(row, t)
  const absent = t('value.absent')
  const metrics = rowMetrics(row, t, now)
    .filter(metric => metric.value !== absent)
    .map(metric => metric.label + ' ' + metric.value)
  // The legend is painted from the card's own text, so the accessible name has
  // to spell the composition out: an aria-label replaces its children's text.
  const composition = breakdown === undefined
    ? []
    : [t('breakdown.label') + ' ' + breakdown.map(part => part.text).join(' · ')]
  return [
    row.label,
    activity,
    mode,
    modelText,
    ...(context === undefined ? [] : [context.aria]),
    ...composition,
    ...metrics,
  ].join(' · ')
}
