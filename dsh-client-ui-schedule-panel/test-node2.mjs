import { apply, STATE_PATH } from './lib/index.mjs';

const ASSIGN_PATH = '/plugins/dsh-schedule-panel/assign';
const routes = {};
let capturedOptions = null;
let capturedBody = null;

function asyncIter(pieces) {
  let i = 0;
  return {
    [Symbol.asyncIterator]() {
      return { next() { return Promise.resolve(i < pieces.length ? { done: false, value: pieces[i++] } : { done: true }); } };
    }
  };
}

const ctx = {
  agents: { list: () => [] },
  jobs: { list: () => [], read: (id) => ({ text: '', snapshot: { id } }) },
  llm: {
    stream(options) { capturedOptions = options; return asyncIter([]); }
  },
  effect(fn) { this._dispose = fn(); },
  webServer: { register(o) { routes[o.path] = o.handler; return () => {}; } }
};

apply(ctx);

const res = { writeHead(s) { this._status = s; }, end(b) { capturedBody = b; } };

async function setAssign(session, task, provider, model) {
  capturedBody = null;
  const body = JSON.stringify({ session, task, provider, model });
  const req = { method: 'POST', url: `${ASSIGN_PATH}?session=${session}`, [Symbol.asyncIterator]: () => asyncIter([body])[Symbol.asyncIterator]() };
  await routes[ASSIGN_PATH](req, res);
}

function callStream(opts) { capturedOptions = null; ctx.llm.stream(opts); return capturedOptions; }

let ok = true;
function check(name, cond, extra = '') { console.log((cond ? 'PASS' : 'FAIL') + ' :: ' + name + (extra ? '  [' + extra + ']' : '')); if (!cond) ok = false; }

(async () => {
  // 未分配：compaction 调用应透传原模型
  const passthrough = callStream({ purpose: 'compaction', sessionId: 's2', provider: 'ollama', model: 'qwen3:8b' });
  check('unassigned compaction passes through original model', passthrough.provider === 'ollama' && passthrough.model === 'qwen3:8b', JSON.stringify({ p: passthrough.provider, m: passthrough.model }));

  // 分配 s1 的 compaction -> deepseek-official
  await setAssign('s1', 'compaction', 'deepseek-official', 'deepseek-v4-flash-vision-exp');
  check('assign route stored', typeof capturedBody === 'string' && /deepseek-official/.test(capturedBody), capturedBody);

  // 同名会话的 compaction 调用 -> 覆盖为 deepseek-official
  const overridden = callStream({ purpose: 'compaction', sessionId: 's1', provider: 'ollama', model: 'qwen3:14b-diy' });
  check('assigned compaction overridden to deepseek-official', overridden.provider === 'deepseek-official' && overridden.model === 'deepseek-v4-flash-vision-exp', JSON.stringify({ p: overridden.provider, m: overridden.model }));

  // 非 compaction 调用 -> 不覆盖
  const chat = callStream({ purpose: 'chat', sessionId: 's1', provider: 'ollama', model: 'qwen3:14b-diy' });
  check('non-compaction call not overridden', chat.provider === 'ollama' && chat.model === 'qwen3:14b-diy');

  console.log('\n=== RESULT: ' + (ok ? 'ALL PASS' : 'SOME FAIL') + ' ===');
  process.exit(ok ? 0 : 1);
})();
