// The personal-data scan must pass a clean repo and block each kind of leak (positive controls).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const scan = new URL("../scripts/scan.sh", import.meta.url).pathname;
const run = (cwd, cmd, args) => spawnSync(cmd, args, { cwd, encoding: "utf8" });

function repo(files) {
  const dir = mkdtempSync(join(tmpdir(), "scan-test-"));
  run(dir, "git", ["init", "-q"]);
  mkdirSync(join(dir, "scripts"), { recursive: true });
  copyFileSync(scan, join(dir, "scripts/scan.sh"));
  for (const [name, text] of Object.entries(files)) { mkdirSync(join(dir, name, ".."), { recursive: true }); writeFileSync(join(dir, name), text); }
  return dir;
}

test("a clean repo passes", () => {
  const dir = repo({ "README.md": "hello", "app/x.js": "const app = 'trade-notebook';", "package.json": '{ "name": "trade-notebook" }' });
  const r = run(dir, "sh", ["scripts/scan.sh"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /scan passed/);
  rmSync(dir, { recursive: true, force: true });
});

test("each kind of leak is blocked", () => {
  const leaks = { "trades.csv": "x", "data/a.txt": "x", "trade-notebook-backup-2030-01-01.json": "{}", "notes.local.md": "x", "copy.json": '{ "app": "trade-notebook", "trades": [] }' };
  for (const [name, text] of Object.entries(leaks)) {
    const dir = repo({ [name]: text });
    const r = run(dir, "sh", ["scripts/scan.sh"]);
    assert.equal(r.status, 1, name + " should be blocked: " + r.stdout);
    rmSync(dir, { recursive: true, force: true });
  }
});

test("words in the local denylist are blocked", () => {
  const dir = repo({ ".gitignore": "*.local.txt\n", "scripts/denylist.local.txt": "Secretname\n", "docs/a.md": "notes by secretname" });
  const r = run(dir, "sh", ["scripts/scan.sh"]);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /docs\/a.md contains a word/);
  rmSync(dir, { recursive: true, force: true });
});
