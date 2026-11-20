#!/usr/bin/env bash
# このリポジトリの確かめ。PR を出す前とマージの前に、引数なしで通す。
#   1. マーケットプレイスの一覧と、ここに置いたプラグインの形（--strict）
#   2. 雛形が公式ディレクトリの基準（--strict --profile directory）を通ること
#   3. 差を見る道具（plugin_drift.py）のテスト
#   4. ここに置いたプラグイン（plugins/*/）と雛形との差
# 動かせない検査は「未実行」として落とす（入っていない道具を黙って飛ばさない）。
# 別のリポジトリにあるプラグインの差は、手元にそろえてから見る（README の「雛形との差を見る」）。
set -u; cd "$(dirname "$0")/.."; fail=0
run() { echo "── $*"; "$@" || { fail=1; echo "✗ 落ちた：$*"; }; }
need() { command -v "$1" >/dev/null 2>&1 || { fail=1; echo "✗ 未実行：$1 がありません（$2）"; return 1; }; }

echo "■ 1. 一覧とプラグインの形"
if need claude "npm install -g @anthropic-ai/claude-code"; then
  run claude plugin validate --strict .
  for d in plugins/*/; do [ -d "$d" ] && run claude plugin validate --strict --profile directory "$d"; done
  echo "■ 2. 雛形"
  run claude plugin validate --strict --profile directory templates/plugin
fi

echo "■ 3. 道具のテスト"
need python3 "Python 3 を入れる" && run python3 -m pytest -q tests

echo "■ 4. ここに置いたプラグインと雛形との差"
for d in plugins/*/; do [ -d "$d" ] && run python3 scripts/plugin_drift.py "$d"; done

[ $fail = 0 ] && echo "OK" || { echo "NG"; exit 1; }
