#!/usr/bin/env node
/**
 * 一键发布一个 cheeco DSH 插件：
 *   校验 → 升版本(package.json + PLUGIN_VERSION) → npm pack 出 tgz → 创建/更新 GitHub release → 上传 tgz 资产
 *   → 刷新 CHEECO_FEATURES 的 install 下载 URL → git commit → git push。
 *
 * 设计要点（对应产品里“功能推荐”的安装源）：
 *   - 安装源必须是 GitHub release 资产 URL（永远不走 npm）。
 *   - 功能列表 CHEECO_FEATURES 是手写的，位于 dsh-web-ui-cheeco-style/lib/index.js；
 *     发布某个插件后，脚本会把该插件在本仓库“功能推荐”里的 install 指向新 release 的资产 URL。
 *   - 因为功能列表随 dsh-web-ui-cheeco-style 一起打包发布，所以发布“非 style”插件时，默认会
 *     把 style 升一个 patch 并再次发布（让新的 install URL 真正到达用户），可用 --no-ship-style 关闭。
 *   - 中文 release 名/说明统一走 Node 写入（PowerShell 会乱码），JSON 一律无 BOM UTF-8。
 *
 * 用法：
 *   node publish.mjs <folder> <version> [--dry-run] [--no-ship-style] [--token <gh_token>]
 *
 * 示例（本地预览，什么都不改，只打印计划）：
 *   node publish.mjs dsh-web-ui-cheeco-style 0.8.0 --dry-run
 * 示例（正式发布 style 0.8.0）：
 *   node publish.mjs dsh-web-ui-cheeco-style 0.8.0
 *
 * token 顺序：--token > $env:GITHUB_TOKEN > $env:GH_TOKEN > `git credential fill`。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

// ---- 仓库常量 --------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = __dirname;                                 // 仓库根（本文件所在目录）
const RELEASE_DIR = process.env.CHEECO_RELEASE_DIR || join(dirname(REPO_DIR), "release");
const OWNER = process.env.CHEECO_GH_OWNER || "cheeco-feng";
const REPO = process.env.CHEECO_GH_REPO || "DSH-Func";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const UPLOAD_API = `https://uploads.github.com/repos/${OWNER}/${REPO}/releases`;
const DOWNLOAD_BASE = `https://github.com/${OWNER}/${REPO}/releases/download`;

const STYLE_FOLDER = "dsh-client-ui-plugin-push";             // 承载“功能推荐”列表的插件（原为 style，现已独立）
const STYLE_LIB = join(REPO_DIR, STYLE_FOLDER, "lib");
const PLUGIN_FILE = join(STYLE_LIB, "index.js");             // 宿主入口（PLUGIN_VERSION 常量在这，若存在）
const FEATURE_FILE = join(STYLE_LIB, "cheeco-features.js"); // 功能推荐列表（独立文件，改它即可加插件）

/** folder -> { id(功能推荐 id), label(release 名前缀), pkg(包名) }。 */
const META = {
  "dsh-web-ui-cheeco-style":        { id: "style",  label: "cheeco 界面/声音设置", pkg: "@cheeco/dsh-web-ui-cheeco-style" },
  "dsh-client-ui-message-sound":    { id: "sound",  label: "cheeco AI 回复提示音", pkg: "@cheeco/dsh-client-ui-message-sound" },
  "dsh-client-ui-session-search":   { id: "search", label: "cheeco 会话内容检索", pkg: "@cheeco/dsh-client-ui-session-search" },
  "dsh-tool-dsh-plugin-exec":       { id: "dshcmd", label: "cheeco DSH功能命令", pkg: "@cheeco/dsh-tool-dsh-plugin-exec" },
  "dsh-client-ui-plugin-manager":   { id: "pmgr",   label: "cheeco 插件管理器", pkg: "@cheeco/dsh-client-ui-plugin-manager" },
  "dsh-client-ui-session-deeplink": { id: "deeplink", label: "cheeco 会话深链接", pkg: "@cheeco/dsh-client-ui-session-deeplink" },
  "dsh-client-ui-timeline-rail":   { id: "timeline", label: "cheeco 会话时间轴", pkg: "@cheeco/dsh-client-ui-timeline-rail" },
  "dsh-client-ui-plugin-push":     { id: "push",     label: "cheeco 功能推荐（插件中心）", pkg: "@cheeco/dsh-client-ui-plugin-push" },
  "dsh-client-ui-task-status":     { id: "taskstatus", label: "cheeco 后台任务状态条", pkg: "@cheeco/dsh-client-ui-task-status" },
  "dsh-cmdwatch":                  { id: "cmdwatch",  label: "cheeco 命令窗", pkg: "@cheeco/dsh-cmdwatch" },
  "dsh-client-ui-mobile":          { id: "mobile",    label: "cheeco 移动端适配", pkg: "@cheeco/dsh-client-ui-mobile" },
  "dsh-client-ui-system-info":     { id: "systeminfo", label: "cheeco 系统信息", pkg: "@cheeco/dsh-client-ui-system-info" },
  "dsh-web-ui-web_user_center":    { id: "usercenter", label: "cheeco 用户中心", pkg: "@cheeco/dsh-web-ui-web_user_center" },
};

// ---- 参数解析 --------------------------------------------------------------
function parseArgv(argv) {
  const flags = { dry: false, shipStyle: true };
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") flags.dry = true;
    else if (a === "--no-ship-style") flags.shipStyle = false;
    else if (a === "--token") { flags.token = argv[++i]; }
    else if (a === "--help" || a === "-h") flags.help = true;
    else positionals.push(a);
  }
  return { ...flags, folder: positionals[0], version: positionals[1] };
}

// ---- 小工具 ----------------------------------------------------------------
function log(msg) { console.log(msg); }
function warn(msg) { console.warn("\u26A0 " + msg); }
function fail(msg) { console.error("\u2717 " + msg); process.exit(1); }

function readPkgVersion(folder) {
  const p = join(REPO_DIR, folder, "package.json");
  try { return JSON.parse(readFileSync(p, "utf8")).version; } catch (e) { return ""; }
}

/** 无 BOM UTF-8 写文本。 */
function writeText(path, content) {
  writeFileSync(path, content, "utf8");
}

/** 提升 package.json 的 version 字段（只改这一个字段，保留其余排版/中文）。 */
function bumpPkgVersion(folder, next) {
  const p = join(REPO_DIR, folder, "package.json");
  let s = readFileSync(p, "utf8");
  const re = /("version"\s*:\s*)"[^"]*"/;
  if (!re.test(s)) fail(`${folder}/package.json 里没找到 version 字段`);
  s = s.replace(re, `$1"${next}"`);
  writeText(p, s);
}

/** 提升插件里 PLUGIN_VERSION 常量（与 package.json 同步）；若无该常量（如 push 纯 class 宿主）则跳过。 */
function bumpPluginVersionConst(next) {
  let s;
  try { s = readFileSync(PLUGIN_FILE, "utf8"); } catch (e) { warn(`未找到 ${PLUGIN_FILE}，跳过 PLUGIN_VERSION 同步`); return; }
  const re = /(const\s+PLUGIN_VERSION\s*=\s*)"[^"]*"/;
  if (!re.test(s)) { warn("未找到 PLUGIN_VERSION 常量，跳过（push 等 class 宿主无此常量）"); return; }
  s = s.replace(re, `$1"${next}"`);
  writeText(PLUGIN_FILE, s);
}

/** 刷新功能列表里某插件的 install 下载 URL，指向新 release 的资产 URL。返回是否命中。 */
function refreshFeatureInstall(folder, version, tgzFile) {
  const meta = META[folder];
  if (!meta || !meta.id) return false;
  let s = readFileSync(FEATURE_FILE, "utf8");
  const newUrl = `${DOWNLOAD_BASE}/v${version}/${basename(tgzFile)}`;
  const re = new RegExp('(id: "' + meta.id + '".*?install: )"[^"]*"');
  if (!re.test(s)) { warn(`未在功能推荐列表找到 id="${meta.id}" 的条目（可能已不在列表中）`); return false; }
  s = s.replace(re, `$1"${newUrl}"`);
  writeText(FEATURE_FILE, s);
  log(`  功能推荐列表 ${meta.id} 的 install -> ${newUrl}`);
  return true;
}

/** npm pack：把插件打包到 release 目录，返回 tgz 全路径。 */
function pack(folder, version) {
  const dir = join(REPO_DIR, folder);
  const expected = `cheeco-${folder}-${version}.tgz`;
  mkdirSync(RELEASE_DIR, { recursive: true });
  log(`\n  npm pack ${folder} -> ${RELEASE_DIR}`);
  // npm 在 Windows 偶发假报退出码 1，故以产物落盘为准
  spawnSync(process.platform === "win32" ? "npm.cmd" : "npm",
    ["pack", "--pack-destination", RELEASE_DIR],
    { cwd: dir, encoding: "utf8", stdio: "inherit" });
  const file = join(RELEASE_DIR, expected);
  if (!existsSync(file)) {
    // 兜底：扫描同名
    const found = (readdirSync(RELEASE_DIR) || []).filter((f) => f === expected);
    if (found.length === 0) fail(`打包后未找到 ${expected}（npm 可能没装好）；请检查 release 目录。`);
  }
  return file;
}

// ---- GitHub token ----------------------------------------------------------
function getToken(cliToken) {
  if (cliToken) return cliToken;
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    const out = execFileSync("git", ["credential", "fill"], {
      input: "protocol=https\nhost=github.com\n\n", encoding: "utf8"
    });
    const m = out.match(/password=(.+)/);
    return m ? m[1].trim() : "";
  } catch (e) { return ""; }
}

// ---- GitHub API ------------------------------------------------------------
async function gh(url, opts = {}, token) {
  const headers = { accept: "application/vnd.github+json", ...(opts.headers || {}) };
  if (token) headers.authorization = `Bearer ${token}`;
  let body = opts.body;
  if (typeof body === "string" && !headers["content-type"]) headers["content-type"] = "application/json; charset=utf-8";
  return fetch(url, { ...opts, headers, body });
}

async function getOrCreateRelease(version, meta, token, dry) {
  const tag = `v${version}`;
  if (dry) {
    log(`  [dry] release tag=${tag}  name="${meta.label} ${version}"  body="Cheeco DSH 插件包 v${version} · ${meta.label.replace(/^cheeco /, "")}"`);
    return { id: null, tag, created: null };
  }
  // 先查是否已存在同 tag 的 release（幂等）
  let r = await gh(`${API}/releases/tags/${tag}`, {}, token);
  if (r.ok) {
    const j = await r.json();
    log(`  release 已存在（tag=${tag}），复用 id=${j.id}`);
    return { id: j.id, tag, created: false };
  }
  const payload = {
    tag_name: tag, target_commitish: "main",
    name: `${meta.label} ${version}`,
    body: `Cheeco DSH 插件包 v${version} · ${meta.label.replace(/^cheeco /, "")}`,
    draft: false, prerelease: false
  };
  r = await gh(`${API}/releases`, { method: "POST", body: JSON.stringify(payload) }, token);
  if (!r.ok) {
    showNetError("创建 release 失败", r);
    fail(`创建 release 失败（HTTP ${r.status}）：${await safeText(r)}`);
  }
  const j = await r.json();
  log(`  release 已创建（tag=${tag}，id=${j.id}）`);
  return { id: j.id, tag, created: true };
}

async function uploadAsset(releaseId, file, token, dry) {
  const name = basename(file);
  if (dry) { log(`  [dry] 上传资产 ${name}（${await sizeOf(file)} 字节）`); return; }
  // 已存在同名资产就先删，再重新上传（幂等）
  const listR = await gh(`${API}/releases/${releaseId}/assets?per_page=100`, {}, token);
  const assets = listR.ok ? (await listR.json()) : [];
  const existing = (assets || []).find((a) => a.name === name);
  if (existing) {
    log(`  资产 ${name} 已存在，先删除旧资产 id=${existing.id}`);
    const delR = await gh(`${API}/releases/assets/${existing.id}`, { method: "DELETE" }, token);
    if (!delR.ok && delR.status !== 404) warn(`删除旧资产失败（HTTP ${delR.status}），继续上传`);
  }
  const buf = readFileSync(file);
  const r = await gh(`${UPLOAD_API}/${releaseId}/assets?name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream" },
    body: buf
  }, token);
  if (!r.ok) {
    showNetError("上传资产失败", r);
    fail(`上传资产失败（HTTP ${r.status}）：${await safeText(r)}`);
  }
  log(`  资产已上传 ${name}`);
}

function showNetError(what, r) {
  const hint = r.status === 404 ? "（404：上传请用 uploads.github.com，且仓库/资产要存在）"
    : r.status === 422 ? "（422：名称/资产冲突，或已存在）"
    : r.status === 401 || r.status === 403 ? "（鉴权：token 无效或没写权限）"
    : "";
  warn(`${what}（HTTP ${r.status}）${hint}`);
}

async function safeText(r) { try { return await r.text(); } catch (e) { return ""; } }
function sizeOf(file) { try { return readFileSync(file).length; } catch (e) { return "?"; } }

// ---- git -------------------------------------------------------------------
function git(...args) {
  execFileSync("git", args, { cwd: REPO_DIR, stdio: "pipe" });
}
function commitAndPush(files, message) {
  const rel = files.map((f) => f.replace(/^[\\/]+/, "").replace(/\\/g, "/"));
  log(`  git add ${rel.join(" ")}`);
  git("add", ...rel);
  const st = execFileSync("git", ["status", "--porcelain"], { cwd: REPO_DIR, encoding: "utf8" });
  if (!st.trim()) { log("  无改动可提交（已是最新）。"); return; }
  log(`  git commit -m "${message}"`);
  git("commit", "-m", message);
  log("  git push");
  git("push");
}

// ---- 主流程 ----------------------------------------------------------------
async function main() {
  const A = parseArgv(process.argv.slice(2));
  if (A.help || !A.folder || !A.version) {
    log(`用法：node publish.mjs <folder> <version> [--dry-run] [--no-ship-style] [--token <gh_token>]`);
    log(`可选 folder：${Object.keys(META).join(" / ")}`);
    process.exit(A.help ? 0 : 1);
  }
  const folder = A.folder;
  const version = A.version;
  const dry = A.dry;

  if (!META[folder]) fail(`未知插件 folder：${folder}`);
  if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`版本号格式应为 x.y.z：${version}`);
  if (!existsSync(join(REPO_DIR, folder, "package.json"))) fail(`${folder}/package.json 不存在`);

  const meta = META[folder];
  const cur = readPkgVersion(folder);
  log(`\n=== 一键发布 ${folder} ${cur} -> ${version}${dry ? "（DRY-RUN，只展示计划）" : ""} ===`);

  if (cur === version) warn(`当前版本已是 ${version}（版本未变，release/资产可能已存在，需手动确认）`);

  const willShipStyle = folder !== STYLE_FOLDER && A.shipStyle;
  if (folder !== STYLE_FOLDER) {
    log(`\n说明：功能推荐列表在 ${STYLE_FOLDER} 里，发布 ${folder} 会刷新其中 ${meta.id} 的 install URL。`);
    if (willShipStyle) log(`      同时把 ${STYLE_FOLDER} 升一个小版本并再次发布，让新的 install URL 真正送达用户。`);
    else log(`      本次只提交新的 install URL（不重发 ${STYLE_FOLDER}）。`);
  }

  if (dry) {
    log(`\n[计划] 将修改并提交：`);
    log(`  - ${folder}/package.json  version ${cur} -> ${version}`);
    if (folder === STYLE_FOLDER) log(`  - ${STYLE_FOLDER}/lib/index.js  PLUGIN_VERSION -> ${version}`);
    const tgzName = `cheeco-${folder}-${version}.tgz`;
    log(`  - ${STYLE_FOLDER}/lib/index.js（功能列表 ${meta.id} 的 install）-> ${DOWNLOAD_BASE}/v${version}/${tgzName}`);
    log(`\n[计划] 将打包：${tgzName} -> ${RELEASE_DIR}`);
    log(`\n[计划] 将创建/更新 release：v${version}`);
    log(`\n[计划] 将上传资产：${tgzName}（${RELEASE_DIR}\\${tgzName}，需该文件存在）`);
    const commitMsg = `chore(${folder}): v${version} 发布（npm pack + GitHub release 资产 + 更新功能推荐 install URL）`;
    log(`\n[计划] 提交信息：${commitMsg}`);
    if (willShipStyle) { /* style 重发不细化，仅提示 */ log(`\n[计划] 还会把 ${STYLE_FOLDER} 升 patch 并发布（--no-ship-style 可关）。`); }
    log(`\n（dry-run 结束，未改动任何文件）`);
    return;
  }

  const token = getToken(A.token);
  if (!token) fail("未拿到 GitHub token（可用 --token 或环境变量 GITHUB_TOKEN 提供）。");

  // 1) 升版本（先升版本，让 npm pack 的产物名带上新版本）
  log(`\n[1/5] 升版本 ${cur} -> ${version}`);
  bumpPkgVersion(folder, version);
  if (folder === STYLE_FOLDER) bumpPluginVersionConst(version);

  // 2) 刷新功能列表 install URL（style 的话同时清自己的 PLUGIN_VERSION 已在上一步）
  const tgzFile = join(RELEASE_DIR, `cheeco-${folder}-${version}.tgz`);
  log(`\n[2/5] 刷新功能推荐 install URL`);
  refreshFeatureInstall(folder, version, tgzFile);

  // 3) 打包
  log(`\n[3/5] npm pack`);
  const packed = pack(folder, version);

  // 4) 提交 + 推送（让 main 上的 package.json/功能列表反映新版本，release tag 指向这次提交）
  const filesToCommit = [join(folder, "package.json"), PLUGIN_FILE, FEATURE_FILE];
  log(`\n[4/5] 提交并推送`);
  let styleVersion = null;
  if (willShipStyle) {
    // 把 style 升 patch，重新打包，并在最后重发，让新 install URL 真正到达用户
    styleVersion = nextPatch(readPkgVersion(STYLE_FOLDER));
    log(`  联动：${STYLE_FOLDER} ${readPkgVersion(STYLE_FOLDER)} -> ${styleVersion}（为让新 install URL 生效）`);
    bumpPkgVersion(STYLE_FOLDER, styleVersion);
    bumpPluginVersionConst(styleVersion);
    filesToCommit.push(join(STYLE_FOLDER, "package.json"), PLUGIN_FILE, FEATURE_FILE);
  }
  const commitMsg = `chore(${folder}): v${version} 发布（npm pack + GitHub release 资产 + 更新功能推荐 install URL${willShipStyle ? "；联动重发 " + STYLE_FOLDER + " v" + styleVersion : ""}）`;
  commitAndPush([...new Set(filesToCommit)], commitMsg);

  // 5) 创建 release + 上传资产
  log(`\n[5/5] release + 上传资产`);
  const rel = await getOrCreateRelease(version, meta, token, false);
  await uploadAsset(rel.id, packed, token, false);

  if (willShipStyle) {
    // 联动重发 style：先刷新列表？列表已改（含 install URL），直接打包 style（版本已升）并发布
    const styleMeta = META[STYLE_FOLDER];
    const styleTgz = pack(STYLE_FOLDER, styleVersion);
    const rel2 = await getOrCreateRelease(styleVersion, styleMeta, token, false);
    await uploadAsset(rel2.id, styleTgz, token, false);
    log(`\n联动发布完成：${STYLE_FOLDER} v${styleVersion}`);
  }

  log(`\n=== 发布完成：${folder} v${version}（${basename(packed)}）===\n`);
}

/** version 的下一 patch（x.y.z -> x.y.(z+1)）。 */
function nextPatch(v) {
  const m = String(v || "0.0.0").split(".").map(Number);
  return `${m[0]}.${m[1]}.${(m[2] || 0) + 1}`;
}

await main();
