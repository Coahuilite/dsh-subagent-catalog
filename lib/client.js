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
			"panel.title": "子代理会话",
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
			"detail.unknown": "模型未记录 · 推理未知",
			"context.label": "上下文",
			"context.reading": "{percent}% · ~{used} / {window}",
			"context.reading.open": "~{used} · 容量未知",
			"context.aria": "上下文约 {percent}%，约 {used} / {window} tokens",
			"context.aria.open": "上下文约 {used} tokens，容量未知",
			"breakdown.label": "构成",
			"breakdown.system": "系统",
			"breakdown.tools": "工具",
			"breakdown.messages": "消息",
			"breakdown.item": "{label} {value}",
			"metric.speed": "速度",
			"metric.cache": "缓存命中",
			"metric.total": "累计 tokens",
			"metric.duration": "时长",
			"metric.steps": "步数",
			"metric.turns": "轮数",
			"value.absent": "—",
			"speed.value": "{value} tok/s",
			"cache.value": "{percent}%",
			"tokens.thousand": "{value}k",
			"tokens.million": "{value}M",
			"duration.seconds": "{seconds}秒",
			"duration.minutes": "{minutes}分{seconds}秒",
			"duration.hours": "{hours}小时{minutes}分{seconds}秒",
			"duration.days": "{days}天{hours}小时"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"button.aria": "Subagent sessions, {count}",
			"menu.aria": "Subagent sessions",
			"panel.title": "Subagent sessions",
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
			"detail.unknown": "Model not recorded · Reasoning unknown",
			"context.label": "Context",
			"context.reading": "{percent}% · ~{used} / {window}",
			"context.reading.open": "~{used} · capacity unknown",
			"context.aria": "Context about {percent}%, about {used} / {window} tokens",
			"context.aria.open": "Context about {used} tokens, capacity unknown",
			"breakdown.label": "Composition",
			"breakdown.system": "system",
			"breakdown.tools": "tools",
			"breakdown.messages": "messages",
			"breakdown.item": "{label} {value}",
			"metric.speed": "Speed",
			"metric.cache": "Cache hit",
			"metric.total": "Total tokens",
			"metric.duration": "Duration",
			"metric.steps": "Steps",
			"metric.turns": "Turns",
			"value.absent": "—",
			"speed.value": "{value} tok/s",
			"cache.value": "{percent}%",
			"tokens.thousand": "{value}k",
			"tokens.million": "{value}M",
			"duration.seconds": "{seconds}s",
			"duration.minutes": "{minutes}m {seconds}s",
			"duration.hours": "{hours}h {minutes}m {seconds}s",
			"duration.days": "{days}d {hours}h"
		};
		//#endregion
		//#region src/client/styles.ts
		/**
		* The control's stylesheet, owned by the plugin rather than by a bundler CSS
		* pipeline so the artifact stays a plain JavaScript bundle.
		*
		* Every subagent is one card: a status mark and identity line, a badge line for
		* the model facts, a context bar over the heuristic composition legend, and a
		* metric grid holding speed, cache-hit share, cumulative tokens, duration, and
		* the step/turn counts. Structure carries the reading - the bar has a text
		* figure beside it and every metric has its own label - so no row depends on
		* colour alone. The panel and its rows reuse the shared menu recipe (surface,
		* elevation, radii, hover and focus fills) so the control reads as part of the
		* application rather than beside it.
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
			".dsc-menu{box-sizing:border-box;position:fixed;z-index:1100;width:min(420px,calc(100vw - 32px));max-height:min(76vh,620px);overflow:auto;display:flex;flex-direction:column;gap:6px;padding:6px;border:0;border-radius:20px;background:var(--dsw-specific-menu);box-shadow:var(--dsw-elevation-prominent);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}",
			".dsc-panelHead{display:flex;align-items:baseline;gap:8px;padding:6px 10px 2px}",
			".dsc-panelTitle{font-size:12px;line-height:18px;font-weight:600;color:var(--dsw-alias-label-secondary)}",
			".dsc-panelCount{margin-left:auto;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}",
			".dsc-card{font:inherit;box-sizing:border-box;position:relative;display:flex;flex-direction:column;gap:6px;width:100%;padding:10px 10px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer}",
			".dsc-card:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsc-card:focus-visible{background:var(--dsw-alias-interactive-bg-hover);outline:none}",
			".dsc-card[data-running=true]{border-color:var(--dsw-alias-state-business-primary)}",
			".dsc-card[data-depth=\"2\"]{margin-left:14px;width:calc(100% - 14px)}",
			".dsc-card[data-depth=\"3\"]{margin-left:28px;width:calc(100% - 28px)}",
			".dsc-card[data-depth=\"4\"]{margin-left:42px;width:calc(100% - 42px)}",
			".dsc-head{display:flex;align-items:center;gap:6px;min-width:0}",
			".dsc-label{flex:1;min-width:0;overflow:hidden;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;font-weight:400;text-overflow:ellipsis;white-space:nowrap}",
			".dsc-card[data-running=true] .dsc-label{font-weight:600}",
			".dsc-tags{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding-left:14px}",
			".dsc-ctxHead{display:flex;align-items:baseline;gap:6px;padding-top:2px}",
			".dsc-ctxLabel{font-size:11px;line-height:16px;color:var(--dsw-alias-label-caption)}",
			".dsc-ctxReading{margin-left:auto;font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}",
			".dsc-bar{display:flex;gap:1px;height:6px;border-radius:999px;background:var(--dsw-alias-border-l2);overflow:hidden}",
			".dsc-bar[data-unknown=true]{background:repeating-linear-gradient(90deg,var(--dsw-alias-border-l2) 0 6px,transparent 6px 12px)}",
			".dsc-barFill{flex:none;height:100%;border-radius:999px;background:var(--dsw-alias-state-business-primary)}",
			".dsc-barFill[data-part=system]{background:var(--dsw-static-neutral-bluish-400)}",
			".dsc-barFill[data-part=tools]{background:rgb(167,139,250)}",
			".dsc-barFill[data-part=messages]{background:var(--dsw-static-blue-450)}",
			".dsc-legend{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}",
			".dsc-legendItem{display:inline-flex;align-items:center;gap:4px;min-width:0}",
			".dsc-swatch{flex:none;width:8px;height:8px;border-radius:2px;background:var(--dsw-alias-label-caption)}",
			".dsc-swatch[data-part=system]{background:var(--dsw-static-neutral-bluish-400)}",
			".dsc-swatch[data-part=tools]{background:rgb(167,139,250)}",
			".dsc-swatch[data-part=messages]{background:var(--dsw-static-blue-450)}",
			".dsc-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 8px;margin:0;padding-top:6px;border-top:1px solid var(--dsw-alias-border-l1)}",
			".dsc-metric{display:flex;flex-direction:column;min-width:0}",
			".dsc-metricLabel{margin:0;font-size:10px;line-height:14px;color:var(--dsw-alias-label-caption);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsc-metricValue{margin:0;font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
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
		/** Whether a value is a usable non-negative token count or timestamp. */
		function isCount(value) {
			return typeof value === "number" && Number.isFinite(value) && value >= 0;
		}
		/** Read one raw projection value off a summary without assuming its shape. */
		function projectionOf(summary, key) {
			const values = summary.projectionValues;
			return typeof values === "object" && values !== null ? values[key] : void 0;
		}
		/** Narrow a raw value to a record, or undefined for anything else. */
		function recordOf(value) {
			return typeof value === "object" && value !== null ? value : void 0;
		}
		/** Narrow one raw token-usage projection. */
		function tokenUsageOf(value) {
			const record = recordOf(value);
			if (record === void 0) return void 0;
			const { uncachedInputTokens, outputTokens, cacheReadTokens, cacheWriteTokens } = record;
			return isCount(uncachedInputTokens) && isCount(outputTokens) && isCount(cacheReadTokens) && isCount(cacheWriteTokens) ? {
				uncachedInputTokens,
				outputTokens,
				cacheReadTokens,
				cacheWriteTokens
			} : void 0;
		}
		/** Narrow one raw context-pressure projection; either optional field may be absent. */
		function contextPressureOf(value) {
			const record = recordOf(value);
			if (record === void 0) return void 0;
			const pressureTokens = record.pressureTokens;
			const projectedTokens = record.projectedTokens;
			const contextWindow = record.contextWindow;
			if (pressureTokens !== void 0 && !isCount(pressureTokens)) return void 0;
			if (projectedTokens !== void 0 && !isCount(projectedTokens)) return void 0;
			if (contextWindow !== void 0 && !isCount(contextWindow)) return void 0;
			return {
				...pressureTokens === void 0 ? {} : { pressureTokens },
				...projectedTokens === void 0 ? {} : { projectedTokens },
				...contextWindow === void 0 ? {} : { contextWindow }
			};
		}
		/** Narrow one raw context-breakdown projection. */
		function contextBreakdownOf(value) {
			const record = recordOf(value);
			if (record === void 0) return void 0;
			const { systemTokens, toolsTokens, messageTokens } = record;
			return isCount(systemTokens) && isCount(toolsTokens) && isCount(messageTokens) ? {
				systemTokens,
				toolsTokens,
				messageTokens
			} : void 0;
		}
		/** Narrow one raw whole-log stats projection. */
		function sessionStatsOf(value) {
			const record = recordOf(value);
			if (record === void 0) return void 0;
			if ([
				"turns",
				"steps",
				"llmMs",
				"toolMs",
				"ttftMs",
				"ttftSteps",
				"decodeMs",
				"decodeTokens"
			].some((field) => !isCount(record[field]))) return void 0;
			return {
				turns: record.turns,
				steps: record.steps,
				llmMs: record.llmMs,
				toolMs: record.toolMs,
				ttftMs: record.ttftMs,
				ttftSteps: record.ttftSteps,
				decodeMs: record.decodeMs,
				decodeTokens: record.decodeTokens
			};
		}
		/** Narrow one raw active-turn timing projection. */
		function subagentTimingOf(value) {
			const record = recordOf(value);
			if (record === void 0 || !isCount(record.settledMs)) return void 0;
			const active = recordOf(record.active);
			if (active === void 0) return { settledMs: record.settledMs };
			return isCount(active.since) && isCount(active.through) ? {
				settledMs: record.settledMs,
				active: {
					since: active.since,
					through: active.through
				}
			} : void 0;
		}
		/** Whether two routes name the same model and effort. */
		function sameRoute(left, right) {
			return left.provider === right.provider && left.model === right.model && left.reasoningEffort === right.reasoningEffort;
		}
		/**
		* Read one session summary's durable model selection.
		* @param summary - the child's client summary.
		* @returns the route the card should show plus its state, or undefined without a record.
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
		* a card.
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
		* running-first. Depth therefore tracks a card's nesting exactly.
		* @param summaries - the client session list.
		* @param rootSessionId - the session whose header hosts the control.
		* @returns the descendant cards in display order, each with the projection values it can read.
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
					const usage = tokenUsageOf(projectionOf(summary, "tokenUsage"));
					const context = contextPressureOf(projectionOf(summary, "contextPressure"));
					const breakdown = contextBreakdownOf(projectionOf(summary, "contextBreakdown"));
					const stats = sessionStatsOf(projectionOf(summary, "sessionStats"));
					const timing = subagentTimingOf(projectionOf(summary, "subagentTiming"));
					rows.push({
						id: summary.id,
						parentId,
						depth,
						label: identity?.label ?? summary.displayTitle,
						mode: identity?.mode ?? "one-shot",
						running: summary.running,
						...model === void 0 ? {} : { model },
						...usage === void 0 ? {} : { usage },
						...context === void 0 ? {} : { context },
						...breakdown === void 0 ? {} : { breakdown },
						...stats === void 0 ? {} : { stats },
						...timing === void 0 ? {} : { timing }
					});
					visit(summary.id, depth + 1);
				}
			};
			visit(rootSessionId, 1);
			return rows;
		}
		/**
		* Split one card's model information into separately renderable parts.
		* @param row - the card to describe.
		* @param t - translate function bound to this plugin's dictionary.
		* @returns the parts; known: false carries no model text.
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
		* Resolve one card's bounded context occupancy.
		* @param row - the card to read.
		* @returns occupancy, or undefined until a pressure sample is known.
		*/
		function rowContext(row) {
			const pressure = row.context;
			if (pressure === void 0) return void 0;
			const usedTokens = pressure.projectedTokens ?? pressure.pressureTokens;
			if (usedTokens === void 0) return void 0;
			const contextWindow = pressure.contextWindow;
			return contextWindow === void 0 ? { usedTokens } : {
				usedTokens,
				contextWindow,
				percent: Math.min(100, Math.round(usedTokens / contextWindow * 100))
			};
		}
		/**
		* Display-ready cache-hit share, in percent units.
		*
		* A partial hit never rounds up to 100: when the integer would, one more
		* decimal is added, then two, and a share that even two decimals cannot
		* distinguish from a full hit reads as 99.99+ instead of claiming a full hit
		* the tokens do not support.
		* @param cacheReadTokens - prompt tokens served from cache.
		* @param promptTokens - billed prompt tokens (uncached + cache read + cache write).
		* @returns percent text, or undefined when nothing was billed.
		*/
		function cachePercentText(cacheReadTokens, promptTokens) {
			if (promptTokens <= 0) return void 0;
			if (cacheReadTokens >= promptTokens) return "100";
			const ratio = cacheReadTokens / promptTokens * 100;
			const whole = String(Math.round(ratio));
			if (whole !== "100") return whole;
			const oneDecimal = ratio.toFixed(1);
			if (oneDecimal !== "100.0") return oneDecimal;
			const twoDecimals = ratio.toFixed(2);
			return twoDecimals === "100.00" ? "99.99+" : twoDecimals;
		}
		/**
		* Read one card's cache-hit share.
		* @param row - the card to read.
		* @returns the share plus its token basis, or undefined without billed input.
		*/
		function rowCache(row) {
			const usage = row.usage;
			if (usage === void 0) return void 0;
			const promptTokens = usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
			const percent = cachePercentText(usage.cacheReadTokens, promptTokens);
			return percent === void 0 ? void 0 : {
				readTokens: usage.cacheReadTokens,
				promptTokens,
				percent
			};
		}
		/**
		* Read one card's cumulative token total: both prompt-side and output buckets.
		* @param row - the card to read.
		* @returns the total, or undefined without a usage record.
		*/
		function rowTotalTokens(row) {
			const usage = row.usage;
			return usage === void 0 ? void 0 : usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens + usage.outputTokens;
		}
		/**
		* Read one card's decode throughput over steps that reported output tokens.
		* @param row - the card to read.
		* @returns tokens per second, or undefined without a timed, reported decode.
		*/
		function rowSpeed(row) {
			const stats = row.stats;
			if (stats === void 0 || stats.decodeMs <= 0) return void 0;
			return stats.decodeTokens / (stats.decodeMs / 1e3);
		}
		/**
		* Read one card's active-turn duration, open turn included.
		* @param row - the card to read.
		* @param now - current wall-clock time used to extend a running card's open turn.
		* @returns milliseconds, or undefined without a timing record.
		*/
		function rowDurationMs(row, now) {
			const timing = row.timing;
			if (timing === void 0) return void 0;
			if (timing.active === void 0) return timing.settledMs;
			const end = row.running ? now : timing.active.through;
			return timing.settledMs + Math.max(0, end - timing.active.since);
		}
		/** Zero-pad one duration unit to two digits. */
		function pad2(value) {
			return value < 10 ? "0" + String(value) : String(value);
		}
		/**
		* Format a whole-second duration with decreasing precision at larger scales.
		* @param ms - duration in milliseconds.
		* @param t - translate function bound to this plugin's dictionary.
		* @returns the localized compact duration.
		*/
		function formatDurationMs(ms, t) {
			const total = Math.max(0, Math.floor(ms / 1e3));
			const hours = Math.floor(total / 3600);
			const minutes = Math.floor(total / 60) % 60;
			const seconds = total % 60;
			if (hours >= 24) return t("duration.days", {
				days: String(Math.floor(hours / 24)),
				hours: pad2(hours % 24)
			});
			if (hours > 0) return t("duration.hours", {
				hours: String(hours),
				minutes: pad2(minutes),
				seconds: pad2(seconds)
			});
			return minutes > 0 ? t("duration.minutes", {
				minutes: String(minutes),
				seconds: pad2(seconds)
			}) : t("duration.seconds", { seconds: String(seconds) });
		}
		/**
		* Format a token count compactly: 517 / 12.2k / 517k / 1.2M.
		* @param value - non-negative token count.
		* @param t - translate function bound to this plugin's dictionary.
		* @returns the compact localized count.
		*/
		function formatTokenCount(value, t) {
			const scaled = (candidate) => candidate >= 100 ? String(Math.round(candidate)) : String(Math.round(candidate * 10) / 10);
			if (value < 1e3) return String(Math.round(value));
			if (value < 1e6) return t("tokens.thousand", { value: scaled(value / 1e3) });
			return t("tokens.million", { value: scaled(value / 1e6) });
		}
		/**
		* Format a decode throughput: whole tokens from ten up, one decimal below.
		* @param value - tokens per second.
		* @param t - translate function bound to this plugin's dictionary.
		* @returns the localized speed reading.
		*/
		function formatSpeed(value, t) {
			const clamped = Math.max(0, value);
			return t("speed.value", { value: clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10) });
		}
		/**
		* Build one card's metric grid, in display order.
		* @param row - the card to read.
		* @param t - translate function bound to this plugin's dictionary.
		* @param now - current wall-clock time used to extend a running card's duration.
		* @returns six cells; an unmeasured figure carries the absent marker.
		*/
		function rowMetrics(row, t, now) {
			const speed = rowSpeed(row);
			const cache = rowCache(row);
			const total = rowTotalTokens(row);
			const duration = rowDurationMs(row, now);
			const stats = row.stats;
			const absent = t("value.absent");
			return [
				{
					key: "speed",
					label: t("metric.speed"),
					value: speed === void 0 ? absent : formatSpeed(speed, t)
				},
				{
					key: "cache",
					label: t("metric.cache"),
					value: cache === void 0 ? absent : t("cache.value", { percent: cache.percent })
				},
				{
					key: "total",
					label: t("metric.total"),
					value: total === void 0 ? absent : formatTokenCount(total, t)
				},
				{
					key: "duration",
					label: t("metric.duration"),
					value: duration === void 0 ? absent : formatDurationMs(duration, t)
				},
				{
					key: "steps",
					label: t("metric.steps"),
					value: stats === void 0 ? absent : String(stats.steps)
				},
				{
					key: "turns",
					label: t("metric.turns"),
					value: stats === void 0 ? absent : String(stats.turns)
				}
			];
		}
		/**
		* Compose one card's context line.
		* @param row - the card to read.
		* @param t - translate function bound to this plugin's dictionary.
		* @returns the reading, or undefined without a usable pressure sample.
		*/
		function rowContextText(row, t) {
			const context = rowContext(row);
			if (context === void 0) return void 0;
			const used = formatTokenCount(context.usedTokens, t);
			if (context.contextWindow === void 0 || context.percent === void 0) return {
				reading: t("context.reading.open", { used }),
				aria: t("context.aria.open", { used })
			};
			const percent = String(context.percent);
			const window = formatTokenCount(context.contextWindow, t);
			return {
				reading: t("context.reading", {
					percent,
					used,
					window
				}),
				percent: context.percent,
				aria: t("context.aria", {
					percent,
					used,
					window
				})
			};
		}
		/**
		* Compose one card's heuristic context composition.
		* @param row - the card to read.
		* @param t - translate function bound to this plugin's dictionary.
		* @returns three parts in bar-segment order, or undefined without a positive total.
		*/
		function rowBreakdownParts(row, t) {
			const breakdown = row.breakdown;
			if (breakdown === void 0) return void 0;
			const total = breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens;
			if (total <= 0) return void 0;
			const part = (key, labelKey, tokens) => {
				const label = t(labelKey);
				return {
					key,
					label,
					text: t("breakdown.item", {
						label,
						value: formatTokenCount(tokens, t)
					}),
					share: tokens / total
				};
			};
			return [
				part("system", "breakdown.system", breakdown.systemTokens),
				part("tools", "breakdown.tools", breakdown.toolsTokens),
				part("messages", "breakdown.messages", breakdown.messageTokens)
			];
		}
		/**
		* Split a card's occupancy into filled spans: the heuristic composition when it
		* is known and positive, otherwise one span carrying the whole occupancy.
		* Nothing is filled while the capacity is unknown, because there is no scale to
		* fill against.
		* @param row - the card to read.
		* @param percent - the clamped occupancy, or undefined without a capacity.
		* @returns the spans in paint order.
		*/
		function rowBarSegments(row, percent) {
			if (percent === void 0) return [];
			const breakdown = row.breakdown;
			const total = breakdown === void 0 ? 0 : breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens;
			if (breakdown === void 0 || total <= 0) return [{
				key: "total",
				width: percent
			}];
			return [
				["system", breakdown.systemTokens],
				["tools", breakdown.toolsTokens],
				["messages", breakdown.messageTokens]
			].filter(([, tokens]) => tokens > 0).map(([key, tokens]) => ({
				key,
				width: percent * tokens / total
			}));
		}
		/**
		* One line naming everything about a card, for its accessible label.
		* @param row - the card to describe.
		* @param t - translate function bound to this plugin's dictionary.
		* @param now - current wall-clock time used to extend a running card's duration.
		* @returns the localized summary.
		*/
		function rowAriaSummary(row, t, now) {
			const activity = t(row.running ? "activity.running" : "activity.inactive");
			const mode = t(row.mode === "one-shot" ? "mode.oneShot" : "mode.continuable");
			const model = rowModelParts(row, t);
			const modelText = model.known ? [
				model.pending,
				model.model,
				model.reasoning
			].filter((part) => part !== void 0).join(" · ") : t("detail.unknown");
			const context = rowContextText(row, t);
			const breakdown = rowBreakdownParts(row, t);
			const absent = t("value.absent");
			const metrics = rowMetrics(row, t, now).filter((metric) => metric.value !== absent).map((metric) => metric.label + " " + metric.value);
			const composition = breakdown === void 0 ? [] : [t("breakdown.label") + " " + breakdown.map((part) => part.text).join(" · ")];
			return [
				row.label,
				activity,
				mode,
				modelText,
				...context === void 0 ? [] : [context.aria],
				...composition,
				...metrics
			].join(" · ");
		}
		//#endregion
		//#region src/client/SubagentCatalogAction.tsx
		/**
		* Session-header control: one card per subagent beneath the current session.
		*
		* Running children come first, and each card stacks, in separate visual layers,
		* which subagent it is, whether it runs, its mode, the model and reasoning
		* effort it uses, how much context it holds, the heuristic composition of that
		* context, and its speed, cache-hit share, cumulative tokens, duration, and
		* step/turn counts.
		*
		* Every figure rides a durable client projection, so a card never invents a
		* number it could not read: an absent projection renders as the absent marker.
		* Layers come from the shared primitives, never from colour alone: a state mark
		* separates running from idle, the identity line carries the name, badges carry
		* the model facts, the context bar prints its own reading, and every metric
		* cell carries its label. The control owns its own DOM and contributes nothing
		* to the session log, so unloading the plugin leaves no state behind.
		*/
		/** State mark size on a card and on the trigger, in px. */
		const DOT_SIZE = 8;
		/** Gap between the trigger and its panel, in px. */
		const ANCHOR_GAP = 6;
		/** Panel edge margin, shared with the placement math. */
		const EDGE_MARGIN = 16;
		/** Preferred panel height used only to decide whether it opens below or above. */
		const PANEL_ESTIMATE = 420;
		/** How often a running card's open turn advances its duration, in ms. */
		const TICK_MS = 1e3;
		/** Clamp one axis inside the viewport. */
		function clamp(value, size, available) {
			return Math.min(Math.max(EDGE_MARGIN, value), Math.max(EDGE_MARGIN, available - size - EDGE_MARGIN));
		}
		/**
		* One subagent card: identity, model badges, context bar and composition, and
		* the metric grid, all inside one open target.
		* @param props - the card's row, its translator, the clock, and the open callback.
		* @returns the card element.
		*/
		function SubagentCard({ row, t, now, onOpen }) {
			const parts = rowModelParts(row, t);
			const context = rowContextText(row, t);
			const breakdown = rowBreakdownParts(row, t);
			const metrics = rowMetrics(row, t, now);
			const percent = context?.percent;
			const segments = rowBarSegments(row, percent);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				role: "menuitem",
				className: "dsc-card",
				"data-running": String(row.running),
				"data-depth": String(Math.min(row.depth, 4)),
				"aria-label": rowAriaSummary(row, t, now),
				onClick: () => {
					onOpen(row);
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
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
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsc-tags",
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
					}),
					context !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsc-ctxHead",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsc-ctxLabel",
							children: t("context.label")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsc-ctxReading",
							children: context.reading
						})]
					}),
					context !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsc-bar",
						"data-unknown": String(percent === void 0),
						role: "img",
						"aria-label": context.aria,
						children: segments.map((segment) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsc-barFill",
							"data-part": segment.key,
							style: { width: segment.width + "%" }
						}, segment.key))
					}),
					breakdown !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsc-legend",
						children: breakdown.map((part) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsc-legendItem",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsc-swatch",
								"data-part": part.key,
								"aria-hidden": true
							}), part.text]
						}, part.key))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsc-metrics",
						children: metrics.map((metric) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsc-metric",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsc-metricLabel",
								children: metric.label
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsc-metricValue",
								children: metric.value
							})]
						}, metric.key))
					})
				]
			});
		}
		/**
		* One subagent catalog control for the current session.
		* @param props - session runtime props, the bound translator, and the injected open callback.
		* @returns the trigger and, while open, the portaled card list; nothing without subagents.
		*/
		function SubagentCatalogAction({ sessionId, useSessions, openSubagent, t }) {
			const summaries = useSessions((state) => state.byId);
			const rows = (0, react.useMemo)(() => buildSubagentRows(summaries, sessionId), [summaries, sessionId]);
			const [open, setOpen] = (0, react.useState)(false);
			const [position, setPosition] = (0, react.useState)();
			const [now, setNow] = (0, react.useState)(() => Date.now());
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
					left: clamp(rect.left, 420, window.innerWidth)
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
			const hasRunning = rows.some((row) => row.running);
			(0, react.useEffect)(() => {
				if (!open || !hasRunning) return;
				setNow(Date.now());
				const timer = window.setInterval(() => {
					setNow(Date.now());
				}, TICK_MS);
				return () => {
					window.clearInterval(timer);
				};
			}, [open, hasRunning]);
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
					setNow(Date.now());
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
			}), open && position !== void 0 && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: menuRef,
				className: "dsc-menu",
				role: "menu",
				"aria-label": t("menu.aria"),
				style: position,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsc-panelHead",
					"aria-hidden": "true",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsc-panelTitle",
						children: t("panel.title")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsc-panelCount",
						children: summary
					})]
				}), rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SubagentCard, {
					row,
					t,
					now,
					onOpen: openRow
				}, row.id))]
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