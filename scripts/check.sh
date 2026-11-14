#!/usr/bin/env bash
# このリポジトリの確かめ：マーケットプレイスと各プラグインの形、konomi の点検表と読む量。
set -u; cd "$(dirname "$0")/.."; fail=0
run() { echo "── $*"; "$@" || fail=1; }
run claude plugin validate .
for d in plugins/*/; do run claude plugin validate "$d"; done
K=plugins/konomi/skills/konomi
[ -d plugins/konomi/node_modules ] || (cd plugins/konomi && npm install --silent)
run node $K/scripts/laws-check.mjs
echo "── 読む量（上限を超えた物は一覧に出る。合否には入れない）"; node $K/scripts/read-budget.mjs | tail -12 || true
for f in $K/scripts/*.mjs plugins/konomi/hooks/*.mjs; do node --check "$f" || fail=1; done
python3 -c "import ast,sys;ast.parse(open('$K/scripts/ui-audit.py').read())" || fail=1
[ $fail = 0 ] && echo "OK" || { echo "NG"; exit 1; }
