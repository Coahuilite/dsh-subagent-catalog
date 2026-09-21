/**
 * dsh-subagent-catalog, node half. Pure UI plugin: the empty apply exists so
 * the package can be a Loader entry; the browser half ships as lib/client.js
 * and is discovered from the package.json dsh.client declaration.
 */

/** Host plugin body — no host-side behavior for this source plugin. */
export function apply(): void {}
