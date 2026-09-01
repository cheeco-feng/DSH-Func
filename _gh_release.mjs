import { readFileSync } from "node:fs";
import { join, basename } from "node:path";

const token = readFileSync("F:\\DeepSeekHarnessDataOriginal\\.github-token.txt", "utf8").trim();
const REPO = "cheeco-feng/DSH-Func";
const API = `https://api.github.com/repos/${REPO}`;
const UPLOAD = `https://uploads.github.com/repos/${REPO}/releases`;
const RELEASE_DIR = "F:\\DeepSeekHarnessDataOriginal\\release";

const targets = [
  { tag: "v0.1.0", name: "cheeco 系统信息 0.1.0", tgz: "cheeco-dsh-client-ui-system-info-0.1.0.tgz" },
  { tag: "v0.1.0", name: "cheeco 用户中心 0.1.0", tgz: "cheeco-dsh-web-ui-web_user_center-0.1.0.tgz" },
  { tag: "v0.8.11", name: "cheeco 界面/声音设置 0.8.11", tgz: "cheeco-dsh-web-ui-cheeco-style-0.8.11.tgz" }
];

const auth = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };

async function getRelease(tag) {
  const r = await fetch(`${API}/releases/tags/${tag}`, { headers: auth });
  return r.ok ? await r.json() : null;
}
async function createRelease(tag, name, body) {
  const r = await fetch(`${API}/releases`, {
    method: "POST",
    headers: { ...auth, "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ tag_name: tag, target_commitish: "main", name, body, draft: false, prerelease: false })
  });
  return await r.json();
}
async function upload(releaseId, file, name) {
  const r = await fetch(`${UPLOAD}/${releaseId}/assets?name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { ...auth, "content-type": "application/octet-stream" },
    body: readFileSync(file)
  });
  return r.ok;
}

for (const t of targets) {
  let rel = await getRelease(t.tag);
  if (rel) console.log(`${t.name}: reuse release ${t.tag} (id=${rel.id})`);
  else {
    rel = await createRelease(t.tag, t.name, `Cheeco DSH 插件包 ${t.tag} · ${t.name.replace("cheeco ", "")}`);
    console.log(`${t.name}: created release ${t.tag} (id=${rel.id || rel.message})`);
  }
  const file = join(RELEASE_DIR, t.tgz);
  const ok = await upload(rel.id, file, t.tgz);
  console.log(`  upload ${t.tgz} -> ${ok ? "OK" : "FAIL"}`);
}
console.log("done");
