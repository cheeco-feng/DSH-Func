/** dsh-web-ui-cheeco-style host half 鈥?minimal Cordis plugin (class shape).
    Cordis loads a plugin whose default export is a class by `new Class(ctx, config)`
    (see cordis Fiber execute: `isConstructor(runtime.callback)` 鈫?`new`). This is
    the same shape official @deepseek-ai host plugins use (e.g. dsh-host-webserver),
    so it is guaranteed to load. All real work lives in the browser half. */
export default class DshWebUiPatches {
  static name = "web-ui-patches";
  static inject = [];

  constructor(ctx, config) {
    // Deliberately empty: no host routes, no tools, no systemPrompt section.
    // Keeping the constructor side-effect free guarantees a trivially-loadable
    // plugin whose only job is to register the browser half.
  }
}
