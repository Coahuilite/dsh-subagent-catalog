//#region src/index.ts
/** Exact Fetch route owned by this plugin, below the shared `/api` channel. */
const ROUTE_PATH = "/api/subagent-route-override";
/** Projection key carrying the per-session authorized routes (host-only). */
const POLICY_KEY = "subagentModelSelectionPolicy";
/** One non-empty string field, or undefined. */
function textOf(value) {
	return typeof value === "string" && value !== "" ? value : void 0;
}
/**
* Build one JSON failure response.
* @param status - HTTP status code.
* @param code - stable machine-readable failure code.
* @param message - human-readable explanation.
* @returns the response to send.
*/
function failure(status, code, message) {
	return Response.json({
		ok: false,
		code,
		message
	}, { status });
}
/**
* Narrow one raw policy projection value to authorized routes.
* @param raw - projection state read for the parent session.
* @returns routes when the setting authorized model selection, else undefined.
*/
function allowedRoutesOf(raw) {
	if (!Array.isArray(raw)) return void 0;
	const routes = [];
	for (const entry of raw) {
		if (typeof entry !== "object" || entry === null) return void 0;
		const provider = textOf(entry.provider);
		const model = textOf(entry.model);
		if (provider === void 0 || model === void 0) return void 0;
		routes.push({
			provider,
			model
		});
	}
	return routes.length === 0 ? void 0 : routes;
}
/** Current route of one child, read from its durable request header. */
function currentRouteOf(header) {
	if (header === void 0) return void 0;
	return {
		provider: header.provider,
		model: header.model,
		...header.reasoningEffort === void 0 ? {} : { reasoningEffort: String(header.reasoningEffort) }
	};
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
function apply(ctx) {
	/** Live retargets, keyed by child session id. */
	const overrides = /* @__PURE__ */ new Map();
	ctx.effect(() => ctx.on("agent/request", async (payload, next) => {
		const resolved = await next();
		const override = overrides.get(String(payload.agent.id));
		if (override === void 0) return resolved;
		return {
			provider: override.provider,
			model: override.model,
			...override.reasoningEffort === void 0 ? {} : { reasoningEffort: override.reasoningEffort },
			...resolved.temperature === void 0 ? {} : { temperature: resolved.temperature },
			...resolved.maxTokens === void 0 ? {} : { maxTokens: resolved.maxTokens },
			...resolved.stop === void 0 ? {} : { stop: resolved.stop }
		};
	}, { prepend: true }), "subagent-catalog: retarget override");
	ctx.inject([
		"connection",
		"sessions",
		"agents",
		"llm",
		"subagents",
		"sessionProjections"
	], (scope) => {
		/** Authorized routes for one parent session, or undefined when not authorized. */
		const allowedFor = (parentSessionId) => {
			const parent = scope.sessions.get(parentSessionId);
			if (parent === void 0) return void 0;
			return allowedRoutesOf(scope.sessionProjections.stateOf(parent, POLICY_KEY));
		};
		scope.effect(() => scope.connection.fetch.register({
			path: ROUTE_PATH,
			methods: ["GET", "POST"],
			requestBody: "buffered",
			fetch: async (request) => {
				const url = new URL(request.url);
				if (request.method === "GET") {
					const parentSessionId = textOf(url.searchParams.get("parentSessionId"));
					const childSessionId = textOf(url.searchParams.get("childSessionId"));
					if (parentSessionId === void 0 || childSessionId === void 0) return failure(400, "bad-request", "parentSessionId and childSessionId are required");
					const child = scope.agents.get(childSessionId);
					return Response.json({
						ok: true,
						live: child !== void 0,
						current: child === void 0 ? null : currentRouteOf(child.session.requestHeader()?.config) ?? null,
						allowed: allowedFor(parentSessionId) ?? null
					});
				}
				let body;
				try {
					body = await request.json();
				} catch {
					return failure(400, "bad-json", "request body must be JSON");
				}
				const parentSessionId = textOf(body.parentSessionId);
				const childSessionId = textOf(body.childSessionId);
				const provider = textOf(body.provider);
				const model = textOf(body.model);
				const requestedEffort = textOf(body.reasoningEffort);
				if (parentSessionId === void 0 || childSessionId === void 0) return failure(400, "bad-request", "parentSessionId and childSessionId are required");
				if (provider === void 0 || model === void 0) return failure(400, "bad-request", "provider and model are required");
				let children;
				try {
					children = await scope.subagents.listChildren(parentSessionId);
				} catch (error) {
					return failure(500, "listing-failed", error instanceof Error && error.message !== "" ? error.message : String(error));
				}
				if (!children.some((entry) => String(entry.id) === childSessionId)) return failure(403, "not-a-direct-child", `session "${childSessionId}" is not a direct child of "${parentSessionId}"`);
				const child = scope.agents.get(childSessionId);
				if (child === void 0) return failure(409, "child-not-live", `session "${childSessionId}" has no live agent; retargeting a cold child is refused`);
				const allowed = allowedFor(parentSessionId);
				if (allowed === void 0) return failure(403, "not-authorized", "this session has no subagent model-selection policy; enable it in Subagent settings (new sessions only)");
				if (!allowed.some((route) => route.provider === provider && route.model === model)) return failure(403, "route-not-allowed", `route "${provider}/${model}" is not authorized for this session`);
				const current = currentRouteOf(child.session.requestHeader()?.config);
				const routeChanged = current === void 0 || current.provider !== provider || current.model !== model;
				const effectiveEffort = requestedEffort ?? (routeChanged ? void 0 : current?.reasoningEffort);
				let resolved;
				try {
					const config = await scope.llm.resolveCallConfig({
						provider,
						model,
						...effectiveEffort === void 0 ? {} : { reasoningEffort: effectiveEffort }
					});
					resolved = {
						provider: config.provider,
						model: config.model,
						...config.reasoningEffort === void 0 ? {} : { reasoningEffort: String(config.reasoningEffort) }
					};
				} catch (error) {
					return failure(422, "route-unavailable", error instanceof Error && error.message !== "" ? error.message : String(error));
				}
				try {
					child.session.append("model/selection", {
						provider: resolved.provider,
						model: resolved.model,
						...resolved.reasoningEffort === void 0 ? {} : { reasoningEffort: resolved.reasoningEffort }
					});
				} catch (error) {
					return failure(500, "append-failed", error instanceof Error && error.message !== "" ? error.message : String(error));
				}
				overrides.set(childSessionId, resolved);
				ctx.logger.info(`subagent-catalog: retargeted ${childSessionId} to ${resolved.provider}/${resolved.model}` + (resolved.reasoningEffort === void 0 ? "" : ` (${resolved.reasoningEffort})`));
				return Response.json({
					ok: true,
					childSessionId,
					selected: resolved,
					allowed
				});
			}
		}), "subagent-catalog: route override");
	});
}
//#endregion
export { apply };
