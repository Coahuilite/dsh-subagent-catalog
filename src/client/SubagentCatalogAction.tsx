/**
 * Session-header control: one card per subagent beneath the current session.
 *
 * Running children come first, and each card stacks, in separate visual layers,
 * which subagent it is, whether it runs, its mode, the model and reasoning
 * effort it uses, how much context it holds, the heuristic composition of that
 * context, and its speed, cache-hit share, cumulative tokens, duration, and
 * step/turn counts.
 *
 * Every figure rides a durable client projection, so a card never invents a
 * number it could not read: an absent projection renders as the absent marker.
 * Layers come from the shared primitives, never from colour alone: a state mark
 * separates running from idle, the identity line carries the name, badges carry
 * the model facts, the context bar prints its own reading, and every metric
 * cell carries its label. The control owns its own DOM and contributes nothing
 * to the session log, so unloading the plugin leaves no state behind.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MenuSurface, StateDot, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { NS } from './locales.ts'
import {
  buildSubagentRows, contextLevel, rowAriaSummary, rowBarSegments, rowBreakdownParts, rowContextText,
  rowMetrics, rowModelParts, type SubagentRow,
} from './rows.ts'
import { EffortEntry, ModelEntry } from './RouteEntries.tsx'
import { CLS, MAX_INDENT_DEPTH, MENU_WIDTH } from './styles.ts'

/** One subagent the control opens: the durable direct-parent address. */
export interface SubagentOpenRequest {
  readonly parentSessionId: SessionId
  readonly childSessionId: SessionId
  readonly mode: 'one-shot' | 'continuable'
}

/** Browser operations injected into the header contribution. */
export interface SubagentCatalogInjected {
  openSubagent: (request: SubagentOpenRequest) => void
}

/** Full props for the session-header subagent catalog control. */
export type SubagentCatalogActionProps =
  PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<typeof NS>
  & InjectFace<SubagentCatalogInjected>

/** State mark size on a card and on the trigger, in px. */
const DOT_SIZE = 8

/** Gap between the trigger and its panel, in px. */
const ANCHOR_GAP = 6

/** Panel edge margin, shared with the placement math. */
const EDGE_MARGIN = 16

/** Preferred panel height used only to decide whether it opens below or above. */
const PANEL_ESTIMATE = 420

/** How often a running card's open turn advances its duration, in ms. */
const TICK_MS = 1_000

/** Clamp one axis inside the viewport. */
function clamp(value: number, size: number, available: number): number {
  return Math.min(Math.max(EDGE_MARGIN, value), Math.max(EDGE_MARGIN, available - size - EDGE_MARGIN))
}

interface SubagentCardProps {
  row: SubagentRow
  t: TranslateNS<typeof NS>
  /** Current wall-clock time; running cards extend their open turn to it. */
  now: number
  onOpen: (row: SubagentRow) => void
}

/**
 * One subagent card: identity, model badges, context bar and composition, and
 * the metric grid, all inside one open target.
 * @param props - the card's row, its translator, the clock, and the open callback.
 * @returns the card element.
 */
function SubagentCard({ row, t, now, onOpen }: SubagentCardProps) {
  const parts = rowModelParts(row, t)
  const context = rowContextText(row, t)
  const breakdown = rowBreakdownParts(row, t)
  const metrics = rowMetrics(row, t, now)
  const percent = context?.percent
  // The bar's overall length stays the occupancy; the heuristic breakdown only
  // proportions its coloured parts, so the two never disagree about the total.
  const segments = rowBarSegments(row, percent)

  return (
    // A row rather than a button: the model and effort entries below are real
    // controls, and interactive content inside a button is invalid. The row
    // itself stays the open-target, so clicking anywhere else still opens the
    // child, and each entry stops propagation so a pick never also navigates.
    <div
      role="menuitem"
      tabIndex={0}
      className={CLS + '-card'}
      data-running={String(row.running)}
      data-depth={String(Math.min(row.depth, MAX_INDENT_DEPTH))}
      aria-label={rowAriaSummary(row, t, now)}
      onClick={() => { onOpen(row) }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onOpen(row)
      }}
    >
      <span className={CLS + '-head'}>
        <StateDot state={row.running ? 'ongoing' : 'idle'} size={DOT_SIZE} />
        <span className={CLS + '-label'}>{row.label}</span>
        <Tag tone={row.running ? 'success' : 'quiet'}>
          {t(row.running ? 'activity.running' : 'activity.inactive')}
        </Tag>
      </span>
      <span className={CLS + '-tags'}>
        {parts.known
          ? (
            <>
              <ModelEntry row={row} t={t} />
              <EffortEntry row={row} t={t} />
              {parts.pending !== undefined && <Tag tone="warning">{parts.pending}</Tag>}
            </>
          )
          : <Tag tone="quiet">{t('detail.unknown')}</Tag>}
        <Tag tone="outline">{t(row.mode === 'one-shot' ? 'mode.oneShot' : 'mode.continuable')}</Tag>
      </span>
      {context !== undefined && (
        <span className={CLS + '-ctxHead'}>
          <span className={CLS + '-ctxLabel'}>{t('context.label')}</span>
          <span className={CLS + '-ctxReading'}>{context.reading}</span>
        </span>
      )}
      {/* The bar is a reading, not a control, so it is an image with the whole
          sentence behind it; without a capacity there is no scale to fill
          against and the hatched track replaces a confident empty bar. */}
      {context !== undefined && (
        <span
          className={CLS + '-bar'}
          data-unknown={String(percent === undefined)}
          data-level={contextLevel(percent) ?? 'none'}
          role="img"
          aria-label={context.aria}
        >
          {segments.map(segment => (
            <span
              key={segment.key}
              className={CLS + '-barFill'}
              data-part={segment.key}
              style={{ width: segment.width + '%' }}
            />
          ))}
        </span>
      )}
      {breakdown !== undefined && (
        <span className={CLS + '-legend'}>
          {breakdown.map(part => (
            <span key={part.key} className={CLS + '-legendItem'}>
              <span className={CLS + '-swatch'} data-part={part.key} aria-hidden />
              {part.text}
            </span>
          ))}
        </span>
      )}
      <span className={CLS + '-metrics'}>
        {metrics.map(metric => (
          <span key={metric.key} className={CLS + '-metric'}>
            <span className={CLS + '-metricLabel'}>{metric.label}</span>
            <span className={CLS + '-metricValue'}>{metric.value}</span>
          </span>
        ))}
      </span>
    </div>
  )
}

/**
 * One subagent catalog control for the current session.
 * @param props - session runtime props, the bound translator, and the injected open callback.
 * @returns the trigger and, while open, the portaled card list; nothing without subagents.
 */
export function SubagentCatalogAction({
  sessionId, useSessions, openSubagent, t,
}: SubagentCatalogActionProps) {
  const summaries = useSessions(state => state.byId)
  const rows = useMemo(() => buildSubagentRows(summaries, sessionId), [summaries, sessionId])
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number }>()
  const [now, setNow] = useState(() => Date.now())
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  /** Anchor the panel to the trigger, flipping above it when the room below is short. */
  const place = useCallback((): void => {
    const trigger = triggerRef.current
    if (trigger === null) return
    const rect = trigger.getBoundingClientRect()
    const below = rect.bottom + ANCHOR_GAP
    const roomBelow = window.innerHeight - below - EDGE_MARGIN
    const top = roomBelow >= PANEL_ESTIMATE
      ? below
      : Math.max(EDGE_MARGIN, rect.top - ANCHOR_GAP - PANEL_ESTIMATE)
    setPosition({ top, left: clamp(rect.left, MENU_WIDTH, window.innerWidth) })
  }, [])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent): void => {
      const target = event.target
      if (target instanceof Node
        && !triggerRef.current?.contains(target)
        && !menuRef.current?.contains(target)) setOpen(false)
    }
    const closeEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [open])

  // The panel is viewport-fixed, so it follows its trigger through layout changes.
  useEffect(() => {
    if (!open) return
    const reposition = (): void => { place() }
    window.addEventListener('resize', reposition)
    document.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      document.removeEventListener('scroll', reposition, true)
    }
  }, [open, place])

  // Only a running card has an open turn to extend, so an all-idle panel holds
  // no interval and no per-second render.
  const hasRunning = rows.some(row => row.running)
  useEffect(() => {
    if (!open || !hasRunning) return
    setNow(Date.now())
    const timer = window.setInterval(() => { setNow(Date.now()) }, TICK_MS)
    return () => { window.clearInterval(timer) }
  }, [open, hasRunning])

  useEffect(() => {
    if (rows.length === 0) setOpen(false)
  }, [rows.length])

  if (rows.length === 0) return null

  const runningCount = rows.filter(row => row.running).length
  const countKey = runningCount > 0
    ? (rows.length === 1 ? 'count.running.one' : 'count.running.other')
    : (rows.length === 1 ? 'count.total.one' : 'count.total.other')
  const summary = t(countKey, { count: rows.length })

  const openRow = (row: SubagentRow): void => {
    openSubagent({ parentSessionId: row.parentId, childSessionId: row.id, mode: row.mode })
    setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={CLS + '-trigger'}
        data-open={String(open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('button.aria', { count: summary })}
        onClick={() => {
          if (open) { setOpen(false); return }
          setNow(Date.now())
          place()
          setOpen(true)
        }}
      >
        <StateDot state={runningCount > 0 ? 'ongoing' : 'idle'} size={DOT_SIZE} />
        <span className={CLS + '-triggerText'}>{summary}</span>
      </button>
      {open && position !== undefined && createPortal(
        // The shared menu material owns the translucent fill, its blur layer, the
        // menu radius, and the macOS backing that lets Chromium blur a transparent
        // window. Painting a background here would double the fill, and blurring
        // this element directly would add a backdrop root plus a fixed-position
        // containing block for everything nested inside it - which is exactly what
        // the shared surface exists to avoid. Placement is inline so no stylesheet
        // order can win over it.
        <MenuSurface
          ref={menuRef}
          className={CLS + '-menu'}
          role="menu"
          aria-label={t('menu.aria')}
          style={{ ...position, position: 'fixed' }}
        >
          {/* The menu's accessible name already states the group, and the trigger
              announces the count, so the head is decoration inside role=menu. */}
          <div className={CLS + '-panelHead'} aria-hidden="true">
            <span className={CLS + '-panelTitle'}>{t('panel.title')}</span>
            <span className={CLS + '-panelCount'}>{summary}</span>
          </div>
          {rows.map(row => (
            <SubagentCard key={row.id} row={row} t={t} now={now} onOpen={openRow} />
          ))}
        </MenuSurface>,
        document.body,
      )}
    </>
  )
}
