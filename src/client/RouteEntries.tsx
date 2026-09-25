/**
 * The card's clickable route entries.
 *
 * The model badge and the effort badge are the controls: clicking either opens
 * its own inline list of what the host authorizes, and picking one applies the
 * change. There is no separate form and no confirmation step, because the choice
 * itself is the deliberate act and the list only ever contains options the
 * session's policy already allows.
 *
 * A card cannot be a `<button>` and hold these, since interactive content inside
 * a button is invalid; the card is a focusable row whose open-target is the card
 * itself, and these entries stop propagation so a pick never also opens the child.
 *
 * Three states the list must be honest about:
 * - a session with no policy gets an explanation, never a list;
 * - a child that is not live is ACCEPTED and queued, so the receipt says the
 *   change applies on its next activity rather than implying it already landed;
 * - an empty tier list means the model advertises none, and says so.
 *
 * @module dsh-subagent-catalog/RouteEntries
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { MenuSurface } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { SubagentRow } from './rows.ts'
import { NS } from './locales.ts'
import {
  applyRetarget, cancelRetarget, readRetargetState, type RetargetState,
} from './retarget.ts'
import { CLS } from './styles.ts'

/** Shared props for one card's route entries. */
interface EntryProps {
  /** The card this entry belongs to. */
  readonly row: SubagentRow
  /** Translator bound to this plugin's dictionary. */
  readonly t: TranslateNS<typeof NS>
}

/** What one entry has learned so far. */
interface EntryState {
  readonly loading: boolean
  readonly state?: RetargetState
  /** Stable failure code, so a known refusal can be stated in the UI's language. */
  readonly errorCode?: string
  readonly error?: string
  /** How the last accepted write landed, for the receipt. */
  readonly receipt?: 'applied' | 'queued'
  readonly busy: boolean
}

/** The initial, not-yet-fetched entry state. */
const IDLE: EntryState = { loading: false, busy: false }

/** Failure codes the panel states itself instead of echoing the host's English. */
const LOCALE_CODES: Readonly<Record<string, Parameters<TranslateNS<typeof NS>>[0]>> = {
  'terminal-one-shot': 'pick.terminal',
}

/**
 * Read the child's authorized routes on demand, and write through them.
 * @param row - the card being edited.
 * @returns the open flag, current state, and the apply/cancel operations.
 */
function useRouteEntry(row: SubagentRow) {
  const parentSessionId = String(row.parentId)
  const childSessionId = String(row.id)
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<EntryState>(IDLE)

  const load = useCallback(async (): Promise<void> => {
    setCurrent(previous => ({ ...previous, loading: true, errorCode: undefined, error: undefined }))
    const result = await readRetargetState(parentSessionId, childSessionId)
    setCurrent(previous => ({
      ...previous,
      loading: false,
      ...result.ok
        ? { state: result.value, errorCode: undefined, error: undefined }
        : { state: undefined, errorCode: result.code, error: result.message },
    }))
  }, [parentSessionId, childSessionId])

  // Load once, the first time an entry is opened: a closed panel issues no
  // requests, so a large panel costs nothing until it is actually used.
  useEffect(() => {
    if (!open || current.state !== undefined || current.loading) return
    void load()
  }, [open, current.state, current.loading, load])

  const apply = useCallback(async (
    selection: { provider: string; model: string; reasoningEffort?: string },
  ): Promise<void> => {
    setCurrent(previous => ({ ...previous, busy: true, receipt: undefined, errorCode: undefined, error: undefined }))
    const result = await applyRetarget(parentSessionId, childSessionId, selection)
    if (!result.ok) {
      setCurrent(previous => ({ ...previous, busy: false, errorCode: result.code, error: result.message }))
      return
    }
    // Re-read so the open list reflects the host's state rather than the
    // optimism of the click.
    setCurrent(previous => ({
      ...previous,
      busy: false,
      receipt: result.value.queued ? 'queued' : 'applied',
    }))
    await load()
  }, [parentSessionId, childSessionId, load])

  const cancel = useCallback(async (): Promise<void> => {
    setCurrent(previous => ({ ...previous, busy: true, receipt: undefined, errorCode: undefined, error: undefined }))
    const result = await cancelRetarget(parentSessionId, childSessionId)
    if (!result.ok) {
      setCurrent(previous => ({ ...previous, busy: false, errorCode: result.code, error: result.message }))
      return
    }
    setCurrent(previous => ({ ...previous, busy: false }))
    await load()
  }, [parentSessionId, childSessionId, load])

  return { open, setOpen, current, apply, cancel }
}

/**
 * The inline list shell: the shared menu material, placed by this plugin.
 *
 * Placement stays inline because the shared surface is `position: relative`, so a
 * stylesheet class of equal specificity would depend on injection order to win.
 * @param props - the list's rows.
 * @returns the positioned surface.
 */
function PickerList({ children }: { children: ReactNode }) {
  return (
    <MenuSurface
      compact
      className={CLS + '-picker'}
      style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0 }}
    >
      {children}
    </MenuSurface>
  )
}

/**
 * What the list must state before the user picks, derived from the host's
 * reading rather than discovered by a failed attempt.
 */
type Verdict =
  /** The session's policy does not authorize child model selection. */
  | 'unavailable'
  /** A finished one-shot child: no next turn exists to carry the change. */
  | 'terminal'
  /** Live: the change lands on the next request. */
  | 'live'
  /** Not live but continuable: the change is queued. */
  | 'queued'
  /** Not read yet. */
  | 'unknown'

/**
 * Classify one host reading into the verdict the list states.
 * @param state - the host's reading, or undefined before it arrives.
 * @returns the verdict.
 */
function verdictOf(state: RetargetState | undefined): Verdict {
  if (state === undefined) return 'unknown'
  if (state.allowed === null) return 'unavailable'
  if (state.live) return 'live'
  return state.mode === 'one-shot' ? 'terminal' : 'queued'
}

/**
 * The verdict line, plus the queue's own cancellation.
 *
 * Only the two states that can actually take the change render options; the
 * other two state their refusal instead of offering a choice that cannot work.
 * @param props - the reading, the translator, and the cancel handler.
 * @returns the status fragment.
 */
function EntryStatus({ current, t, onCancel }: {
  current: EntryState
  t: TranslateNS<typeof NS>
  onCancel: () => void
}) {
  const verdict = verdictOf(current.state)
  const localized = current.errorCode === undefined ? undefined : LOCALE_CODES[current.errorCode]
  return (
    <>
      {current.error !== undefined && (
        <span className={CLS + '-pickerError'}>
          {localized === undefined ? current.errorCode + ': ' + current.error : t(localized)}
        </span>
      )}
      {verdict === 'unavailable' && <span className={CLS + '-pickerNote'}>{t('edit.noPolicy')}</span>}
      {verdict === 'terminal' && <span className={CLS + '-pickerError'}>{t('pick.terminal')}</span>}
      {verdict === 'live' && <span className={CLS + '-pickerNote'}>{t('pick.willApply')}</span>}
      {verdict === 'queued' && <span className={CLS + '-pickerNote'}>{t('pick.willQueue')}</span>}
      {/* A queued change is only worth promising if it survives a restart; when
          the host has no storage the panel says so rather than letting the queue
          evaporate silently. */}
      {verdict === 'queued' && current.state?.durable === false && (
        <span className={CLS + '-pickerError'}>{t('pick.notDurable')}</span>
      )}
      {current.receipt === 'applied' && <span className={CLS + '-pickerOk'}>{t('edit.applied')}</span>}
      {current.receipt === 'queued' && <span className={CLS + '-pickerOk'}>{t('pick.queued')}</span>}
      {/* A queued intent is always removable, including after the session's
          policy was turned off, so this does not depend on the list's options. */}
      {current.state?.queued === true && (
        <button
          type="button"
          className={CLS + '-pickerOption'}
          disabled={current.busy}
          onClick={(event) => { event.stopPropagation(); onCancel() }}
        >
          {t('pick.cancel')}
        </button>
      )}
    </>
  )
}

/** Whether a verdict can carry a change at all. */
function offersOptions(verdict: Verdict): boolean {
  return verdict === 'live' || verdict === 'queued'
}

/**
 * The provider/model entry: shows the route in use and lists the authorized
 * routes. Picking one omits the effort deliberately, so the host applies its own
 * rule (a route change clears the route-owned tier, the same route keeps it).
 * @param props - the card and the translator.
 * @returns the entry, or nothing when the card records no route.
 */
export function ModelEntry({ row, t }: EntryProps) {
  const { open, setOpen, current, apply, cancel } = useRouteEntry(row)
  const parts = row.model
  if (parts === undefined) return null
  const routes = current.state?.allowed ?? undefined
  const verdict = verdictOf(current.state)

  return (
    <span className={CLS + '-entry'}>
      <button
        type="button"
        className={CLS + '-entryButton'}
        aria-expanded={open}
        data-queued={String(current.state?.queued === true)}
        aria-label={t('pick.model') + ': ' + parts.provider + '/' + parts.model}
        onClick={(event) => { event.stopPropagation(); setOpen(!open) }}
      >
        {parts.provider + '/' + parts.model}
      </button>
      {open && (
        <PickerList>
          {current.loading && <span className={CLS + '-pickerNote'}>{t('edit.loading')}</span>}
          <EntryStatus current={current} t={t} onCancel={() => { void cancel() }} />
          {offersOptions(verdict) && routes?.map(route => (
            <button
              key={route.provider + '/' + route.model}
              type="button"
              className={CLS + '-pickerOption'}
              disabled={current.busy}
              data-current={String(route.provider === parts.provider && route.model === parts.model)}
              onClick={(event) => {
                event.stopPropagation()
                void apply({ provider: route.provider, model: route.model })
              }}
            >
              {route.provider + '/' + route.model}
            </button>
          ))}
        </PickerList>
      )}
    </span>
  )
}

/**
 * The effort entry: lists only the tiers the card's current model advertises, so
 * a model with none says so rather than offering a control that cannot work.
 * Picking a tier keeps the current route and names the tier explicitly.
 * @param props - the card and the translator.
 * @returns the entry, or nothing when the card records no route.
 */
export function EffortEntry({ row, t }: EntryProps) {
  const { open, setOpen, current, apply, cancel } = useRouteEntry(row)
  const parts = row.model
  if (parts === undefined) return null
  const route = (current.state?.allowed ?? []).find(
    candidate => candidate.provider === parts.provider && candidate.model === parts.model,
  )
  const efforts = route?.efforts ?? []
  const loaded = current.state !== undefined
  const verdict = verdictOf(current.state)

  return (
    <span className={CLS + '-entry'}>
      <button
        type="button"
        className={CLS + '-entryButton'}
        aria-expanded={open}
        data-queued={String(current.state?.queued === true)}
        aria-label={t('pick.effort')}
        onClick={(event) => { event.stopPropagation(); setOpen(!open) }}
      >
        {parts.reasoningEffort ?? t('edit.effort.default')}
      </button>
      {open && (
        <PickerList>
          {current.loading && <span className={CLS + '-pickerNote'}>{t('edit.loading')}</span>}
          <EntryStatus current={current} t={t} onCancel={() => { void cancel() }} />
          {/* A model that advertises no tiers has nothing to choose, so the list
              states that instead of rendering an empty box. */}
          {offersOptions(verdict) && loaded && efforts.length === 0 && (
            <span className={CLS + '-pickerNote'}>{t('pick.none')}</span>
          )}
          {offersOptions(verdict) && efforts.map(effort => (
            <button
              key={effort}
              type="button"
              className={CLS + '-pickerOption'}
              disabled={current.busy}
              data-current={String(effort === parts.reasoningEffort)}
              onClick={(event) => {
                event.stopPropagation()
                void apply({ provider: parts.provider, model: parts.model, reasoningEffort: effort })
              }}
            >
              {effort}
            </button>
          ))}
        </PickerList>
      )}
    </span>
  )
}
