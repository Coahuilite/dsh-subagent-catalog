/**
 * Session-header control: one button over every subagent beneath the current
 * session. Running children come first and each row states, in separate visual
 * layers, which subagent it is, whether it runs, its mode, and the model and
 * reasoning effort it uses.
 *
 * Layers come from the shared primitives, never from colour alone: a state mark
 * separates running from idle, the title line carries the identity, and a badge
 * line carries the model facts with one tone per meaning. The control owns its
 * own DOM and contributes nothing to the session log, so unloading the plugin
 * leaves no state behind.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { StateDot, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { NS } from './locales.ts'
import { buildSubagentRows, rowAriaSummary, rowModelParts, type SubagentRow } from './rows.ts'
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

/** State mark size on a row and on the trigger, in px. */
const DOT_SIZE = 8

/** Gap between the trigger and its panel, in px. */
const ANCHOR_GAP = 6

/** Panel edge margin, shared with the placement math. */
const EDGE_MARGIN = 16

/** Preferred panel height used only to decide whether it opens below or above. */
const PANEL_ESTIMATE = 320

/** Clamp one axis inside the viewport. */
function clamp(value: number, size: number, available: number): number {
  return Math.min(Math.max(EDGE_MARGIN, value), Math.max(EDGE_MARGIN, available - size - EDGE_MARGIN))
}

/**
 * One subagent catalog control for the current session.
 * @param props - session runtime props, the bound translator, and the injected open callback.
 * @returns the trigger and, while open, the portaled row list; nothing without subagents.
 */
export function SubagentCatalogAction({
  sessionId, useSessions, openSubagent, t,
}: SubagentCatalogActionProps) {
  const summaries = useSessions(state => state.byId)
  const rows = useMemo(() => buildSubagentRows(summaries, sessionId), [summaries, sessionId])
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number }>()
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
          place()
          setOpen(true)
        }}
      >
        <StateDot state={runningCount > 0 ? 'ongoing' : 'idle'} size={DOT_SIZE} />
        <span className={CLS + '-triggerText'}>{summary}</span>
      </button>
      {open && position !== undefined && createPortal(
        <div ref={menuRef} className={CLS + '-menu'} role="menu" aria-label={t('menu.aria')} style={position}>
          {rows.map((row) => {
            const parts = rowModelParts(row, t)
            return (
              <button
                key={row.id}
                type="button"
                role="menuitem"
                className={CLS + '-row'}
                data-running={String(row.running)}
                data-depth={String(Math.min(row.depth, MAX_INDENT_DEPTH))}
                aria-label={rowAriaSummary(row, t)}
                onClick={() => { openRow(row) }}
              >
                <span className={CLS + '-head'}>
                  <StateDot state={row.running ? 'ongoing' : 'idle'} size={DOT_SIZE} />
                  <span className={CLS + '-label'}>{row.label}</span>
                  <Tag tone={row.running ? 'success' : 'quiet'}>
                    {t(row.running ? 'activity.running' : 'activity.inactive')}
                  </Tag>
                </span>
                <span className={CLS + '-meta'}>
                  {parts.known
                    ? (
                      <>
                        <Tag tone={parts.pending === undefined ? 'info' : 'warning'}>{parts.model}</Tag>
                        <Tag tone="neutral">{parts.reasoning}</Tag>
                        {parts.pending !== undefined && <Tag tone="warning">{parts.pending}</Tag>}
                      </>
                    )
                    : <Tag tone="quiet">{t('detail.unknown')}</Tag>}
                  <Tag tone="outline">
                    {t(row.mode === 'one-shot' ? 'mode.oneShot' : 'mode.continuable')}
                  </Tag>
                </span>
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}
