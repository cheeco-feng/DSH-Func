// dsh-web-ui-PowerPackagePanel — node half. Pure UI plugin: empty apply so the
// plugin appears in the host cordis.yml / Loader; the browser half ships via
// exports["./client"], discovered through the package.json dsh.client declaration.
function apply() {}
export { apply };
