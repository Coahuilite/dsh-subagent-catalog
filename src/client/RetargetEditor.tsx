/**
 * The panel's route editor.
 *
 * It is a separate, explicitly opened form rather than an affordance inside a
 * card: a card is one big open-target button, so an edit control nested in it
 * would be invalid markup and an accidental write waiting to happen. Opening the
 * form is the deliberate act; nothing changes until Apply.
 *
 * The official `subagent-model-selection` setting is the gate. The form only
 * appears once the host reports authorized routes for this session, offers only
 * those routes, and offers only the effort tiers the chosen model advertises -
 * so the panel can never name a route the user did not authorize or a tier the
 * model cannot take.
 *
 * @module dsh-subagent-catalog/RetargetEditor
 */

import { useCallback, useEffect, useState } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { SubagentRow } from './rows.ts'
import { NS } from './locales.ts'
import {
  applyRetarget, readRetargetState,
  type AllowedRouteOption, type RetargetState, type RouteReading,
} from './retarget.ts'
import { CLS } from './styles.ts'

/** Props for the panel's route editor. */
export interface RetargetEditorProps {
  /** Every card the panel is showing. */
  readonly rows: readonly SubagentRow[]
  /** The session hosting the panel, i.e. the children's direct parent. */
  readonly parentSessionId: string
  /** Translator bound to this plugin's dictionary. */
  readonly t: TranslateNS<typeof NS>
}

/** One option in the target picker. */
function targetLabel(row: SubagentRow): string {
  return row.label
}

/**
 * Resolve the effort list a route advertises.
 * @param route - the chosen authorized route.
 * @returns its effort ids, empty when it advertises none.
 */
function effortsOf(route: AllowedRouteOption | undefined): readonly string[] {
  return route?.efforts ?? []
}

/**
 * Whether a reading names the same route as a selection.
 * @param reading - route the child last requested with, or null.
 * @param provider - candidate provider.
 * @param model - candidate model.
 * @returns whether both name the same provider and model.
 */
function sameRoute(reading: RouteReading | null, provider: string, model: string): boolean {
  return reading !== null && reading.provider === provider && reading.model === model
}

/**
 * The panel's route editor: a closed button, then a gated form.
 * @param props - the visible rows, the parent session, and the translator.
 * @returns the editor element.
 */
export function RetargetEditor({ rows, parentSessionId, t }: RetargetEditorProps) {
  const [open, setOpen] = useState(false)
  const [targetId, setTargetId] = useState<string>(() => String(rows[0]?.id ?? ''))
  const [state, setState] = useState<RetargetState>()
  const [reading, setReading] = useState(true)
  const [readError, setReadError] = useState<string>()
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [effort, setEffort] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<{ ok: boolean; text: string }>()

  const allowed = state?.allowed ?? undefined

  /** Load the target's state and seed the form from its current route. */
  const load = useCallback(async (childSessionId: string): Promise<void> => {
    if (childSessionId === '') return
    setReading(true)
    setReadError(undefined)
    setOutcome(undefined)
    const result = await readRetargetState(parentSessionId, childSessionId)
    setReading(false)
    if (!result.ok) {
      setState(undefined)
      setReadError(result.message)
      return
    }
    setState(result.value)
    // Seed from the route in use when the policy still authorizes it, else the
    // first authorized route, so the form never opens on an unauthorized value.
    const routes = result.value.allowed ?? []
    const current = result.value.current
    const seeded = routes.find(route => current !== null
      && route.provider === current.provider && route.model === current.model) ?? routes[0]
    setProvider(seeded?.provider ?? '')
    setModel(seeded?.model ?? '')
    setEffort(current !== null && seeded !== undefined
      && current.provider === seeded.provider && current.model === seeded.model
      ? current.reasoningEffort ?? ''
      : '')
  }, [parentSessionId])

  // A row set that no longer contains the target must not keep a stale form.
  useEffect(() => {
    if (rows.length === 0) { setOpen(false); return }
    if (!rows.some(row => String(row.id) === targetId)) setTargetId(String(rows[0]?.id ?? ''))
  }, [rows, targetId])

  useEffect(() => {
    if (!open) return
    void load(targetId)
  }, [open, targetId, load])

  if (rows.length === 0) return null

  const providers = [...new Set((allowed ?? []).map(route => route.provider))]
  const modelsForProvider = (allowed ?? []).filter(route => route.provider === provider)
  const chosenRoute = (allowed ?? []).find(route => route.provider === provider && route.model === model)
  const efforts = effortsOf(chosenRoute)
  const routeChanged = !sameRoute(state?.current ?? null, provider, model)
  // Omitting the tier is always a legal request: across a route change the host
  // clears the route-owned tier, and on the same route it keeps the current one.
  const effectiveEffort = effort === '' ? undefined : effort
  // The preview has to show the OUTCOME, not the input: leaving the tier empty
  // means "the model's default" after a route change and "unchanged" otherwise.
  const shownEffort = effectiveEffort
    ?? (routeChanged ? t('edit.effort.default') : (state?.current?.reasoningEffort ?? t('edit.effort.default')))
  const preview = provider === '' || model === ''
    ? '—'
    : provider + '/' + model + ' · ' + shownEffort

  const submit = async (): Promise<void> => {
    if (provider === '' || model === '' || submitting) return
    setSubmitting(true)
    setOutcome(undefined)
    const result = await applyRetarget(parentSessionId, targetId, {
      provider,
      model,
      ...effectiveEffort === undefined ? {} : { reasoningEffort: effectiveEffort },
    })
    setSubmitting(false)
    setOutcome(result.ok
      ? { ok: true, text: t('edit.applied') }
      : { ok: false, text: result.code + ': ' + result.message })
    if (result.ok) await load(targetId)
  }

  if (!open) {
    return (
      <div className={CLS + '-editorBar'}>
        <button
          type="button"
          className={CLS + '-editorOpen'}
          onClick={() => { setOpen(true) }}
        >
          {t('edit.open')}
        </button>
      </div>
    )
  }

  return (
    <div className={CLS + '-editor'}>
      <div className={CLS + '-editorHead'}>
        <span className={CLS + '-editorTitle'}>{t('edit.title')}</span>
        <button
          type="button"
          className={CLS + '-editorClose'}
          onClick={() => { setOpen(false) }}
        >
          {t('edit.close')}
        </button>
      </div>

      <label className={CLS + '-editorField'}>
        <span className={CLS + '-editorLabel'}>{t('edit.target')}</span>
        <select
          className={CLS + '-editorSelect'}
          value={targetId}
          onChange={(event) => { setTargetId(event.target.value) }}
        >
          {rows.map(row => (
            <option key={String(row.id)} value={String(row.id)}>{targetLabel(row)}</option>
          ))}
        </select>
      </label>

      {reading && <p className={CLS + '-editorNote'}>{t('edit.loading')}</p>}
      {readError !== undefined && <p className={CLS + '-editorError'}>{readError}</p>}

      {!reading && readError === undefined && state !== undefined && (
        state.allowed === null
          ? <p className={CLS + '-editorNote'}>{t('edit.noPolicy')}</p>
          : !state.live
            ? <p className={CLS + '-editorNote'}>{t('edit.notLive')}</p>
            : (
              <>
                <label className={CLS + '-editorField'}>
                  <span className={CLS + '-editorLabel'}>{t('edit.provider')}</span>
                  <select
                    className={CLS + '-editorSelect'}
                    value={provider}
                    onChange={(event) => {
                      setProvider(event.target.value)
                      setModel('')
                      setEffort('')
                    }}
                  >
                    {providers.map(id => <option key={id} value={id}>{id}</option>)}
                  </select>
                </label>

                <label className={CLS + '-editorField'}>
                  <span className={CLS + '-editorLabel'}>{t('edit.model')}</span>
                  <select
                    className={CLS + '-editorSelect'}
                    value={model}
                    onChange={(event) => { setModel(event.target.value); setEffort('') }}
                  >
                    <option value="">—</option>
                    {modelsForProvider.map(route => (
                      <option key={route.model} value={route.model}>{route.model}</option>
                    ))}
                  </select>
                </label>

                {/* Only a model that advertises tiers gets the row: a model with
                    none has no tier to choose, not a hidden default. */}
                {efforts.length > 0 && (
                  <label className={CLS + '-editorField'}>
                    <span className={CLS + '-editorLabel'}>{t('edit.effort')}</span>
                    <select
                      className={CLS + '-editorSelect'}
                      value={effort}
                      onChange={(event) => { setEffort(event.target.value) }}
                    >
                      <option value="">{t('edit.effort.default')}</option>
                      {efforts.map(id => <option key={id} value={id}>{id}</option>)}
                    </select>
                  </label>
                )}

                <p className={CLS + '-editorPreview'}>
                  {t('edit.preview')} {preview}
                </p>
                <button
                  type="button"
                  className={CLS + '-editorApply'}
                  disabled={submitting || provider === '' || model === ''}
                  onClick={() => { void submit() }}
                >
                  {t('edit.confirm')}
                </button>
              </>
            )
      )}

      {outcome !== undefined && (
        <p className={outcome.ok ? CLS + '-editorOk' : CLS + '-editorError'}>{outcome.text}</p>
      )}
    </div>
  )
}
