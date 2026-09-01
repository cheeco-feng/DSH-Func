#!/usr/bin/env node
/**
 * 批量发布脚本（publish-all.mjs）：把 `release/` 里针对每个 cheeco 插件已打好包的
 * `cheeco-<folder>-<version>.tgz` 批量同步到 GitHub release（创建/复用 tag，上传/替换资产）。
 *
 * 与 publish.mjs 的区别：
 *   - publish.mjs    ：逐个插件「升版本 → npm pack → 建/更 release → 上传资产 → 刷 install URL → commit+push」。
 *   - publish-all.mjs：只做「把 release/ 已存在的一整套 tgz 上传到 GitHub，让清单声明的每个版本都有可下载资产」。不改源码、不 pack、不 commit。
 *
 * 用法：
 *   node publish-all.mjs                # DRY-RUN，仅打印每个插件：是否需要新建 release / 上传资产
 *   node publish-all.mjs --apply        # 真实执行：创建缺失 release + 上传/替换缺失资产
 *
 * token 读取顺序：环境变量 GITHUB_TOKEN > GH_TOKEN > <DSH_HOME>/.github-token.txt（DSH_HOME 默认 = 本目录的上一级）。
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = __dirname;                                        // 本脚本所在目录（DSH-Func 仓库根）
const DSH_HOME = process.env.DSH_HOME || dirname(REPO_DIR);        // DSH 数据根（release 在其下）
const RELEASE_DIR = process.env.CHEECO_RELEASE_DIR || join(DSH_HOME, "release");
const OWNER = process.env.CHEECO_GH_OWNER || "cheeco-feng";
const REPO = process.env.CHEECO_GH_REPO || "DSH-Func";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const UPLOAD = `https://uploads.github.com/repos/${OWNER}/${REPO}/releases`;

const apply = process.argv.includes("--apply");

/** 取 GitHub token：环境变量优先，回退 <DSH_HOME>/.github-token.txt。 */
function getToken() {
  const cands = [process.env.GITHUB_TOKEN, process.env.GH_TOKEN, readTokenFile(join(DSH_HOME, ".github-token.txt"))];
  return cands.find((t) => t && t.trim()) || "";
}
function readTokenFile(p) {
  try { return readFileSync(p, "utf8").trim(); } catch (e) { return ""; }
}
const tok = getToken();
if (!tok) { console.error("!! 未拿到 GitHub token（可设环境变量 GITHUB_TOKEN / GH_TOKEN）。"); process.exit(1); }

/** 读版本清单（唯一真源），得到要发布的插件集合。 */
const manifestPath = join(REPO_DIR, "cheeco-dsh-plugins.json");
let manifest;
try { manifest = JSON.parse(readFileSync(manifestPath, "utf8")); } catch (e) { console.error("!! 无法解析清单 " + manifestPath + "：" + e.message); process.exit(1); }

/** 目标版本 = 各插件 package.json 的 version；tgz 必须在 release/ 存在。 */
function pkgVer(folder) {
  try { return JSON.parse(readFileSync(join(REPO_DIR, folder, "package.json"), "utf8")).version; } catch (e) { return ""; }
}
const targets = manifest.plugins
  .filter((p) => p.folder)
  .map((p) => {
    const version = pkgVer(p.folder);
    const tgz = join(RELEASE_DIR, `cheeco-${p.folder}-${version}.tgz`);
    return { folder: p.folder, version, tgz, tgzExists: existsSync(tgz) };
  })
  .filter((t) => t.version);

async function gh(url, opts = {}) {
  return fetch(url, { ...opts, headers: { Authorization: "Bearer " + tok, Accept: "application/vnd.github+json", "User-Agent": "dsh-agent", ...(opts.headers || {}) } });
}

// ---- 拉取现有 release，建立 tag → release 映射 ----
const relR = await gh(`${API}/releases?per_page=100`);
const releases = relR.ok ? await relR.json() : [];
const relByTag = new Map();
for (const r of releases) relByTag.set(r.tag_name, r);

console.log("=== 批量发布计划（" + (apply ? "APPLY 真实执行" : "DRY-RUN 仅预览") + "）===");
const plan = [];
for (const t of targets) {
  const tag = `v${t.version}`;
  const assetName = `cheeco-${t.folder}-${t.version}.tgz`;
  const rel = relByTag.get(tag);
  const relExists = !!rel;
  const assetInTag = rel && Array.isArray(rel.assets) && rel.assets.some((a) => a.name === assetName);
  let status;
  if (!t.tgzExists) status = "MISSING_TGZ";
  else if (!relExists && !assetInTag) status = "CREATE_RELEASE+UPLOAD";
  else if (relExists && !assetInTag) status = "UPLOAD_TO_EXISTING";
  else status = "ALREADY_PRESENT";
  plan.push({ ...t, tag, assetName, relExists, assetInTag, status });
  console.log("  " + status.padEnd(20) + t.folder.padEnd(38) + t.version + "  tag=" + tag + (t.tgzExists ? "" : "  [!tgz缺失]"));
}

console.log("\n新 release 需建(个): " + plan.filter((p) => p.status === "CREATE_RELEASE+UPLOAD").length);
console.log("需上传到已有 tag(个): " + plan.filter((p) => p.status === "UPLOAD_TO_EXISTING").length);
console.log("已存在无需处理(个): " + plan.filter((p) => p.status === "ALREADY_PRESENT").length);
const missing = plan.filter((p) => p.status === "MISSING_TGZ");
if (missing.length) console.log("!! tgz 缺失无法发布: " + missing.map((m) => m.folder).join(", "));

if (!apply) { console.log("\n（DRY-RUN 结束，未改动任何 GitHub/文件）"); process.exit(0); }

// ---- APPLY：创建缺失 release / 上传资产（同一 tag 承载多插件资产，幂等） ----
async function ensureRelease(version, folder) {
  const tag = `v${version}`;
  let rel = relByTag.get(tag);
  if (rel) { console.log("  release 已存在 tag=" + tag + " id=" + rel.id); return rel.id; }
  const payload = {
    tag_name: tag, target_commitish: "main",
    name: `cheeco ${folder} ${version}`,
    body: `Cheeco DSH 插件包 v${version} · ${folder}`,
    draft: false, prerelease: false
  };
  const r = await gh(`${API}/releases`, { method: "POST", body: JSON.stringify(payload) });
  if (!r.ok) { console.error("!! 创建 release 失败 " + tag + " HTTP " + r.status + " " + (await r.text()).slice(0, 200)); process.exit(1); }
  const j = await r.json();
  relByTag.set(tag, j);
  console.log("  创建 release 成功 tag=" + tag + " id=" + j.id);
  return j.id;
}
async function uploadAsset(relId, file) {
  const name = basename(file);
  // 幂等：同 tag 内同名旧资产先删再传
  const listR = await gh(`${API}/releases/${relId}/assets?per_page=100`);
  const assets = listR.ok ? await listR.json() : [];
  const old = assets.find((a) => a.name === name);
  if (old) { await gh(`${API}/releases/assets/${old.id}`, { method: "DELETE" }); console.log("  删除旧资产 " + name); }
  const buf = readFileSync(file);
  const r = await fetch(`${UPLOAD}/${relId}/assets?name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { Authorization: "Bearer " + tok, Accept: "application/vnd.github+json", "content-type": "application/octet-stream", "User-Agent": "dsh-agent" },
    body: buf
  });
  if (!r.ok) { console.error("!! 上传资产失败 " + name + " HTTP " + r.status + " " + (await r.text()).slice(0, 200)); process.exit(1); }
  console.log("  上传资产成功 " + name);
}

console.log("\n=== 开始执行发布 ===");
for (const p of plan.filter((x) => x.status !== "ALREADY_PRESENT" && x.status !== "MISSING_TGZ")) {
  console.log("[" + p.folder + " " + p.version + "]");
  const relId = await ensureRelease(p.version, p.folder);
  await uploadAsset(relId, p.tgz);
}
console.log("\n=== GitHub 资产发布完成 ===");
