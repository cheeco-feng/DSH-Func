/** dsh-client-ui-timeline-rail —— 宿主半边。纯客户端 UI 插件：空 apply 仅为了让
 *  插件出现在 host 的 cordis.yml / Loader；浏览器端行为由 exports["./client"]
 *  提供，经 package.json 的 dsh.client 声明被发现。 */
function apply() {}
export { apply };
