/** Pure card derivation: order, projection reads, and every displayed figure. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSubagentRows, cachePercentText, formatDurationMs, formatSpeed, formatTokenCount,
  rowAriaSummary, rowBarSegments, rowBreakdownParts, rowCache, rowContext, rowContextText,
  rowDurationMs, rowMetrics, rowModelParts, rowSpeed, rowTotalTokens,
} from '../lib/dev/rows.js'
import { en, zh } from '../lib/dev/locales.js'

/** Substitute {name} placeholders exactly like the client's translator does. */
function makeTranslate(dict) {
  return (key, params) => {
    let template = dict[key] ?? key
    if (params === undefined) return template
    for (const [name, value] of Object.entries(params)) {
      template = template.split('{' + name + '}').join(String(value))
    }
    return template
  }
}

const t = makeTranslate(zh)

/** One client session summary. */
function summary(id, parentId, over = {}) {
  return {
    id,
    displayTitle: id,
    running: false,
    retainedBy: {},
    blank: false,
    updatedAt: 0,
    ...(parentId === undefined ? {} : { parentId, origin: 'subagent' }),
    ...over,
  }
}

const ROOT = 'root'

test('ships the same key set in both languages', () => {
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
})

/** One complete, plausible projection set for a child card. */
function richProjections(over = {}) {
  return {
    subagent: { mode: 'continuable', label: 'child', seq: 1 },
    modelSelection: {
      lastUsed: { provider: 'acme', model: 'large', reasoningEffort: 'high' },
      next: null,
    },
    tokenUsage: {
      uncachedInputTokens: 2_000,
      outputTokens: 4_000,
      cacheReadTokens: 14_000,
      cacheWriteTokens: 0,
    },
    contextPressure: { pressureTokens: 15_000, projectedTokens: 16_000, contextWindow: 64_000 },
    contextBreakdown: { systemTokens: 1_000, toolsTokens: 3_000, messageTokens: 12_000 },
    sessionStats: {
      turns: 3, steps: 9, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0,
      decodeMs: 2_000, decodeTokens: 80,
    },
    subagentTiming: { settledMs: 12_000 },
    ...over,
  }
}

test('collects descendants with depth, running first, then by id', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    b: summary('b', ROOT, { running: true, projectionValues: richProjections() }),
    a: summary('a', ROOT, { projectionValues: { subagent: { mode: 'one-shot', label: 'idle-a', seq: 1 } } }),
    c: summary('c', ROOT, { projectionValues: { subagent: { mode: 'one-shot', label: 'idle-c', seq: 1 } } }),
    deep: summary('deep', 'b', { projectionValues: { subagent: { mode: 'one-shot', label: 'grandchild', seq: 1 } } }),
  }
  const rows = buildSubagentRows(summaries, ROOT)
  assert.deepEqual(rows.map(row => row.id), ['b', 'deep', 'a', 'c'])
  assert.deepEqual(rows.map(row => row.depth), [1, 2, 1, 1])
  assert.equal(rows[0].running, true)
  assert.equal(rows[0].label, 'child')
  assert.equal(rows[0].mode, 'continuable')
})

test('ignores ordinary sessions and other parents', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    other: summary('other'),
    alien: summary('alien', 'other', { projectionValues: { subagent: { mode: 'one-shot', label: 'x', seq: 1 } } }),
  }
  assert.deepEqual(buildSubagentRows(summaries, ROOT), [])
})

test('falls back to the display title and one-shot mode without an identity projection', () => {
  const summaries = { [ROOT]: summary(ROOT), child: summary('child', ROOT, { displayTitle: 'fallback' }) }
  const [row] = buildSubagentRows(summaries, ROOT)
  assert.equal(row.label, 'fallback')
  assert.equal(row.mode, 'one-shot')
})

test('reports a recorded request route as used', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, {
      projectionValues: {
        subagent: { mode: 'continuable', label: 'child', seq: 1 },
        modelSelection: { lastUsed: { provider: 'acme', model: 'large', reasoningEffort: 'high' }, next: null },
      },
    }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  const parts = rowModelParts(row, t)
  assert.equal(parts.known, true)
  assert.equal(parts.model, '模型 acme/large')
  assert.equal(parts.reasoning, '推理 high')
  assert.equal(parts.pending, undefined)
})

test('labels a selection with no request record instead of calling it used', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, {
      projectionValues: {
        subagent: { mode: 'continuable', label: 'child', seq: 1 },
        modelSelection: { lastUsed: null, next: { provider: 'acme', model: 'small' } },
      },
    }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  const parts = rowModelParts(row, t)
  assert.equal(parts.pending, '已选')
  assert.equal(parts.model, '模型 acme/small')
  assert.equal(parts.reasoning, '推理默认')
})

test('labels a pending choice that differs from the last request as next', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, {
      projectionValues: {
        subagent: { mode: 'continuable', label: 'child', seq: 1 },
        modelSelection: {
          lastUsed: { provider: 'acme', model: 'large' },
          next: { provider: 'acme', model: 'small' },
        },
      },
    }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  const parts = rowModelParts(row, t)
  assert.equal(parts.pending, '下次')
  assert.equal(parts.model, '模型 acme/small')
})

test('treats an effort-only change as the same selection', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, {
      projectionValues: {
        subagent: { mode: 'continuable', label: 'child', seq: 1 },
        modelSelection: {
          lastUsed: { provider: 'acme', model: 'large', reasoningEffort: 'high' },
          next: { provider: 'acme', model: 'large', reasoningEffort: 'high' },
        },
      },
    }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  assert.equal(rowModelParts(row, t).pending, undefined)
})

test('reports an unavailable record without inventing a model', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, { projectionValues: { subagent: { mode: 'one-shot', label: 'child', seq: 1 } } }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  const parts = rowModelParts(row, t)
  assert.equal(parts.known, false)
  assert.equal(parts.model, undefined)
  assert.equal(rowAriaSummary(row, t, 0), 'child · 当前未运行 · 一次性 · 模型未记录 · 推理未知')
})

test('reads every card projection off the summary', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, { running: true, projectionValues: richProjections() }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  // The usage buckets, the pressure pair, the heuristic composition, the
  // whole-log stats, and the open turn all survive the projection read.
  assert.deepEqual(row.usage, {
    uncachedInputTokens: 2_000, outputTokens: 4_000, cacheReadTokens: 14_000, cacheWriteTokens: 0,
  })
  assert.deepEqual(row.context, { pressureTokens: 15_000, projectedTokens: 16_000, contextWindow: 64_000 })
  assert.deepEqual(row.breakdown, { systemTokens: 1_000, toolsTokens: 3_000, messageTokens: 12_000 })
  assert.equal(row.stats.decodeMs, 2_000)
  assert.deepEqual(row.timing, { settledMs: 12_000 })
})

test('drops a malformed projection instead of rendering it', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, {
      projectionValues: {
        subagent: { mode: 'one-shot', label: 'child', seq: 1 },
        tokenUsage: { uncachedInputTokens: 1, outputTokens: 'many', cacheReadTokens: 2, cacheWriteTokens: 3 },
        contextPressure: { projectedTokens: Number.NaN, contextWindow: 64_000 },
        sessionStats: { turns: 1 },
        subagentTiming: { settledMs: -1 },
      },
    }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  assert.equal(row.usage, undefined)
  assert.equal(row.context, undefined)
  assert.equal(row.stats, undefined)
  assert.equal(row.timing, undefined)
  assert.equal(rowTotalTokens(row), undefined)
  assert.equal(rowContextText(row, t), undefined)
  assert.equal(rowMetrics(row, t, 0).every(metric => metric.value === '—'), true)
})

test('clamps an overrun percentage but keeps the real token reading', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, {
      projectionValues: richProjections({
        contextPressure: { projectedTokens: 96_000, contextWindow: 64_000 },
      }),
    }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  // 96000 / 64000 * 100 = 150 percent, clamped to the bar's 100.
  assert.equal(rowContext(row).percent, 100)
  assert.equal(rowContext(row).usedTokens, 96_000)
  assert.equal(rowContextText(row, t).reading, '100% · ~96k / 64k')
})

test('states an unknown capacity without a percentage', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, {
      projectionValues: richProjections({ contextPressure: { projectedTokens: 16_000 } }),
    }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  assert.deepEqual(rowContext(row), { usedTokens: 16_000 })
  const text = rowContextText(row, t)
  assert.equal(text.percent, undefined)
  assert.equal(text.reading, '~16k · 容量未知')
  assert.equal(text.aria, '上下文约 16k tokens，容量未知')
})

test('falls back to the anchored pressure when no projection repriced the surface', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, {
      projectionValues: richProjections({ contextPressure: { pressureTokens: 15_000, contextWindow: 64_000 } }),
    }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  assert.equal(rowContext(row).usedTokens, 15_000)
  // 15000 / 64000 * 100 = 23.4375 -> 23.
  assert.equal(rowContext(row).percent, 23)
})

test('never rounds a partial cache hit up to a full one', () => {
  // Integer rounding stays honest while it is below 100.
  assert.equal(cachePercentText(250, 1_000), '25')
  // 996 / 1000 * 100 = 99.6: the integer would read 100, so one decimal shows.
  assert.equal(cachePercentText(996, 1_000), '99.6')
  // 9999 / 10000 * 100 = 99.99 exactly.
  assert.equal(cachePercentText(9_999, 10_000), '99.99')
  // 99999 / 100000 * 100 = 99.999: no two-decimal reading is below 100.
  assert.equal(cachePercentText(99_999, 100_000), '99.99+')
  // Every prompt token served from cache is a real full hit.
  assert.equal(cachePercentText(1_000, 1_000), '100')
  // Nothing billed is not a zero-percent hit.
  assert.equal(cachePercentText(0, 0), undefined)
})

test('computes the cache share over prompt-side billed input only', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, { projectionValues: richProjections() }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  const cache = rowCache(row)
  // prompt = 2000 uncached + 14000 cache read + 0 cache write = 16000.
  assert.equal(cache.promptTokens, 16_000)
  assert.equal(cache.readTokens, 14_000)
  // 14000 / 16000 * 100 = 87.5 -> 88.
  assert.equal(cache.percent, '88')
  assert.equal(rowTotalTokens(row), 20_000)
  assert.equal(rowSpeed(row), 40)
})

test('formats tokens, speed, and durations the way the chat surfaces do', () => {
  assert.equal(formatTokenCount(517, t), '517')
  assert.equal(formatTokenCount(12_200, t), '12.2k')
  assert.equal(formatTokenCount(1_234_567, t), '1.2M')
  assert.equal(formatSpeed(4.06, t), '4.1 tok/s')
  assert.equal(formatSpeed(41.6, t), '42 tok/s')
  assert.equal(formatDurationMs(9_400, t), '9秒')
  assert.equal(formatDurationMs(65_000, t), '1分05秒')
  assert.equal(formatDurationMs(3_725_000, t), '1小时02分05秒')
  assert.equal(formatDurationMs(90_000_000, t), '1天01小时')
})

test('extends a running card to now and freezes an idle one at its last fold', () => {
  const active = { settledMs: 12_000, active: { since: 1_000_000, through: 1_004_000 } }
  const running = buildSubagentRows(
    { [ROOT]: summary(ROOT), child: summary('child', ROOT, { running: true, projectionValues: richProjections({ subagentTiming: active }) }) },
    ROOT,
  )[0]
  // settled 12000 + (now 1005000 - since 1000000) = 17000.
  assert.equal(rowDurationMs(running, 1_005_000), 17_000)
  const idle = buildSubagentRows(
    { [ROOT]: summary(ROOT), child: summary('child', ROOT, { projectionValues: richProjections({ subagentTiming: active }) }) },
    ROOT,
  )[0]
  // An idle card uses the fold's own through bound, not the caller's clock.
  assert.equal(rowDurationMs(idle, 9_999_999), 16_000)
})

test('splits the heuristic composition into proportional parts', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, { projectionValues: richProjections() }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  const parts = rowBreakdownParts(row, t)
  // total = 1000 + 3000 + 12000 = 16000.
  assert.deepEqual(parts.map(part => part.key), ['system', 'tools', 'messages'])
  assert.deepEqual(parts.map(part => part.share), [1_000 / 16_000, 3_000 / 16_000, 12_000 / 16_000])
  assert.deepEqual(parts.map(part => part.text), [
    '系统 1k', '工具 3k', '消息 12k',
  ])
})

test('fills the bar from the composition and never leaves a known occupancy unpainted', () => {
  const composed = buildSubagentRows(
    { [ROOT]: summary(ROOT), child: summary('child', ROOT, { projectionValues: richProjections() }) },
    ROOT,
  )[0]
  // system + tools + messages = 1000 + 3000 + 12000 = 16000; each span is the
  // occupancy times that part's share, so the widths sum back to the occupancy.
  assert.deepEqual(rowBarSegments(composed, 25), [
    { key: 'system', width: 25 * 1_000 / 16_000 },
    { key: 'tools', width: 25 * 3_000 / 16_000 },
    { key: 'messages', width: 25 * 12_000 / 16_000 },
  ])
  const zeroSystem = buildSubagentRows(
    {
      [ROOT]: summary(ROOT),
      child: summary('child', ROOT, {
        projectionValues: richProjections({
          contextBreakdown: { systemTokens: 0, toolsTokens: 4_000, messageTokens: 12_000 },
        }),
      }),
    },
    ROOT,
  )[0]
  // A zero part is dropped instead of painted as a hairline segment.
  assert.deepEqual(rowBarSegments(zeroSystem, 50).map(segment => segment.key), ['tools', 'messages'])
  const bare = buildSubagentRows(
    {
      [ROOT]: summary(ROOT),
      child: summary('child', ROOT, {
        projectionValues: { subagent: { mode: 'one-shot', label: 'bare', seq: 1 } },
      }),
    },
    ROOT,
  )[0]
  // A known occupancy without any composition still paints the whole bar.
  assert.deepEqual(rowBarSegments(bare, 70), [{ key: 'total', width: 70 }])
  // Without a capacity there is no scale to fill against, so nothing is painted.
  assert.deepEqual(rowBarSegments(bare, undefined), [])
})

test('names every layer in the accessible summary', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, {
      running: true,
      projectionValues: richProjections({
        modelSelection: {
          lastUsed: { provider: 'acme', model: 'large', reasoningEffort: 'high' },
          next: { provider: 'acme', model: 'small' },
        },
      }),
    }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  assert.equal(
    rowAriaSummary(row, t, 0),
    'child · 正在运行 · 可继续 · 下次 · 模型 acme/small · 推理默认'
    + ' · 上下文约 25%，约 16k / 64k tokens'
    + ' · 构成 系统 1k · 工具 3k · 消息 12k'
    + ' · 速度 40 tok/s · 缓存命中 88% · 累计 tokens 20k · 时长 12秒 · 步数 9 · 轮数 3',
  )
})

test('reports each metric cell with its label and the absent marker', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, { projectionValues: richProjections() }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  const metrics = rowMetrics(row, t, 0)
  assert.deepEqual(metrics.map(metric => metric.key), ['speed', 'cache', 'total', 'duration', 'steps', 'turns'])
  assert.deepEqual(metrics.map(metric => metric.label), ['速度', '缓存命中', '累计 tokens', '时长', '步数', '轮数'])
  assert.deepEqual(metrics.map(metric => metric.value), ['40 tok/s', '88%', '20k', '12秒', '9', '3'])
})
