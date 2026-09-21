window.__ModuleLoader__.load({
	id: "dsh-subagent-catalog",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_dom = require("react-dom");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/** `subagent-catalog` namespace dictionaries. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "subagent-catalog";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"button.aria": "子代理会话，{count}",
			"menu.aria": "子代理会话",
			"count.total.one": "{count} 个子代理",
			"count.total.other": "{count} 个子代理",
			"count.running.one": "{count} 个子代理，正在运行",
			"count.running.other": "{count} 个子代理，正在运行",
			"mode.oneShot": "一次性",
			"mode.continuable": "可继续",
			"activity.running": "正在运行",
			"activity.inactive": "当前未运行",
			"model.value": "模型 {route}",
			"reasoning.value": "推理 {effort}",
			"reasoning.default": "推理默认",
			"selection.selected": "已选",
			"selection.next": "下次",
			"detail.known": "{model} · {reasoning}",
			"detail.selected": "{status} · {model} · {reasoning}",
			"detail.unknown": "模型未记录 · 推理未知"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"button.aria": "Subagent sessions, {count}",
			"menu.aria": "Subagent sessions",
			"count.total.one": "{count} subagent",
			"count.total.other": "{count} subagents",
			"count.running.one": "{count} subagent, running",
			"count.running.other": "{count} subagents, running",
			"mode.oneShot": "one-shot",
			"mode.continuable": "continuable",
			"activity.running": "running",
			"activity.inactive": "not running",
			"model.value": "Model {route}",
			"reasoning.value": "Reasoning {effort}",
			"reasoning.default": "Reasoning default",
			"selection.selected": "Selected",
			"selection.next": "Next",
			"detail.known": "{model} · {reasoning}",
			"detail.selected": "{status} · {model} · {reasoning}",
			"detail.unknown": "Model not recorded · Reasoning unknown"
		};
		//#endregion
		//#region src/client/styles.ts
		/**
		* The control's stylesheet, owned by the plugin rather than by a bundler CSS
		* pipeline so the artifact stays a plain JavaScript bundle.
		*
		* Information is separated by structure, not by colour alone: every row is a
		* title line carrying a state mark and the activity badge, over a badge line
		* for the model facts. The panel and its rows reuse the shared menu recipe
		* (surface, elevation, radii, hover and focus fills) so the control reads as
		* part of the application rather than beside it.
		*
		* @module dsh-subagent-catalog/styles
		*/
		/** Stylesheet owner tag; also the selector the removal path matches. */
		const STYLE_TAG = "dsh-subagent-catalog";
		const STYLES = [
			".dsc-trigger{font:inherit;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}",
			".dsc-trigger:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsc-trigger[data-open=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dsc-trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}",
			".dsc-triggerText{font-size:12px;line-height:18px;white-space:nowrap}",
			".dsc-menu{box-sizing:border-box;position:fixed;z-index:1100;width:360px;max-height:min(60vh,480px);overflow:auto;display:flex;flex-direction:column;gap:0;padding:4px;border:0;border-radius:20px;background:var(--dsw-specific-menu);box-shadow:var(--dsw-elevation-prominent);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}",
			".dsc-row{font:inherit;box-sizing:border-box;position:relative;display:flex;flex-direction:column;gap:4px;width:100%;padding:8px 10px;border:0;border-radius:10px;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer}",
			".dsc-row:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsc-row:focus-visible{background:var(--dsw-alias-interactive-bg-hover);outline:none}",
			".dsc-row[data-depth=\"2\"]{padding-left:22px}",
			".dsc-row[data-depth=\"3\"]{padding-left:34px}",
			".dsc-row[data-depth=\"4\"]{padding-left:46px}",
			".dsc-row[data-depth=\"2\"]::before,.dsc-row[data-depth=\"3\"]::before,.dsc-row[data-depth=\"4\"]::before{content:\"\";position:absolute;top:8px;bottom:8px;width:1px;background:var(--dsw-alias-border-l2)}",
			".dsc-row[data-depth=\"2\"]::before{left:16px}",
			".dsc-row[data-depth=\"3\"]::before{left:28px}",
			".dsc-row[data-depth=\"4\"]::before{left:40px}",
			".dsc-head{display:flex;align-items:center;gap:6px;min-width:0}",
			".dsc-label{flex:1;min-width:0;overflow:hidden;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px;font-weight:400;text-overflow:ellipsis;white-space:nowrap}",
			".dsc-row[data-running=true] .dsc-label{font-weight:600}",
			".dsc-meta{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding-left:14px}"
		].join("");
		/**
		* Install the stylesheet once and return its removal.
		* @returns the disposer removing exactly the tag this call installed.
		*/
		function installStyles() {
			if (typeof document === "undefined") return () => {};
			if (document.querySelector("style[data-plugin=\"dsh-subagent-catalog\"]") !== null) return () => {};
			const tag = document.createElement("style");
			tag.dataset.plugin = STYLE_TAG;
			tag.textContent = STYLES;
			document.head.appendChild(tag);
			return () => {
				tag.remove();
			};
		}
		//#endregion
		//#region src/client/rows.ts
		/** How deep the walk descends; a cycle guard, not a product limit. */
		const MAX_DEPTH = 8;
		/** Whether two routes name the same model and effort. */
		function sameRoute(left, right) {
			return left.provider === right.provider && left.model === right.model && left.reasoningEffort === right.reasoningEffort;
		}
		/**
		* Read one session summary's durable model selection.
		* @param summary - the child's client summary.
		* @returns the route the row should show plus its state, or undefined without a record.
		*/
		function modelOf(summary) {
			const selection = summary.projectionValues?.modelSelection;
			const lastUsed = selection?.lastUsed ?? null;
			const next = selection?.next ?? null;
			const shown = next ?? lastUsed;
			if (shown === null) return void 0;
			const route = {
				provider: shown.provider,
				model: shown.model,
				...shown.reasoningEffort === void 0 ? {} : { reasoningEffort: shown.reasoningEffort }
			};
			if (next === null) return {
				...route,
				state: "used"
			};
			if (lastUsed === null) return {
				...route,
				state: "selected"
			};
			return {
				...route,
				state: sameRoute(lastUsed, next) ? "used" : "next"
			};
		}
		/**
		* Index every subagent summary by its direct parent.
		* @param summaries - the client session list.
		* @returns children keyed by parent id.
		*/
		function indexChildren(summaries) {
			const children = /* @__PURE__ */ new Map();
			for (const summary of Object.values(summaries)) {
				if (summary.origin !== "subagent" || summary.parentId === void 0) continue;
				const bucket = children.get(summary.parentId);
				if (bucket === void 0) children.set(summary.parentId, [summary]);
				else bucket.push(summary);
			}
			return children;
		}
		/**
		* Order one sibling group: running first, then by session id. The id tiebreak
		* keeps the order identical between refreshes, so only an activity change moves
		* a row.
		* @param summaries - one parent's children.
		* @returns the siblings in display order.
		*/
		function orderSiblings(summaries) {
			return [...summaries].sort((left, right) => {
				if (left.running !== right.running) return left.running ? -1 : 1;
				return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
			});
		}
		/**
		* Collect every subagent beneath one session as a pre-order walk: a parent is
		* always followed by its own children, and each sibling group is ordered
		* running-first. Depth therefore tracks the indentation exactly.
		* @param summaries - the client session list.
		* @param rootSessionId - the session whose header hosts the control.
		* @returns the descendant rows in display order.
		*/
		function buildSubagentRows(summaries, rootSessionId) {
			const children = indexChildren(summaries);
			const rows = [];
			const seen = /* @__PURE__ */ new Set([rootSessionId]);
			const visit = (parentId, depth) => {
				if (depth > MAX_DEPTH) return;
				for (const summary of orderSiblings(children.get(parentId) ?? [])) {
					if (seen.has(summary.id)) continue;
					seen.add(summary.id);
					const identity = summary.projectionValues?.subagent ?? void 0;
					const model = modelOf(summary);
					rows.push({
						id: summary.id,
						parentId,
						depth,
						label: identity?.label ?? summary.displayTitle,
						mode: identity?.mode ?? "one-shot",
						running: summary.running,
						...model === void 0 ? {} : { model }
					});
					visit(summary.id, depth + 1);
				}
			};
			visit(rootSessionId, 1);
			return rows;
		}
		/**
		* Split one row's model information into separately renderable parts.
		* @param row - the row to describe.
		* @param t - translate function bound to this plugin's dictionary.
		* @returns the parts; `known: false` carries no model text.
		*/
		function rowModelParts(row, t) {
			const model = row.model;
			if (model === void 0) return { known: false };
			return {
				known: true,
				...model.state === "used" ? {} : { pending: t(model.state === "selected" ? "selection.selected" : "selection.next") },
				model: t("model.value", { route: model.provider + "/" + model.model }),
				reasoning: model.reasoningEffort === void 0 ? t("reasoning.default") : t("reasoning.value", { effort: model.reasoningEffort })
			};
		}
		/**
		* One line naming everything about a row, for its accessible label.
		* @param row - the row to describe.
		* @param t - translate function bound to this plugin's dictionary.
		* @returns the localized summary.
		*/
		function rowAriaSummary(row, t) {
			const activity = t(row.running ? "activity.running" : "activity.inactive");
			const mode = t(row.mode === "one-shot" ? "mode.oneShot" : "mode.continuable");
			const parts = rowModelParts(row, t);
			const model = parts.known ? [
				parts.pending,
				parts.model,
				parts.reasoning
			].filter((part) => part !== void 0).join(" · ") : t("detail.unknown");
			return [
				row.label,
				activity,
				mode,
				model
			].join(" · ");
		}
		//#endregion
		//#region src/client/SubagentCatalogAction.tsx
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
		/** State mark size on a row and on the trigger, in px. */
		const DOT_SIZE = 8;
		/** Gap between the trigger and its panel, in px. */
		const ANCHOR_GAP = 6;
		/** Panel edge margin, shared with the placement math. */
		const EDGE_MARGIN = 16;
		/** Preferred panel height used only to decide whether it opens below or above. */
		const PANEL_ESTIMATE = 320;
		/** Clamp one axis inside the viewport. */
		function clamp(value, size, available) {
			return Math.min(Math.max(EDGE_MARGIN, value), Math.max(EDGE_MARGIN, available - size - EDGE_MARGIN));
		}
		/**
		* One subagent catalog control for the current session.
		* @param props - session runtime props, the bound translator, and the injected open callback.
		* @returns the trigger and, while open, the portaled row list; nothing without subagents.
		*/
		function SubagentCatalogAction({ sessionId, useSessions, openSubagent, t }) {
			const summaries = useSessions((state) => state.byId);
			const rows = (0, react.useMemo)(() => buildSubagentRows(summaries, sessionId), [summaries, sessionId]);
			const [open, setOpen] = (0, react.useState)(false);
			const [position, setPosition] = (0, react.useState)();
			const triggerRef = (0, react.useRef)(null);
			const menuRef = (0, react.useRef)(null);
			/** Anchor the panel to the trigger, flipping above it when the room below is short. */
			const place = (0, react.useCallback)(() => {
				const trigger = triggerRef.current;
				if (trigger === null) return;
				const rect = trigger.getBoundingClientRect();
				const below = rect.bottom + ANCHOR_GAP;
				const top = window.innerHeight - below - EDGE_MARGIN >= PANEL_ESTIMATE ? below : Math.max(EDGE_MARGIN, rect.top - ANCHOR_GAP - PANEL_ESTIMATE);
				setPosition({
					top,
					left: clamp(rect.left, 360, window.innerWidth)
				});
			}, []);
			(0, react.useEffect)(() => {
				if (!open) return;
				const closeOutside = (event) => {
					const target = event.target;
					if (target instanceof Node && !triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
				};
				const closeEscape = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				document.addEventListener("pointerdown", closeOutside);
				document.addEventListener("keydown", closeEscape);
				return () => {
					document.removeEventListener("pointerdown", closeOutside);
					document.removeEventListener("keydown", closeEscape);
				};
			}, [open]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const reposition = () => {
					place();
				};
				window.addEventListener("resize", reposition);
				document.addEventListener("scroll", reposition, true);
				return () => {
					window.removeEventListener("resize", reposition);
					document.removeEventListener("scroll", reposition, true);
				};
			}, [open, place]);
			(0, react.useEffect)(() => {
				if (rows.length === 0) setOpen(false);
			}, [rows.length]);
			if (rows.length === 0) return null;
			const runningCount = rows.filter((row) => row.running).length;
			const summary = t(runningCount > 0 ? rows.length === 1 ? "count.running.one" : "count.running.other" : rows.length === 1 ? "count.total.one" : "count.total.other", { count: rows.length });
			const openRow = (row) => {
				openSubagent({
					parentSessionId: row.parentId,
					childSessionId: row.id,
					mode: row.mode
				});
				setOpen(false);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				ref: triggerRef,
				type: "button",
				className: "dsc-trigger",
				"data-open": String(open),
				"aria-haspopup": "menu",
				"aria-expanded": open,
				"aria-label": t("button.aria", { count: summary }),
				onClick: () => {
					if (open) {
						setOpen(false);
						return;
					}
					place();
					setOpen(true);
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
					state: runningCount > 0 ? "ongoing" : "idle",
					size: DOT_SIZE
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsc-triggerText",
					children: summary
				})]
			}), open && position !== void 0 && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: menuRef,
				className: "dsc-menu",
				role: "menu",
				"aria-label": t("menu.aria"),
				style: position,
				children: rows.map((row) => {
					const parts = rowModelParts(row, t);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						role: "menuitem",
						className: "dsc-row",
						"data-running": String(row.running),
						"data-depth": String(Math.min(row.depth, 4)),
						"aria-label": rowAriaSummary(row, t),
						onClick: () => {
							openRow(row);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsc-head",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
									state: row.running ? "ongoing" : "idle",
									size: DOT_SIZE
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsc-label",
									children: row.label
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
									tone: row.running ? "success" : "quiet",
									children: t(row.running ? "activity.running" : "activity.inactive")
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsc-meta",
							children: [parts.known ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
									tone: parts.pending === void 0 ? "info" : "warning",
									children: parts.model
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
									tone: "neutral",
									children: parts.reasoning
								}),
								parts.pending !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
									tone: "warning",
									children: parts.pending
								})
							] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
								tone: "quiet",
								children: t("detail.unknown")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
								tone: "outline",
								children: t(row.mode === "one-shot" ? "mode.oneShot" : "mode.continuable")
							})]
						})]
					}, row.id);
				})
			}), document.body)] });
		}
		//#endregion
		//#region src/client/index.ts
		/** Required services: the slot registry, the locale registry, and workspace navigation. */
		const inject = [
			"slots",
			"locale",
			"uiWorkspace"
		];
		/**
		* Client plugin body: register the dictionary and the header control.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "subagent-catalog: dictionaries");
			ctx.effect(installStyles, "subagent-catalog: stylesheet");
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: NS,
				order: 20,
				locale: NS,
				inject: () => ({ openSubagent: (request) => {
					ctx.uiWorkspace.openSession(request);
				} })
			}, SubagentCatalogAction));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map