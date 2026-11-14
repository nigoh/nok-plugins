#!/usr/bin/env bash
# このリポジトリの確かめ：マーケットプレイスと、ここに置いたプラグインの形。
# 別のリポジトリにあるプラグイン（konomi・pipe-in）の確かめは、それぞれのリポジトリでする。
set -u; cd "$(dirname "$0")/.."; fail=0
run() { echo "── $*"; "$@" || fail=1; }
run claude plugin validate .
for d in plugins/*/; do [ -d "$d" ] && run claude plugin validate "$d"; done
[ $fail = 0 ] && echo "OK" || { echo "NG"; exit 1; }
