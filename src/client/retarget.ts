/**
 * Browser side of the host's retarget endpoint.
 *
 * The endpoint is an exact Fetch route on the shared `/api` channel, so it
 * inherits the carrier's trust and authentication policy and the page's own
 * session cookie is the only credential needed.
 *
 * Every response is narrowed field by field: a shape this code does not
 * recognize is reported as absent rather than rendered as a fact the host never
 * stated. `allowed: null` is meaningful, not missing — it is the host saying the
 * user has not authorized child model selection for this session.
 *
 * @module dsh-subagent-catalog/retarget
 */

/** Exact route owned by the host half of this plugin. */
const ROUTE = '/api/subagent-route-override'

/** One provider/model pair the session's policy authorizes. */
export interface AllowedRouteOption {
  readonly provider: string
  readonly model: string
  /** Adapter-advertised effort levels, absent when the model exposes none. */
  readonly efforts?: readonly string[]
  /** The model's own default effort, absent when it advertises none. */
  readonly defaultEffort?: string
}

/** One route as the host reports it. */
export interface RouteReading {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
}

/** Everything the editor needs about one child. */
export interface RetargetState {
  /** Whether the child currently holds a live Agent. */
  readonly live: boolean
  /** Whether a retarget is queued and not yet written to the child's own log. */
  readonly queued: boolean
  /** The route its latest request used, or null before any request. */
  readonly current: RouteReading | null
  /** Authorized routes, or null when this session has no policy. */
  readonly allowed: readonly AllowedRouteOption[] | null
}

/** One requested retarget. */
export interface RouteSelection {
  readonly provider: string
  readonly model: string
  /** Omitted means "let the host decide", which clears a route-owned effort. */
  readonly reasoningEffort?: string
}

/** Outcome of one request to the endpoint. */
export type RetargetOutcome<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly code: string; readonly message: string }

/** One non-empty string, or undefined. */
export function textOf(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/**
 * Narrow one raw route reading.
 * @param value - raw `current` value from the host.
 * @returns the reading, or null when the host reported none.
 */
export function routeReadingOf(value: unknown): RouteReading | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const provider = textOf(record.provider)
  const model = textOf(record.model)
  if (provider === undefined || model === undefined) return null
  const reasoningEffort = textOf(record.reasoningEffort)
  return {
    provider,
    model,
    ...reasoningEffort === undefined ? {} : { reasoningEffort },
  }
}

/**
 * Narrow one raw authorized-route list.
 * @param value - raw `allowed` value from the host.
 * @returns the routes, or null when the session has no policy.
 */
export function allowedRoutesOf(value: unknown): readonly AllowedRouteOption[] | null {
  if (!Array.isArray(value)) return null
  const routes: AllowedRouteOption[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue
    const record = entry as Record<string, unknown>
    const provider = textOf(record.provider)
    const model = textOf(record.model)
    if (provider === undefined || model === undefined) continue
    const efforts = Array.isArray(record.efforts)
      ? record.efforts.map(textOf).filter((effort): effort is string => effort !== undefined)
      : undefined
    const defaultEffort = textOf(record.defaultEffort)
    routes.push({
      provider,
      model,
      ...efforts === undefined || efforts.length === 0 ? {} : { efforts },
      ...defaultEffort === undefined ? {} : { defaultEffort },
    })
  }
  return routes
}

/**
 * Narrow one whole state response.
 * @param value - parsed JSON response body.
 * @returns the state, or undefined when the body is not a state.
 */
export function retargetStateOf(value: unknown): RetargetState | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  if (record.ok !== true) return undefined
  return {
    live: record.live === true,
    queued: record.queued === true,
    current: routeReadingOf(record.current),
    allowed: allowedRoutesOf(record.allowed),
  }
}

/** Read one failure body into a stable code and message. */
function failureOf(value: unknown, fallback: string): { code: string; message: string } {
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    const code = textOf(record.code)
    const message = textOf(record.message)
    if (code !== undefined) return { code, message: message ?? code }
  }
  return { code: 'request-failed', message: fallback }
}

/**
 * Read one child's retarget state.
 * @param parentSessionId - session hosting the panel.
 * @param childSessionId - direct child to inspect.
 * @returns the state, or a failure code and message.
 */
export async function readRetargetState(
  parentSessionId: string,
  childSessionId: string,
): Promise<RetargetOutcome<RetargetState>> {
  const query = new URLSearchParams({ parentSessionId, childSessionId })
  let response: Response
  try {
    response = await fetch(ROUTE + '?' + query.toString(), { headers: { accept: 'application/json' } })
  } catch (error: unknown) {
    return { ok: false, code: 'network', message: error instanceof Error ? error.message : String(error) }
  }
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) return { ok: false, ...failureOf(body, `HTTP ${String(response.status)}`) }
  const state = retargetStateOf(body)
  return state === undefined
    ? { ok: false, code: 'bad-response', message: 'unrecognized state response' }
    : { ok: true, value: state }
}

/** One accepted retarget and how it landed. */
export interface RetargetAccepted {
  /** The route the host resolved and accepted. */
  readonly selected: RouteReading
  /**
   * True when the child was not live, so the request is queued and applies on
   * its next activity instead of having already been written to its log.
   */
  readonly queued: boolean
}

/**
 * Ask the host to retarget one child.
 *
 * A child that is not live is accepted and queued rather than refused: the
 * override applies whenever that child next makes a request, and the durable
 * record follows when it is live again. Nothing is resumed either way.
 * @param parentSessionId - session hosting the panel.
 * @param childSessionId - direct child to retarget.
 * @param selection - provider, model, and optional effort.
 * @returns the accepted route and whether it is merely queued, or a failure.
 */
export async function applyRetarget(
  parentSessionId: string,
  childSessionId: string,
  selection: RouteSelection,
): Promise<RetargetOutcome<RetargetAccepted>> {
  let response: Response
  try {
    response = await fetch(ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        parentSessionId,
        childSessionId,
        provider: selection.provider,
        model: selection.model,
        ...selection.reasoningEffort === undefined ? {} : { reasoningEffort: selection.reasoningEffort },
      }),
    })
  } catch (error: unknown) {
    return { ok: false, code: 'network', message: error instanceof Error ? error.message : String(error) }
  }
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) return { ok: false, ...failureOf(body, `HTTP ${String(response.status)}`) }
  const record = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {}
  const selected = routeReadingOf(record.selected)
  return selected === null
    ? { ok: false, code: 'bad-response', message: 'unrecognized selection response' }
    : { ok: true, value: { selected, queued: record.queued === true } }
}

/**
 * Drop a queued retarget.
 *
 * Cancelling does not need the policy or a live child: an intent the user
 * queued must stay removable even if the setting was turned off since.
 * @param parentSessionId - session hosting the panel.
 * @param childSessionId - direct child whose queue entry to drop.
 * @returns fulfillment, or a failure code and message.
 */
export async function cancelRetarget(
  parentSessionId: string,
  childSessionId: string,
): Promise<RetargetOutcome<true>> {
  let response: Response
  try {
    response = await fetch(ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ parentSessionId, childSessionId, action: 'cancel' }),
    })
  } catch (error: unknown) {
    return { ok: false, code: 'network', message: error instanceof Error ? error.message : String(error) }
  }
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) return { ok: false, ...failureOf(body, `HTTP ${String(response.status)}`) }
  return { ok: true, value: true }
}
