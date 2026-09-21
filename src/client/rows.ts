/**
 * Pure derivation of the header control's rows from the client session list.
 *
 * Every fact comes from data the client already holds: the session summaries
 * carry the durable `subagent` identity (label and mode) and the durable
 * `modelSelection` projection, so this plugin needs no host change, no new RPC,
 * and no session it has not been handed.
 *
 * @module dsh-subagent-catalog/rows
 */

import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ModelSelectionProjection } from '@deepseek-ai/dsh-api-session-controller/types'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** One child's model route together with how the client learned it. */
export interface SubagentRowModel {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
  /**
   * `used` when a recorded request already used this route; `selected` or
   * `next` when it is a choice the session has not requested with yet, so a row
   * never describes a pending choice as something that already happened.
   */
  readonly state: 'used' | 'selected' | 'next'
}

/** One subagent row the header control can open. */
export interface SubagentRow {
  readonly id: SessionId
  readonly parentId: SessionId
  /** 1 for a direct child, 2 for a grandchild, and so on. */
  readonly depth: number
  readonly label: string
  readonly mode: 'one-shot' | 'continuable'
  readonly running: boolean
  readonly model?: SubagentRowModel
}

/** One route plus its optional effort, as both the projection and a row spell it. */
interface Route {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
}

/** How deep the walk descends; a cycle guard, not a product limit. */
const MAX_DEPTH = 8

/** Whether two routes name the same model and effort. */
function sameRoute(left: Route, right: Route): boolean {
  return left.provider === right.provider
    && left.model === right.model
    && left.reasoningEffort === right.reasoningEffort
}

/**
 * Read one session summary's durable model selection.
 * @param summary - the child's client summary.
 * @returns the route the row should show plus its state, or undefined without a record.
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
  // route, so it is worth showing — labelled.
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
 * a row.
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
 * running-first. Depth therefore tracks the indentation exactly.
 * @param summaries - the client session list.
 * @param rootSessionId - the session whose header hosts the control.
 * @returns the descendant rows in display order.
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
      rows.push({
        id: summary.id,
        parentId,
        depth,
        label: identity?.label ?? summary.displayTitle,
        mode: identity?.mode ?? 'one-shot',
        running: summary.running,
        ...(model === undefined ? {} : { model }),
      })
      visit(summary.id, depth + 1)
    }
  }
  visit(rootSessionId, 1)
  return rows
}

/** One row's model information, split so each part renders as its own badge. */
export interface RowModelParts {
  /** False when the client holds no usable selection; the other fields are then unset. */
  readonly known: boolean
  /** Localized "Selected" / "Next" marker, present only for a choice not yet requested with. */
  readonly pending?: string
  /** Localized model route, present when known. */
  readonly model?: string
  /** Localized reasoning effort, present when known. */
  readonly reasoning?: string
}

/**
 * Split one row's model information into separately renderable parts.
 * @param row - the row to describe.
 * @param t - translate function bound to this plugin's dictionary.
 * @returns the parts; `known: false` carries no model text.
 */
export function rowModelParts(row: SubagentRow, t: TranslateNS<'subagent-catalog'>): RowModelParts {
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

/**
 * One line naming everything about a row, for its accessible label.
 * @param row - the row to describe.
 * @param t - translate function bound to this plugin's dictionary.
 * @returns the localized summary.
 */
export function rowAriaSummary(row: SubagentRow, t: TranslateNS<'subagent-catalog'>): string {
  const activity = t(row.running ? 'activity.running' : 'activity.inactive')
  const mode = t(row.mode === 'one-shot' ? 'mode.oneShot' : 'mode.continuable')
  const parts = rowModelParts(row, t)
  const model = parts.known
    ? [parts.pending, parts.model, parts.reasoning].filter(part => part !== undefined).join(' · ')
    : t('detail.unknown')
  return [row.label, activity, mode, model].join(' · ')
}
