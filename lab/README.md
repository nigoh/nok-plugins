# lab（試作と振り返り。プラグインには入らない）

| 場所 | 中身 |
| --- | --- |
| `tsuzuri-seikyu/` | 試作第3回の製品「つづり請求」（React + TypeScript + Tailwind。請求書と入金の管理、10 画面）。konomi で作り、土台への引き上げまで済ませた物。`npm install` → `npm test`・`npm run build` |
| `notes/run3/` | 第3回の指示書、気づき、振り返りの分析、圧縮の案と照合の道具、使われた判断の記録（usage.jsonl） |
| `notes/quality-test/` | 圧縮後のスキルだけで 2 画面を作らせた質の試験の指示書と、出来た設計書 |

製品の点検は、プラグインの道具を使う（例）：

```
cd lab/tsuzuri-seikyu && npm install && npm run build
python3 ../../plugins/konomi/skills/konomi/scripts/ui-audit.py . --spa dist/index.html
node ../../plugins/konomi/skills/konomi/scripts/trace-check.mjs .
node ../../plugins/konomi/skills/konomi/scripts/src-lint.mjs .
```

第1回・第2回の試作（素の HTML の 10 画面ずつ）は、ここには入っていない。
