/** Pure row derivation: which subagents appear, their order, and their badges. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSubagentRows, rowAriaSummary, rowModelParts } from '../lib/dev/rows.js'
import { zh } from '../lib/dev/locales.js'

/** Substitute {name} placeholders exactly like the client's translator does. */
function makeTranslate(dict) {
  return (key, params) => {
    const template = dict[key] ?? key
    if (params === undefined) return template
    return template.replace(/\{(\w+)\}/g, (_match, name) => String(params[name] ?? '{' + name + '}'))
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

test('collects descendants with depth, running first, then by id', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    b: summary('b', ROOT, { running: true, projectionValues: { subagent: { mode: 'continuable', label: 'runner-b', seq: 1 } } }),
    a: summary('a', ROOT, { projectionValues: { subagent: { mode: 'one-shot', label: 'idle-a', seq: 1 } } }),
    c: summary('c', ROOT, { projectionValues: { subagent: { mode: 'one-shot', label: 'idle-c', seq: 1 } } }),
    deep: summary('deep', 'b', { projectionValues: { subagent: { mode: 'one-shot', label: 'grandchild', seq: 1 } } }),
  }
  const rows = buildSubagentRows(summaries, ROOT)
  assert.deepEqual(rows.map(row => row.id), ['b', 'deep', 'a', 'c'])
  assert.deepEqual(rows.map(row => row.depth), [1, 2, 1, 1])
  assert.equal(rows[0].running, true)
  assert.equal(rows[0].label, 'runner-b')
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
  assert.equal(rowAriaSummary(row, t), 'child · 当前未运行 · 一次性 · 模型未记录 · 推理未知')
})

test('names every layer in the accessible summary', () => {
  const summaries = {
    [ROOT]: summary(ROOT),
    child: summary('child', ROOT, {
      running: true,
      projectionValues: {
        subagent: { mode: 'continuable', label: 'child', seq: 1 },
        modelSelection: {
          lastUsed: { provider: 'acme', model: 'large', reasoningEffort: 'high' },
          next: { provider: 'acme', model: 'small' },
        },
      },
    }),
  }
  const [row] = buildSubagentRows(summaries, ROOT)
  assert.equal(rowAriaSummary(row, t), 'child · 正在运行 · 可继续 · 下次 · 模型 acme/small · 推理默认')
})
