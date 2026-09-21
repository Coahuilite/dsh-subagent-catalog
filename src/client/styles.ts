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
export const STYLE_TAG = 'dsh-subagent-catalog'

/** Class prefix keeping every rule out of other plugins' namespaces. */
export const CLS = 'dsc'

/** Panel width. Fixed so the placement math can clamp exactly. */
export const MENU_WIDTH = 420

/** Deepest indent step the stylesheet defines; deeper cards share the last one. */
export const MAX_INDENT_DEPTH = 4

const STYLES = [
  // Trigger: a compact header control matching the surrounding actions.
  '.' + CLS + '-trigger{font:inherit;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}',
  '.' + CLS + '-trigger:hover{background:var(--dsw-alias-interactive-bg-hover)}',
  '.' + CLS + '-trigger[data-open=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
  '.' + CLS + '-trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}',
  '.' + CLS + '-triggerText{font-size:12px;line-height:18px;white-space:nowrap}',

  // Panel: the shared menu surface, elevation, and portal layer.
  '.' + CLS + '-menu{box-sizing:border-box;position:fixed;z-index:1100;width:min(' + MENU_WIDTH + 'px,calc(100vw - 32px));max-height:min(76vh,620px);overflow:auto;display:flex;flex-direction:column;gap:6px;padding:6px;border:0;border-radius:20px;background:var(--dsw-specific-menu);box-shadow:var(--dsw-elevation-prominent);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}',

  // Panel head: the group title and the same count the trigger announces.
  '.' + CLS + '-panelHead{display:flex;align-items:baseline;gap:8px;padding:6px 10px 2px}',
  '.' + CLS + '-panelTitle{font-size:12px;line-height:18px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
  '.' + CLS + '-panelCount{margin-left:auto;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',

  // Card: a bordered cell whose content stacks identity, badges, context, metrics.
  '.' + CLS + '-card{font:inherit;box-sizing:border-box;position:relative;display:flex;flex-direction:column;gap:6px;width:100%;padding:10px 10px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer}',
  '.' + CLS + '-card:hover{background:var(--dsw-alias-interactive-bg-hover)}',
  // Arrow-key navigation moves real focus, so the fill is the row's indication
  // and the browser ring would double it (same rule as the shared menu).
  '.' + CLS + '-card:focus-visible{background:var(--dsw-alias-interactive-bg-hover);outline:none}',
  // A running card states its activity twice: the status mark and badge carry the
  // word, the accent border carries the scan-level grouping.
  '.' + CLS + '-card[data-running=true]{border-color:var(--dsw-alias-state-business-primary)}',

  // Nesting ladder: one indent step per level, so descendants read as children.
  '.' + CLS + '-card[data-depth="2"]{margin-left:14px;width:calc(100% - 14px)}',
  '.' + CLS + '-card[data-depth="3"]{margin-left:28px;width:calc(100% - 28px)}',
  '.' + CLS + '-card[data-depth="4"]{margin-left:42px;width:calc(100% - 42px)}',

  // Identity line: status mark, label, activity badge.
  '.' + CLS + '-head{display:flex;align-items:center;gap:6px;min-width:0}',
  '.' + CLS + '-label{flex:1;min-width:0;overflow:hidden;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;font-weight:400;text-overflow:ellipsis;white-space:nowrap}',
  '.' + CLS + '-card[data-running=true] .' + CLS + '-label{font-weight:600}',

  // Badge line: aligned under the label, not under the state mark.
  '.' + CLS + '-tags{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding-left:14px}',

  // Context line: label and reading over a bar, then the composition legend.
  '.' + CLS + '-ctxHead{display:flex;align-items:baseline;gap:6px;padding-top:2px}',
  '.' + CLS + '-ctxLabel{font-size:11px;line-height:16px;color:var(--dsw-alias-label-caption)}',
  '.' + CLS + '-ctxReading{margin-left:auto;font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
  '.' + CLS + '-bar{display:flex;gap:1px;height:6px;border-radius:999px;background:var(--dsw-alias-border-l2);overflow:hidden}',
  // No capacity means no scale to fill against; the hatched track says so
  // instead of drawing a confident zero-length bar.
  '.' + CLS + '-bar[data-unknown=true]{background:repeating-linear-gradient(90deg,var(--dsw-alias-border-l2) 0 6px,transparent 6px 12px)}',
  '.' + CLS + '-barFill{flex:none;height:100%;border-radius:999px;background:var(--dsw-alias-state-business-primary)}',
  '.' + CLS + '-barFill[data-part=system]{background:var(--dsw-static-neutral-bluish-400)}',
  // The design platform ships no purple tint token; the composition legend's
  // tools colour is the same violet literal the context meter uses.
  '.' + CLS + '-barFill[data-part=tools]{background:rgb(167,139,250)}',
  '.' + CLS + '-barFill[data-part=messages]{background:var(--dsw-static-blue-450)}',
  '.' + CLS + '-legend{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
  '.' + CLS + '-legendItem{display:inline-flex;align-items:center;gap:4px;min-width:0}',
  '.' + CLS + '-swatch{flex:none;width:8px;height:8px;border-radius:2px;background:var(--dsw-alias-label-caption)}',
  '.' + CLS + '-swatch[data-part=system]{background:var(--dsw-static-neutral-bluish-400)}',
  '.' + CLS + '-swatch[data-part=tools]{background:rgb(167,139,250)}',
  '.' + CLS + '-swatch[data-part=messages]{background:var(--dsw-static-blue-450)}',

  // Metric grid: three labeled cells per row, numbers in tabular figures.
  '.' + CLS + '-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 8px;margin:0;padding-top:6px;border-top:1px solid var(--dsw-alias-border-l1)}',
  '.' + CLS + '-metric{display:flex;flex-direction:column;min-width:0}',
  '.' + CLS + '-metricLabel{margin:0;font-size:10px;line-height:14px;color:var(--dsw-alias-label-caption);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.' + CLS + '-metricValue{margin:0;font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
].join('')

/**
 * Install the stylesheet once and return its removal.
 * @returns the disposer removing exactly the tag this call installed.
 */
export function installStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  if (document.querySelector('style[data-plugin="' + STYLE_TAG + '"]') !== null) return () => {}
  const tag = document.createElement('style')
  tag.dataset.plugin = STYLE_TAG
  tag.textContent = STYLES
  document.head.appendChild(tag)
  return () => { tag.remove() }
}
