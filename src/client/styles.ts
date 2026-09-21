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
export const STYLE_TAG = 'dsh-subagent-catalog'

/** Class prefix keeping every rule out of other plugins' namespaces. */
export const CLS = 'dsc'

/** Panel width. Fixed so the placement math can clamp exactly. */
export const MENU_WIDTH = 360

/** Deepest indent step the stylesheet defines; deeper rows share the last one. */
export const MAX_INDENT_DEPTH = 4

const STYLES = [
  // Trigger: a compact header control matching the surrounding actions.
  '.' + CLS + '-trigger{font:inherit;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}',
  '.' + CLS + '-trigger:hover{background:var(--dsw-alias-interactive-bg-hover)}',
  '.' + CLS + '-trigger[data-open=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
  '.' + CLS + '-trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}',
  '.' + CLS + '-triggerText{font-size:12px;line-height:18px;white-space:nowrap}',

  // Panel: the shared menu surface, elevation, and portal layer.
  '.' + CLS + '-menu{box-sizing:border-box;position:fixed;z-index:1100;width:' + MENU_WIDTH + 'px;max-height:min(60vh,480px);overflow:auto;display:flex;flex-direction:column;gap:0;padding:4px;border:0;border-radius:20px;background:var(--dsw-specific-menu);box-shadow:var(--dsw-elevation-prominent);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}',

  // Row: a menu cell whose content is a title line over a badge line.
  '.' + CLS + '-row{font:inherit;box-sizing:border-box;position:relative;display:flex;flex-direction:column;gap:4px;width:100%;padding:8px 10px;border:0;border-radius:10px;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer}',
  '.' + CLS + '-row:hover{background:var(--dsw-alias-interactive-bg-hover)}',
  // Arrow-key navigation moves real focus, so the fill is the row's indication
  // and the browser ring would double it (same rule as the shared menu).
  '.' + CLS + '-row:focus-visible{background:var(--dsw-alias-interactive-bg-hover);outline:none}',

  // Depth ladder: one indent step and one guide hairline per level.
  '.' + CLS + '-row[data-depth="2"]{padding-left:22px}',
  '.' + CLS + '-row[data-depth="3"]{padding-left:34px}',
  '.' + CLS + '-row[data-depth="4"]{padding-left:46px}',
  '.' + CLS + '-row[data-depth="2"]::before,' + '.' + CLS + '-row[data-depth="3"]::before,' + '.' + CLS + '-row[data-depth="4"]::before{content:"";position:absolute;top:8px;bottom:8px;width:1px;background:var(--dsw-alias-border-l2)}',
  '.' + CLS + '-row[data-depth="2"]::before{left:16px}',
  '.' + CLS + '-row[data-depth="3"]::before{left:28px}',
  '.' + CLS + '-row[data-depth="4"]::before{left:40px}',

  // Title line: state mark, identity, activity badge.
  '.' + CLS + '-head{display:flex;align-items:center;gap:6px;min-width:0}',
  '.' + CLS + '-label{flex:1;min-width:0;overflow:hidden;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px;font-weight:400;text-overflow:ellipsis;white-space:nowrap}',
  '.' + CLS + '-row[data-running=true] .' + CLS + '-label{font-weight:600}',

  // Badge line: aligned under the label, not under the state mark.
  '.' + CLS + '-meta{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding-left:14px}',
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
