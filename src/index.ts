/**
 * dsh-subagent-catalog, node half.
 *
 * The browser half is a pure projection reader (session-header control). This
 * half adds the ONE write the panel cannot express through existing Host RPCs:
 * retargeting a **live** subagent's next request to a different provider/model/
 * effort.
 *
 * Why a dedicated write exists at all: `session.selectModel` is the only
 * browser-reachable primitive that writes a model selection, and it also calls
 * `agentDefaultModel.saveSelection`, which rewrites the global default for every
 * future session. Retargeting one child must not do that.
 *
 * The write itself is one durable event on the child's own session log
 * (`model/selection`). The `modelSelection` projection folds it into `pending`,
 * the child's next request header consumes it, and the live Agent's selection
 * cache picks it up through `selectionFor` — the same path `selectModel` uses,
 * minus the global default write.
 *
 * Deliberately narrow, matching the upstream policy that addressed subagent
 * sessions expose no independent model-retargeting contract: only a **live**
 * direct child of the named parent is accepted. A cold child is refused instead
 * of resumed, because writing to it would activate persisted child history
 * outside the direct-parent continuation seam.
 *
 * @module dsh-subagent-catalog
 */

import type { Context } from 'cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only: pull the `ctx.sessions` / `ctx.agents` / `ctx.llm` / `ctx.connection` merges.
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-client-connection'

/** Exact Fetch route owned by this plugin, below the shared `/api` channel. */
const ROUTE_PATH = '/api/subagent-route-override'

/** One accepted retarget request. */
interface RouteOverrideRequest {
  /** Durable parent (the session hosting the panel). */
  readonly parentSessionId?: unknown
  /** Durable direct-child session to retarget. */
  readonly childSessionId?: unknown
  /** Registered provider route. */
  readonly provider?: unknown
  /** Provider-owned model id. */
  readonly model?: unknown
  /** Adapter-owned effort, or omitted to use the selected model's default tier. */
  readonly reasoningEffort?: unknown
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
 * Host plugin body: register the authenticated retarget route.
 *
 * The registration is nested in `ctx.inject` so the row still mounts in a
 * profile without the connection carrier (the browser half is served from the
 * package either way); the route simply does not exist there.
 * @param ctx - host root context.
 */
export function apply(ctx: Context): void {
  ctx.inject(['connection', 'sessions', 'agents', 'llm'], (scope) => {
    scope.effect(() => scope.connection.fetch.register({
      path: ROUTE_PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
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
        const reasoningEffort = textOf(body.reasoningEffort)
        if (parentSessionId === undefined || childSessionId === undefined) {
          return failure(400, 'bad-request', 'parentSessionId and childSessionId are required')
        }
        if (provider === undefined || model === undefined) {
          return failure(400, 'bad-request', 'provider and model are required')
        }

        const child = scope.sessions.get(childSessionId as SessionId)
        if (child === undefined) {
          return failure(404, 'session-not-found', `no session "${childSessionId}"`)
        }
        // Address check: exactly this parent, exactly one level down.
        if (child.header.origin !== 'subagent' || String(child.header.parentSession ?? '') !== parentSessionId) {
          return failure(403, 'not-a-direct-child', `session "${childSessionId}" is not a direct child of "${parentSessionId}"`)
        }
        // Liveness check: never resume/activate a cold child to retarget it.
        if (scope.agents.get(childSessionId as SessionId) === undefined) {
          return failure(409, 'child-not-live', `session "${childSessionId}" has no live agent; retargeting a cold child is refused`)
        }

        // Validate the exact route/effort combination before writing, so an
        // illegal pair fails here instead of at the child's next request.
        let resolved: { provider: string; model: string; reasoningEffort?: string }
        try {
          const config = await scope.llm.resolveCallConfig({
            provider,
            model,
            ...reasoningEffort === undefined ? {} : { reasoningEffort: reasoningEffort as never },
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

        try {
          child.append('model/selection', {
            provider: resolved.provider,
            model: resolved.model,
            ...resolved.reasoningEffort === undefined ? {} : { reasoningEffort: resolved.reasoningEffort as never },
          })
        } catch (error: unknown) {
          const message = error instanceof Error && error.message !== '' ? error.message : String(error)
          return failure(500, 'append-failed', message)
        }

        ctx.logger.info(
          `subagent-catalog: retargeted ${childSessionId} to ${resolved.provider}/${resolved.model}`
          + (resolved.reasoningEffort === undefined ? '' : ` (${resolved.reasoningEffort})`),
        )
        return Response.json({ ok: true, childSessionId, selected: resolved })
      },
    }), 'subagent-catalog: route override')
  })
}
