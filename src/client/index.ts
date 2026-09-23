/**
 * dsh-subagent-catalog, browser half: one Session-header control listing every
 * subagent beneath the current session.
 *
 * It contributes to the public `conversation.session.header.actions` list slot
 * and reaches everything else through declared services, so installing or
 * removing the plugin changes nothing in any other package: unloading the row
 * removes the control and its effect disposers.
 *
 * @module dsh-subagent-catalog
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the `ctx.uiWorkspace` Context merge.
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import { en, NS, zh, type SubagentCatalogKey } from './locales.ts'
import { installStyles } from './styles.ts'
import { SubagentCatalogAction, type SubagentCatalogInjected } from './SubagentCatalogAction.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Session-header subagent catalog copy. */
    'subagent-catalog': SubagentCatalogKey
  }
}

export type { SubagentCatalogActionProps, SubagentCatalogInjected, SubagentOpenRequest } from './SubagentCatalogAction.tsx'
export type { SubagentRow, SubagentRowModel } from './rows.ts'

/** Required services: the slot registry, the locale registry, and workspace navigation. */
export const inject = ['slots', 'locale', 'uiWorkspace']

/**
 * Client plugin body: register the dictionary and the header control.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'subagent-catalog: dictionaries')
  // Owned by the plugin fiber: unloading removes the sheet with everything else.
  ctx.effect(installStyles, 'subagent-catalog: stylesheet')
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    // Distinct from the official ui-subagent seat (`id: 'subagent-catalog'`).
    // Duplicate list ids throw and mark the later plugin failed at web boot.
    id: 'dsh-subagent-catalog',
    // After the header's own actions, before Session utilities.
    order: 20,
    locale: NS,
    inject: (): SubagentCatalogInjected => ({
      openSubagent: (request) => { ctx.uiWorkspace.openSession(request) },
    }),
  }, SubagentCatalogAction))
}
