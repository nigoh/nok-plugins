#!/usr/bin/env python3
"""圧縮の前後で、判断の ID・表の行数・数値・印が減っていないかを機械で照合する。
使い方: python3 -I check.py <前.md> <後.md> [--allow <許す欠落の語（例・経緯で消した数値や ID）を 1 行 1 つ書いたファイル>] [--rows-moved N（別の場所へ移した表の行数。移し先で別に確かめる）]
終了コード 0=減っていない / 1=減った"""
import re, sys, collections
a_path, b_path = sys.argv[1], sys.argv[2]
allow = set()
rows_moved = int(sys.argv[sys.argv.index('--rows-moved')+1]) if '--rows-moved' in sys.argv else 0
if '--allow' in sys.argv:
    allow = {l.strip() for l in open(sys.argv[sys.argv.index('--allow')+1], encoding='utf8') if l.strip()}
A = open(a_path, encoding='utf8').read(); B = open(b_path, encoding='utf8').read()
ID = re.compile(r'(?<![A-Za-z0-9])(?:[A-Z]{1,3}-\d{1,3}|REQ-\d+|SCR-\d+|CMP-\d+|WORDS-\d+|DAT-\d+|CK-\d+|FC-\d+|DOC-[A-Z]+)(?![A-Za-z0-9])')
NUM = re.compile(r'\d+(?:[.,:]\d+)*(?:px|KB|ms|秒|分|字|個|件|行|段|桁|回|%|:1|em|rem|倍|時間|日|か月|本|画面|枚|人|色|種|つ)?')
MARK = re.compile(r'〔(?:目安|調査|原理|試作|要確認)[^〕]*〕')
def rows(t):
    return sum(1 for l in t.split('\n') if l.startswith('|') and not re.match(r'^\|[\s\-|:]+\|?$', l) and not re.match(r'^\| *(ID|条件|軸と値|項目|値|状況|場面|状態|物|見せ物|節|本|事柄|かかる時間|対象|部品|検査|問い) ', l) and not re.match(r'^\| (条件|ID|原理|言い換え|状態|見せ物|項目) \|', l))
def count(rx, t): return collections.Counter(m.group(0) for m in rx.finditer(t))
bad = 0
for name, rx, mode in (('ID', ID, 'set'), ('数値', NUM, 'set'), ('印', MARK, 'kind')):
    ca, cb = count(rx, A), count(rx, B)
    if mode == 'kind':
        ka = collections.Counter(re.match(r'〔([^：〕]+)', k).group(1) for k in ca.elements())
        kb = collections.Counter(re.match(r'〔([^：〕]+)', k).group(1) for k in cb.elements())
        for k in ka:
            tag = '' if kb[k] >= ka[k] else '  <-- 減った'
            if tag: bad += 1
            print(f'印 〔{k}〕 {ka[k]} -> {kb[k]}{tag}')
    else:
        miss = sorted(k for k in ca if k not in cb and k not in allow)
        if miss: bad += 1
        print(f'{name}: 前 {len(ca)} 種 後 {len(cb)} 種 欠け {len(miss)} {miss[:12]}')
ra, rb = rows(A), rows(B)
print(f'表のデータ行: {ra} -> {rb}' + ('' if rb + rows_moved >= ra else '  <-- 減った'))
if rb + rows_moved < ra: bad += 1
print('判定:', 'NG' if bad else 'OK', f'  バイト {len(A.encode())} -> {len(B.encode())} ({len(B.encode())/len(A.encode()):.2f})')
sys.exit(1 if bad else 0)
