import { apply, STATE_PATH, OUTPUT_PATH } from './lib/index.mjs';

// ---- mock ctx：模拟宿主注入的 webServer / jobs / agents ----
const routes = {};
let captured = null;
let capturedStatus = null;
let capturedHeaders = null;

const mkRes = () => {
  const res = {
    writeHead(s, h) { capturedStatus = s; capturedHeaders = h; },
    end(body) { captured = body; }
  };
  return res;
};

const t1 = { id: 't1', kind: 'bash', label: 'build', status: 'running', detail: 'building lib', startedAt: Date.now() - 1000, ownerSession: 'sess-A' };
const t2 = { id: 't2', kind: 'bash', label: 'rebuild', status: 'completed', startedAt: 0, finishedAt: Date.now(), ownerSession: undefined };

const ctx = {
  agents: { list: () => ['A', 'B'] },
  jobs: {
    list(agent) {
      if (agent === 'A') return [t1];
      if (agent === 'B') return [];
      return [t2]; // no arg -> unowned
    },
    read(id, caller) {
      return { text: 'output-line\n', snapshot: { id, status: id === 't1' ? 'running' : 'completed' } };
    }
  },
  effect(fn) { fn(); },
  webServer: {
    register(o) { routes[o.path] = o.handler; return () => {}; }
  }
};

apply(ctx);
console.log('ROUTES:', Object.keys(routes));
console.log('state handler type=', typeof routes[STATE_PATH], 'output handler type=', typeof routes[OUTPUT_PATH]);

async function call(path, url) {
  captured = null; capturedStatus = null;
  const res = mkRes();
  await routes[path]({ url: url ?? path }, res);
  return captured;
}

let ok = true;
function check(name, cond, extra = '') {
  console.log((cond ? 'PASS' : 'FAIL') + ' :: ' + name + (extra ? '  [' + extra + ']' : ''));
  if (!cond) ok = false;
}

// ---- state 路由 ----
const stateRaw = await call(STATE_PATH);
const state = JSON.parse(stateRaw);
const ids = state.tasks.map((t) => t.id).sort();
check('state returns tasks (t1 + unowned t2)', state.tasks.length === 2 && ids.join(',') === 't1,t2', ids.join(','));
check('task wire shape (label/ownerSession)', state.tasks[0].label === 'build' && state.tasks[0].ownerSession === 'sess-A');
check('groups correct', state.groups.length === 2 && state.groups[0].owner === 'sess-A' && state.groups[0].running === 1, JSON.stringify(state.groups));
check('generatedAt present', typeof state.generatedAt === 'number');

// ---- output 路由 ----
const outRaw = await call(OUTPUT_PATH, OUTPUT_PATH + '?id=t1');
const out = JSON.parse(outRaw);
check('output: full:true + accumulated text', out.full === true && typeof out.text === 'string' && out.text.length > 0, JSON.stringify(out.text));
check('output: snapshot present', out.snapshot && out.snapshot.id === 't1');

// ---- 未知任务 -> 404 ----
const miss = await call(OUTPUT_PATH, OUTPUT_PATH + '?id=nope');
check('unknown task -> 404/error', capturedStatus === 404 || /error/i.test(JSON.stringify(miss)), 'status=' + capturedStatus);

// ---- 镜像补丁：插件自读与官方 read 看到同源增量 ----
const a1 = JSON.parse(await call(OUTPUT_PATH, OUTPUT_PATH + '?id=t1')).text;
const a2 = JSON.parse(await call(OUTPUT_PATH, OUTPUT_PATH + '?id=t1')).text;
check('accumulated output grows/stable (mirror no-lost)', a1.length > 0 && a2.length >= a1.length, 'a1=' + JSON.stringify(a1) + ' a2=' + JSON.stringify(a2));

console.log('\n=== RESULT: ' + (ok ? 'ALL PASS' : 'SOME FAIL') + ' ===');
process.exit(ok ? 0 : 1);
