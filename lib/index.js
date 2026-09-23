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
	/** Retargets to apply on a child's next request, keyed by child session id. */
	const overrides = /* @__PURE__ */ new Map();
	/**
	* Children whose retarget is queued but not yet written to their own log.
	*
	* This IS the queue: an override applies whenever that child next makes a
	* request, so accepting a request for a child that is not live right now needs
	* nothing but this map. A cold child's log cannot be appended to without
	* resuming it, which the upstream policy forbids, so the durable record waits
	* until the child is live for its own reasons.
	*/
	const pendingAppend = /* @__PURE__ */ new Set();
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
	ctx.effect(() => ctx.on("agent/status", (payload) => {
		const id = String(payload.agent.id);
		if (!pendingAppend.has(id)) return;
		const route = overrides.get(id);
		if (route === void 0) {
			pendingAppend.delete(id);
			return;
		}
		try {
			payload.agent.session.append("model/selection", {
				provider: route.provider,
				model: route.model,
				...route.reasoningEffort === void 0 ? {} : { reasoningEffort: route.reasoningEffort }
			});
			pendingAppend.delete(id);
			ctx.logger.info(`subagent-catalog: queued retarget for ${id} is now durable`);
		} catch (error) {
			ctx.logger.warn(`subagent-catalog: could not persist queued retarget for ${id}: ${String(error)}`);
		}
	}), "subagent-catalog: queue durability");
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
		/**
		* Enrich authorized routes with each model's adapter-advertised effort
		* levels, so the panel never offers a tier its model cannot take. A route
		* whose metadata lookup fails keeps its pair and simply omits the tiers.
		* @param routes - authorized provider/model pairs.
		* @returns one entry per route, in the policy's order.
		*/
		const describeAllowed = async (routes) => await Promise.all(routes.map(async (route) => {
			try {
				const info = await scope.llm.resolveModelInfo(route.provider, route.model);
				const efforts = info.reasoning?.efforts.map((effort) => String(effort.id)) ?? [];
				return {
					provider: route.provider,
					model: route.model,
					...efforts.length === 0 ? {} : { efforts },
					...info.reasoning?.defaultEffort === void 0 ? {} : { defaultEffort: String(info.reasoning.defaultEffort) }
				};
			} catch {
				return {
					provider: route.provider,
					model: route.model
				};
			}
		}));
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
					const allowed = allowedFor(parentSessionId);
					return Response.json({
						ok: true,
						live: child !== void 0,
						queued: pendingAppend.has(childSessionId),
						current: child === void 0 ? null : currentRouteOf(child.session.requestHeader()?.config) ?? null,
						allowed: allowed === void 0 ? null : await describeAllowed(allowed)
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
				let children;
				try {
					children = await scope.subagents.listChildren(parentSessionId);
				} catch (error) {
					return failure(500, "listing-failed", error instanceof Error && error.message !== "" ? error.message : String(error));
				}
				const target = children.find((entry) => String(entry.id) === childSessionId);
				if (target === void 0) return failure(403, "not-a-direct-child", `session "${childSessionId}" is not a direct child of "${parentSessionId}"`);
				if (textOf(body.action) === "cancel") {
					overrides.delete(childSessionId);
					pendingAppend.delete(childSessionId);
					return Response.json({
						ok: true,
						childSessionId,
						cancelled: true
					});
				}
				if (provider === void 0 || model === void 0) return failure(400, "bad-request", "provider and model are required");
				const child = scope.agents.get(childSessionId);
				const allowed = allowedFor(parentSessionId);
				if (allowed === void 0) return failure(403, "not-authorized", "this session has no subagent model-selection policy; enable it in Subagent settings (new sessions only)");
				if (!allowed.some((route) => route.provider === provider && route.model === model)) return failure(403, "route-not-allowed", `route "${provider}/${model}" is not authorized for this session`);
				const current = child === void 0 ? void 0 : currentRouteOf(child.session.requestHeader()?.config);
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
				if (child === void 0) {
					if (target.mode === "one-shot") return failure(409, "terminal-one-shot", `session "${childSessionId}" is a finished one-shot child; it has no next turn to retarget`);
					overrides.set(childSessionId, resolved);
					pendingAppend.add(childSessionId);
					ctx.logger.info(`subagent-catalog: queued retarget for ${childSessionId} to ${resolved.provider}/${resolved.model}`);
					return Response.json({
						ok: true,
						childSessionId,
						selected: resolved,
						queued: true
					});
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
				pendingAppend.delete(childSessionId);
				ctx.logger.info(`subagent-catalog: retargeted ${childSessionId} to ${resolved.provider}/${resolved.model}` + (resolved.reasoningEffort === void 0 ? "" : ` (${resolved.reasoningEffort})`));
				return Response.json({
					ok: true,
					childSessionId,
					selected: resolved,
					queued: false
				});
			}
		}), "subagent-catalog: route override");
	});
}
//#endregion
export { apply };
