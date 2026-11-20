#!/usr/bin/env node
// 【雛形】Stop フックの見本。標準入力でイベントの JSON を受け、止めるときだけ {"decision":"block","reason":…} を返す。
// 外の依存を使わない（入れた人の手元に node だけあれば動くように）。読めない入力では止めない（安全に通す）。
import { readFileSync } from "node:fs";

let event = {};
try {
  event = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0);
}
// 同じ Stop の中で 2 度止めない（止めたあとの再開で、また止めて回り続けないように）。
if (event.stop_hook_active) process.exit(0);

const shouldBlock = false; // 【雛形】止める条件をここに書く
if (shouldBlock) {
  process.stdout.write(JSON.stringify({ decision: "block", reason: "【雛形】何をすれば通るかを書く" }));
}
process.exit(0);
