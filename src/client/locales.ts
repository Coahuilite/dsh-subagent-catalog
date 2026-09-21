/** `subagent-catalog` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'subagent-catalog'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'button.aria': '子代理会话，{count}',
  'menu.aria': '子代理会话',
  'count.total.one': '{count} 个子代理',
  'count.total.other': '{count} 个子代理',
  'count.running.one': '{count} 个子代理，正在运行',
  'count.running.other': '{count} 个子代理，正在运行',
  'mode.oneShot': '一次性',
  'mode.continuable': '可继续',
  'activity.running': '正在运行',
  'activity.inactive': '当前未运行',
  'model.value': '模型 {route}',
  'reasoning.value': '推理 {effort}',
  'reasoning.default': '推理默认',
  'selection.selected': '已选',
  'selection.next': '下次',
  'detail.known': '{model} · {reasoning}',
  'detail.selected': '{status} · {model} · {reasoning}',
  'detail.unknown': '模型未记录 · 推理未知',
} as const

/** English dictionary, key-identical to the Chinese source of truth. */
export const en: Record<SubagentCatalogKey, string> = {
  'button.aria': 'Subagent sessions, {count}',
  'menu.aria': 'Subagent sessions',
  'count.total.one': '{count} subagent',
  'count.total.other': '{count} subagents',
  'count.running.one': '{count} subagent, running',
  'count.running.other': '{count} subagents, running',
  'mode.oneShot': 'one-shot',
  'mode.continuable': 'continuable',
  'activity.running': 'running',
  'activity.inactive': 'not running',
  'model.value': 'Model {route}',
  'reasoning.value': 'Reasoning {effort}',
  'reasoning.default': 'Reasoning default',
  'selection.selected': 'Selected',
  'selection.next': 'Next',
  'detail.known': '{model} · {reasoning}',
  'detail.selected': '{status} · {model} · {reasoning}',
  'detail.unknown': 'Model not recorded · Reasoning unknown',
}

/** Key domain of the `subagent-catalog` namespace (zh is the source of truth). */
export type SubagentCatalogKey = keyof typeof zh
