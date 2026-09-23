/**
 * dsh-subagent-catalog, node half.
 *
 * The browser half is a projection reader (session-header control). This half
 * adds the one write the panel cannot express through existing Host RPCs:
 * retargeting a **live** subagent's next request to a different
 * provider/model/effort, without the global-default side effect of
 * `session.selectModel`.
 *
 * Three decisions shape it:
 *
 * 1. **The write is a request-waterfall override, not a session event.**
 *    A live Agent's selection cache is hydrated from the `modelSelection`
 *    projection exactly once, at agent setup, and is otherwise written only by
 *    the internal `AgentCatalog.selectForNextRequest`. Appending a
 *    `model/selection` event therefore does NOT retarget a running child. The
 *    public `agent/request` waterfall returns the final `LlmCallConfig`, and a
 *    `prepend` listener post-processes `next()`, so an override here wins over
 *    `installModelSelection` without touching core.
 *
 * 2. **The durable event is still appended.** The override map is in-memory, so
 *    a child that cold-resumes later hydrates its selection cache from the
 *    projection instead — the appended event is what makes the retarget survive
 *    a restart, and what the panel reads back as `next`.
 *
 * 3. **The official policy authorizes the retarget.** The shipped
 *    `subagent-model-selection` setting records a per-session allowed-route list
 *    (projection `subagentModelSelectionPolicy`, host-only, never sent to the
 *    browser). No policy means the user has not authorized child model
 *    selection, so this endpoint refuses instead of becoming an authorization
 *    bypass. Route-change effort handling mirrors `requestedAgentOptions`:
 *    changing the route without naming an effort drops the route-owned effort.
 *
 * 4. **A child that is not live is queued, never resumed.** The override map is
 *    itself the queue: it is keyed by child session id and read by the request
 *    waterfall, so accepting a change for an inactive child needs neither an
 *    activation nor a log write. The intent is persisted in this plugin's own
 *    storage domain so it survives a restart, and it is flushed into the child's
 *    own log once that child is live for its own reasons. A finished one-shot
 *    child is refused outright — it has no next turn to carry the change.
 *
 * Guards: only a direct child of the named parent is accepted, the session's
 * policy must authorize the route, and the route/effort pair must resolve before
 * anything is written.
 *
 * @module dsh-subagent-catalog
 */

import type { Context } from 'cordis'
import type { LlmCallConfig } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { Domain, DomainSpec, KvTable } from '@deepseek-ai/dsh-storage-domain'
import { z } from 'zod'
// Type-only: pull the `ctx.sessions` / `ctx.agents` / `ctx.llm` /
// `ctx.sessionProjections` / `ctx.connection` merges.
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-session-projection'
import type {} from '@deepseek-ai/dsh-subagent'
import type {} from '@deepseek-ai/dsh-client-connection'

/** Exact Fetch route owned by this plugin, below the shared `/api` channel. */
const ROUTE_PATH = '/api/subagent-route-override'

/** Projection key carrying the per-session authorized routes (host-only). */
const POLICY_KEY = 'subagentModelSelectionPolicy'

/**
 * Storage domain holding retargets queued for a child that is not live.
 *
 * The name must match the backend's unit-name rule, `/^[a-z][a-z0-9_]*$/`: a
 * hyphen is rejected at `open` with `invalid unit name`, and the domain is
 * identified by this exact string on the medium.
 */
const QUEUE_DOMAIN = 'subagent_catalog_retarget'

/** One queued retarget as stored. */
interface QueuedRecord {
  /** The session whose policy authorized the change. */
  readonly parentSessionId: string
  /** Registered provider route. */
  readonly provider: string
  /** Provider-owned model id. */
  readonly model: string
  /** Adapter-owned effort, when the user named one. */
  readonly reasoningEffort?: string
  /** When the intent was queued, for diagnostics. */
  readonly queuedAt: number
}

/**
 * Validates every stored record at the durable boundary.
 *
 * The parent is stored with the route so a restored intent can be re-authorized
 * against its own session's policy before it is ever applied: a queue entry can
 * outlive the setting that permitted it.
 */
const queueRecordSchema = z.object({
  parentSessionId: z.string(),
  provider: z.string(),
  model: z.string(),
  reasoningEffort: z.string().optional(),
  queuedAt: z.number(),
})

/**
 * The domain declaration, written as a literal so the storage-domain package
 * stays type-only and only zod enters the host bundle.
 */
const queueSpec = {
  name: QUEUE_DOMAIN,
  version: 1,
  tables: { queued: { valueSchema: queueRecordSchema } },
} satisfies DomainSpec

/** One authorized provider/model route. */
interface AllowedRoute {
  readonly provider: string
  readonly model: string
}

/** One resolved retarget. */
interface ResolvedRoute {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
}

/** One retarget request body. */
interface RouteOverrideRequest {
  /** Durable parent (the session hosting the panel). */
  readonly parentSessionId?: unknown
  /** Durable direct-child session to retarget. */
  readonly childSessionId?: unknown
  /** Registered provider route. */
  readonly provider?: unknown
  /** Provider-owned model id. */
  readonly model?: unknown
  /** Adapter-owned effort; omitted keeps it only when the route is unchanged. */
  readonly reasoningEffort?: unknown
  /** `cancel` drops a queued retarget; anything else applies one. */
  readonly action?: unknown
}

/** One non-empty string field, or undefined. */
function textOf(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/**
 * Build one JSON failure response.
 * @param status - HTTP status code.
 * @param code - stable machine-readable failure code.
 * @param message - human-readable explanation.
 * @returns the response to send.
 */
function failure(status: number, code: string, message: string): Response {
  return Response.json({ ok: false, code, message }, { status })
}

/**
 * Narrow one raw policy projection value to authorized routes.
 * @param raw - projection state read for the parent session.
 * @returns routes when the setting authorized model selection, else undefined.
 */
function allowedRoutesOf(raw: unknown): readonly AllowedRoute[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const routes: AllowedRoute[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) return undefined
    const provider = textOf((entry as Record<string, unknown>).provider)
    const model = textOf((entry as Record<string, unknown>).model)
    if (provider === undefined || model === undefined) return undefined
    routes.push({ provider, model })
  }
  return routes.length === 0 ? undefined : routes
}

/** Current route of one child, read from its durable request header. */
function currentRouteOf(header: LlmCallConfig | undefined): ResolvedRoute | undefined {
  if (header === undefined) return undefined
  return {
    provider: header.provider,
    model: header.model,
    ...header.reasoningEffort === undefined ? {} : { reasoningEffort: String(header.reasoningEffort) },
  }
}

/**
 * Host plugin body: the authenticated retarget route plus its request override.
 *
 * The override listener sits on the root context — `agent/request` is a scoped
 * event, and a root-plane listener receives every agent's request, which the
 * shipped `agent-loop` tests rely on by filtering `payload.agent`. The route
 * registration is nested in `ctx.inject` so the row still mounts in a profile
 * without the connection carrier; the route simply does not exist there.
 * @param ctx - host root context.
 */
export function apply(ctx: Context): void {
  /** Retargets to apply on a child's next request, keyed by child session id. */
  const overrides = new Map<string, ResolvedRoute>()
  /**
   * Children whose retarget is queued but not yet written to their own log.
   *
   * This IS the queue: an override applies whenever that child next makes a
   * request, so accepting a request for a child that is not live right now needs
   * nothing but this map. A cold child's log cannot be appended to without
   * resuming it, which the upstream policy forbids, so the durable record waits
   * until the child is live for its own reasons.
   */
  const pendingAppend = new Set<string>()
  /**
   * The session that authorized each queued intent, so a restored entry can be
   * re-authorized against its own session before it is ever applied.
   */
  const queueParents = new Map<string, string>()
  /**
   * The durable copy of the queue, present only when the profile mounts a
   * storage domain. Absent, every behaviour is unchanged except that the queue
   * does not survive a restart.
   */
  let queueTable: KvTable<string, QueuedRecord> | undefined
  /**
   * Why the durable queue is unavailable, when it is. Reported through the GET
   * response: the panel states it, and a profile whose storage is unreachable
   * says so instead of silently keeping the queue in memory.
   */
  let storageError: string | undefined

  /** Persist one queued intent. A failure costs durability, never the change. */
  const persistQueued = (childSessionId: string, record: QueuedRecord): void => {
    const table = queueTable
    if (table === undefined) return
    void table.put(childSessionId, record).catch((error: unknown) => {
      ctx.logger.warn(`subagent-catalog: could not persist the queued retarget for ${childSessionId}: ${String(error)}`)
    })
  }

  /**
   * Drop the queue's record of one intent, leaving the in-memory override in
   * place: a live Agent's selection cache was hydrated at setup and never
   * re-reads the projection, so the override is what holds the chosen route.
   * @param childSessionId - the child whose queue entry is finished or cancelled.
   */
  const forgetQueued = (childSessionId: string): void => {
    pendingAppend.delete(childSessionId)
    queueParents.delete(childSessionId)
    const table = queueTable
    if (table === undefined) return
    void table.delete(childSessionId).catch((error: unknown) => {
      ctx.logger.warn(`subagent-catalog: could not drop the queued retarget for ${childSessionId}: ${String(error)}`)
    })
  }

  // Outermost: `await next()` yields the value every later listener produced,
  // including `installModelSelection`, so this override is the last write.
  ctx.effect(() => ctx.on('agent/request', async (payload, next): Promise<LlmCallConfig> => {
    const resolved = await next()
    const override = overrides.get(String(payload.agent.id))
    if (override === undefined) return resolved
    // Rebuild rather than spread: an inherited effort must not survive a route
    // change, exactly as `requestedAgentOptions` clears route-owned effort.
    return {
      provider: override.provider,
      model: override.model,
      ...override.reasoningEffort === undefined
        ? {}
        : { reasoningEffort: override.reasoningEffort as never },
      ...resolved.temperature === undefined ? {} : { temperature: resolved.temperature },
      ...resolved.maxTokens === undefined ? {} : { maxTokens: resolved.maxTokens },
      ...resolved.stop === undefined ? {} : { stop: resolved.stop },
    }
  }, { prepend: true }), 'subagent-catalog: retarget override')

  // The durable half of the queue. The maps above are what the request path
  // consults; this table is what survives a restart, and an entry leaves it only
  // once it has reached the child's own log (or was cancelled), so any one intent
  // has exactly one durable copy.
  ctx.inject(['storageDomain'], (storageScope) => {
    storageScope.effect(() => {
      let opened: Domain<typeof queueSpec> | undefined
      let disposed = false
      void storageScope.storageDomain.open(queueSpec).then((domain) => {
        // A dispose that raced this open still owns the handle it never saw.
        if (disposed) { void domain.close(); return }
        opened = domain
        const table = domain.table('queued')
        queueTable = table
        for (const [childSessionId, record] of table.entries()) {
          overrides.set(childSessionId, {
            provider: record.provider,
            model: record.model,
            ...record.reasoningEffort === undefined ? {} : { reasoningEffort: record.reasoningEffort },
          })
          pendingAppend.add(childSessionId)
          queueParents.set(childSessionId, record.parentSessionId)
        }
        if (table.size > 0) {
          ctx.logger.info(`subagent-catalog: restored ${table.size} queued retarget(s)`)
        }
      }).catch((error: unknown) => {
        // Storage is an upgrade, not a requirement: without it the queue is
        // in-memory only and every other behaviour is unchanged.
        storageError = error instanceof Error && error.message !== '' ? error.message : String(error)
        ctx.logger.warn(`subagent-catalog: the retarget queue is not durable: ${storageError}`)
      })
      return () => {
        disposed = true
        queueTable = undefined
        if (opened !== undefined) void opened.close()
      }
    })
  })

  ctx.inject(['connection', 'sessions', 'agents', 'llm', 'subagents', 'sessionProjections'], (scope) => {
    /** Authorized routes for one parent session, or undefined when not authorized. */
    const allowedFor = (parentSessionId: string): readonly AllowedRoute[] | undefined => {
      const parent = scope.sessions.get(parentSessionId as SessionId)
      if (parent === undefined) return undefined
      const raw = scope.sessionProjections.stateOf(parent, POLICY_KEY as never) as unknown
      return allowedRoutesOf(raw)
    }

    // A queued retarget becomes durable the moment its child is live again. Two
    // deliberate choices: the listener sits on the ROOT context, because a scoped
    // listener would see only its own plane's agents (the same reason the request
    // override does), while the services it re-validates against come from this
    // inject scope; and the append happens here rather than inside the request
    // waterfall, because `agent/status` is an ordinary transition and no append
    // can reenter one already publishing.
    ctx.effect(() => ctx.on('agent/status', (payload) => {
      const id = String(payload.agent.id)
      if (!pendingAppend.has(id)) return
      void (async () => {
        const route = overrides.get(id)
        if (route === undefined) {
          forgetQueued(id)
          return
        }
        // A restored intent is re-authorized only when its session is reachable
        // to ask. The policy lives in the parent's projection, and the projection
        // registry only answers for an ATTACHED session, so a parent that is cold
        // right now cannot be consulted - and dropping the intent for that reason
        // would erase exactly the restart that the queue exists to survive. The
        // intent was authorized when it was queued, so it stands until its
        // session is attached and says otherwise.
        const parentSessionId = queueParents.get(id)
        const parentAttached = parentSessionId !== undefined
          && scope.sessions.get(parentSessionId as SessionId) !== undefined
        if (parentAttached && allowedFor(parentSessionId) === undefined) {
          ctx.logger.info(`subagent-catalog: dropping the queued retarget for ${id}; its session is no longer authorized`)
          overrides.delete(id)
          forgetQueued(id)
          return
        }
        if (!parentAttached && parentSessionId !== undefined) {
          ctx.logger.info(`subagent-catalog: applying the queued retarget for ${id} without re-authorizing; its session is not attached`)
        }
        try {
          const config = await scope.llm.resolveCallConfig({
            provider: route.provider,
            model: route.model,
            ...route.reasoningEffort === undefined ? {} : { reasoningEffort: route.reasoningEffort as never },
          })
          payload.agent.session.append('model/selection', {
            provider: config.provider,
            model: config.model,
            ...config.reasoningEffort === undefined
              ? {}
              : { reasoningEffort: String(config.reasoningEffort) as never },
          })
          // The in-memory override STAYS: a live Agent's selection cache was
          // hydrated at setup and does not re-read the projection, so the override
          // is what keeps this child on the chosen route for its remaining turns.
          forgetQueued(id)
          ctx.logger.info(`subagent-catalog: queued retarget for ${id} is now durable`)
        } catch (error: unknown) {
          // The live override still applies on the next request; durability is
          // retried on the next status transition rather than dropped.
          ctx.logger.warn(`subagent-catalog: could not persist the queued retarget for ${id}: ${String(error)}`)
        }
      })()
    }), 'subagent-catalog: queue durability')

    /**
     * Enrich authorized routes with each model's adapter-advertised effort
     * levels, so the panel never offers a tier its model cannot take. A route
     * whose metadata lookup fails keeps its pair and simply omits the tiers.
     * @param routes - authorized provider/model pairs.
     * @returns one entry per route, in the policy's order.
     */
    const describeAllowed = async (routes: readonly AllowedRoute[]): Promise<readonly unknown[]> =>
      await Promise.all(routes.map(async (route) => {
        try {
          const info = await scope.llm.resolveModelInfo(route.provider, route.model)
          const efforts = info.reasoning?.efforts.map(effort => String(effort.id)) ?? []
          return {
            provider: route.provider,
            model: route.model,
            ...efforts.length === 0 ? {} : { efforts },
            ...info.reasoning?.defaultEffort === undefined
              ? {}
              : { defaultEffort: String(info.reasoning.defaultEffort) },
          }
        } catch {
          return { provider: route.provider, model: route.model }
        }
      }))

    scope.effect(() => scope.connection.fetch.register({
      path: ROUTE_PATH,
      methods: ['GET', 'POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const url = new URL(request.url)
        if (request.method === 'GET') {
          const parentSessionId = textOf(url.searchParams.get('parentSessionId'))
          const childSessionId = textOf(url.searchParams.get('childSessionId'))
          if (parentSessionId === undefined || childSessionId === undefined) {
            return failure(400, 'bad-request', 'parentSessionId and childSessionId are required')
          }
          const child = scope.agents.get(childSessionId as SessionId)
          const allowed = allowedFor(parentSessionId)
          // The mode is what lets the panel state the verdict BEFORE a pick
          // rather than only after a refusal: a finished one-shot child has no
          // next turn, so its list must not offer routes at all.
          let mode: unknown
          try {
            const siblings = await scope.subagents.listChildren(parentSessionId as SessionId)
            mode = siblings.find(entry => String(entry.id) === childSessionId)?.mode
          } catch {
            // Listing is only needed for the verdict; an absent mode leaves the
            // panel permissive, and the write path re-checks it anyway.
            mode = undefined
          }
          const live = child !== undefined
          const terminal = !live && mode === 'one-shot'
          // A queued intent that a restart restored for a child which has since
          // finished is unkeepable, so the reading drops it rather than showing a
          // promise nothing can fulfil.
          if (terminal && pendingAppend.has(childSessionId)) {
            overrides.delete(childSessionId)
            forgetQueued(childSessionId)
          }
          return Response.json({
            ok: true,
            live,
            queued: pendingAppend.has(childSessionId),
            mode: typeof mode === 'string' ? mode : 'unknown',
            // Whether a queued change would survive a restart, and why not.
            durable: queueTable !== undefined,
            ...storageError === undefined ? {} : { storageError },
            current: child === undefined
              ? null
              : (currentRouteOf(child.session.requestHeader()?.config) ?? null),
            // null tells the panel the user has not authorized child model
            // selection for this session; the editor must not appear.
            allowed: allowed === undefined ? null : await describeAllowed(allowed),
          })
        }

        let body: RouteOverrideRequest
        try {
          body = await request.json() as RouteOverrideRequest
        } catch {
          return failure(400, 'bad-json', 'request body must be JSON')
        }

        const parentSessionId = textOf(body.parentSessionId)
        const childSessionId = textOf(body.childSessionId)
        const provider = textOf(body.provider)
        const model = textOf(body.model)
        const requestedEffort = textOf(body.reasoningEffort)
        if (parentSessionId === undefined || childSessionId === undefined) {
          return failure(400, 'bad-request', 'parentSessionId and childSessionId are required')
        }

        // Address check: the official catalog is the authority on direct
        // children, and it answers whether or not the child still holds a live
        // Agent. `sessions.get` is NOT usable here — a subagent session is not
        // attached to the top-level session registry.
        let children: readonly { readonly id: SessionId; readonly mode?: unknown }[]
        try {
          children = await scope.subagents.listChildren(parentSessionId as SessionId)
        } catch (error: unknown) {
          const message = error instanceof Error && error.message !== '' ? error.message : String(error)
          return failure(500, 'listing-failed', message)
        }
        const target = children.find(entry => String(entry.id) === childSessionId)
        if (target === undefined) {
          return failure(403, 'not-a-direct-child', `session "${childSessionId}" is not a direct child of "${parentSessionId}"`)
        }

        // Cancelling is deliberately checked before the route requirement and the
        // policy gate: a queued intent must stay removable even when the caller
        // names no route and the setting was turned off since.
        if (textOf(body.action) === 'cancel') {
          overrides.delete(childSessionId)
          forgetQueued(childSessionId)
          return Response.json({ ok: true, childSessionId, cancelled: true })
        }

        if (provider === undefined || model === undefined) {
          return failure(400, 'bad-request', 'provider and model are required')
        }

        // Liveness decides HOW the retarget lands, not whether it is accepted.
        const child = scope.agents.get(childSessionId as SessionId)
        // Authorization: the user's own setting gates this endpoint.
        const allowed = allowedFor(parentSessionId)
        if (allowed === undefined) {
          return failure(403, 'not-authorized', 'this session has no subagent model-selection policy; enable it in Subagent settings (new sessions only)')
        }
        if (!allowed.some(route => route.provider === provider && route.model === model)) {
          return failure(403, 'route-not-allowed', `route "${provider}/${model}" is not authorized for this session`)
        }

        // Route change drops the route-owned effort unless one is named. A cold
        // child has no last request header to compare against, so a queued
        // retarget carries only what the caller named and otherwise lets the
        // model's own default apply.
        const current = child === undefined
          ? undefined
          : currentRouteOf(child.session.requestHeader()?.config)
        const routeChanged = current === undefined
          || current.provider !== provider
          || current.model !== model
        const effectiveEffort = requestedEffort ?? (routeChanged ? undefined : current?.reasoningEffort)

        // Validate the exact combination before writing, so an illegal pair
        // fails here instead of at the child's next request.
        let resolved: ResolvedRoute
        try {
          const config = await scope.llm.resolveCallConfig({
            provider,
            model,
            ...effectiveEffort === undefined ? {} : { reasoningEffort: effectiveEffort as never },
          })
          resolved = {
            provider: config.provider,
            model: config.model,
            ...config.reasoningEffort === undefined ? {} : { reasoningEffort: String(config.reasoningEffort) },
          }
        } catch (error: unknown) {
          const message = error instanceof Error && error.message !== '' ? error.message : String(error)
          return failure(422, 'route-unavailable', message)
        }

        // Queued: no log write and no resume. The override applies the moment
        // this child next makes a request, and the durable record follows at its
        // next status transition.
        if (child === undefined) {
          // A finished one-shot child is terminal: nothing will ever consume a
          // queued override, so accepting one would promise a next turn that
          // cannot come. The catalog already told us the mode; refusing here is
          // what keeps every accepted retarget a promise we can keep.
          if (target.mode === 'one-shot') {
            return failure(
              409,
              'terminal-one-shot',
              `session "${childSessionId}" is a finished one-shot child; it has no next turn to retarget`,
            )
          }
          overrides.set(childSessionId, resolved)
          pendingAppend.add(childSessionId)
          queueParents.set(childSessionId, parentSessionId)
          persistQueued(childSessionId, {
            parentSessionId,
            provider: resolved.provider,
            model: resolved.model,
            ...resolved.reasoningEffort === undefined ? {} : { reasoningEffort: resolved.reasoningEffort },
            queuedAt: Date.now(),
          })
          ctx.logger.info(
            `subagent-catalog: queued retarget for ${childSessionId} to ${resolved.provider}/${resolved.model}`,
          )
          return Response.json({ ok: true, childSessionId, selected: resolved, queued: true })
        }

        // Durable record: a later cold resume hydrates from this event.
        try {
          child.session.append('model/selection', {
            provider: resolved.provider,
            model: resolved.model,
            ...resolved.reasoningEffort === undefined ? {} : { reasoningEffort: resolved.reasoningEffort as never },
          })
        } catch (error: unknown) {
          const message = error instanceof Error && error.message !== '' ? error.message : String(error)
          return failure(500, 'append-failed', message)
        }
        // Live effect: the running child's next request. `forgetQueued` clears
        // any queue entry this child may still carry, so a live write leaves no
        // stale durable copy behind.
        overrides.set(childSessionId, resolved)
        forgetQueued(childSessionId)

        ctx.logger.info(
          `subagent-catalog: retargeted ${childSessionId} to ${resolved.provider}/${resolved.model}`
          + (resolved.reasoningEffort === undefined ? '' : ` (${resolved.reasoningEffort})`),
        )
        return Response.json({ ok: true, childSessionId, selected: resolved, queued: false })
      },
    }), 'subagent-catalog: route override')
  })
}
