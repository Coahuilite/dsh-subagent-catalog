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
  readonly error?: string
  /** How the last accepted write landed, for the receipt. */
  readonly receipt?: 'applied' | 'queued'
  readonly busy: boolean
}

/** The initial, not-yet-fetched entry state. */
const IDLE: EntryState = { loading: false, busy: false }

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
    setCurrent(previous => ({ ...previous, loading: true, error: undefined }))
    const result = await readRetargetState(parentSessionId, childSessionId)
    setCurrent(previous => ({
      ...previous,
      loading: false,
      ...result.ok
        ? { state: result.value, error: undefined }
        : { state: undefined, error: result.message },
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
    setCurrent(previous => ({ ...previous, busy: true, receipt: undefined, error: undefined }))
    const result = await applyRetarget(parentSessionId, childSessionId, selection)
    if (!result.ok) {
      setCurrent(previous => ({ ...previous, busy: false, error: result.code + ': ' + result.message }))
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
    setCurrent(previous => ({ ...previous, busy: true, receipt: undefined, error: undefined }))
    const result = await cancelRetarget(parentSessionId, childSessionId)
    if (!result.ok) {
      setCurrent(previous => ({ ...previous, busy: false, error: result.code + ': ' + result.message }))
      return
    }
    setCurrent(previous => ({ ...previous, busy: false }))
    await load()
  }, [parentSessionId, childSessionId, load])

  return { open, setOpen, current, apply, cancel }
}

/** The inline list shell. */
function PickerList({ children }: { children: ReactNode }) {
  return <span className={CLS + '-picker'}>{children}</span>
}

/** Receipt, error, and the queue's own cancellation, shared by both entries. */
function EntryStatus({ current, t, onCancel }: {
  current: EntryState
  t: TranslateNS<typeof NS>
  onCancel: () => void
}) {
  return (
    <>
      {current.error !== undefined && <span className={CLS + '-pickerError'}>{current.error}</span>}
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
  const blocked = current.state !== undefined && current.state.allowed === null

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
          {blocked && <span className={CLS + '-pickerNote'}>{t('edit.noPolicy')}</span>}
          <EntryStatus current={current} t={t} onCancel={() => { void cancel() }} />
          {routes?.map(route => (
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
          {loaded && efforts.length === 0 && (
            <span className={CLS + '-pickerNote'}>{t('pick.none')}</span>
          )}
          {efforts.map(effort => (
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
