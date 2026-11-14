#!/usr/bin/env python3
"""konomi ui-audit：画面（HTML）を全状態で開き、機械で測れる項目を確かめて evidence/ui-report.json に書く。人やエージェントは書かない・直さない。
使い方: python3 ui-audit.py <ルート> <画面の HTML か、それが入ったフォルダ>...
        python3 ui-audit.py <ルート> --spa <1 枚に固めたアプリの index.html>   （?screen=<slug>&state=<状態> で画面を選べること）
オプション: --only <slug>[,..] 指定した画面だけ／--out <フォルダ> evidence の出し先（アプリ本体をルートに指すと既定は上書き）／--standalone shell-nav を見ない
必要: Python の playwright、Chrome。axe-core は <ルート>/node_modules/axe-core にあれば使う（無ければ not_run）。
状態は data-scr 要素の data-states="default,empty,..." から（無ければ default だけ）。骨格と呼び名は <ルート>/.konomi/screens.yaml の shell.nav・terms（PyYAML があれば）。
終了コード: 0＝fail なし／1＝fail あり／2＝画面が見つからない・引数の誤り。
点検の約束（誤検出を避ける規則）の全文は records/checks.md 末尾「道具の冒頭の注釈」。
"""
import argparse, datetime, glob, hashlib, json, os, re, subprocess, sys
from playwright.sync_api import sync_playwright

MIN_HIT = 44
# 単位の重なり（「6月月」「12件件」）。数字の直後ならどの単位でも。数字が無くても 月月・年年・円円・件件・％％ は拾う（ただし 今月月末・毎年年初 のような正しい語は除く）
WORDS_DUP = r"\d+\s*([月日年円件％%人回個名社週])\1|(?<![今来先毎翌前当本昨再去])([月年])\2(?![末初頭中度間])|([円件％%])\3"
SPACE_SCALE = [1, 2, 4, 8, 12, 16, 24, 32, 48, 80]  # 好みの既定値の刻み（1・2 は線や微調整）

JS_METRICS = r"""(arg) => {
 const MIN = arg.min, SHELL = arg.shell || [];
 const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e);
   return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < document.documentElement.scrollHeight };
 // 窓が開いている間は、窓の中の要素だけを数える（窓の裏は覆いに当たるので、当たり判定が必ず外れる）
 const modals = [...document.querySelectorAll('dialog[open], [role=dialog][aria-modal=true]')].filter(vis);
 const scope = modals.length ? modals[modals.length - 1] : null;
 const behind = e => !!e.closest('[inert]') || (scope && (!scope.contains(e) || !!e.closest('[aria-hidden=true]')));
 const sel = 'a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=switch],[role=checkbox],[role=radio],summary';
 const targets = [...document.querySelectorAll(sel)].filter(vis).filter(e => !e.disabled && !behind(e));
 // 当たり判定で測る：中心から上下左右に MIN/2-1 px 離れた点を押したとき、その要素（か、その要素を押すことになる祖先・子孫・ラベル）に当たるか
 const owns = (hit, e) => { if (!hit) return false; if (hit === e || e.contains(hit) || hit.contains(e) && hit.closest(sel) === e) return true;
   const lab = hit.closest('label'); if (lab && (lab.control === e || lab.contains(e))) return true;
   const own = hit.closest(sel); if (own === e) return true;
   const row = e.closest('[data-row-link],tr[tabindex],li[tabindex]'); return !!(row && row.contains(hit) && row.querySelector(sel) === e) };
 const small = [];
 for (const e of targets) {
   const inlineLink = e.tagName === 'A' && getComputedStyle(e).display === 'inline';
   if (inlineLink) continue;                       // 文中のリンクは対象外
   e.scrollIntoView({ block: 'center', inline: 'nearest' });
   const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2, d = MIN / 2 - 1;
   const pts = [[cx, cy - d], [cx, cy + d], [cx - d, cy], [cx + d, cy]];
   const ok = pts.every(([x, y]) => x < 0 || y < 0 || x > innerWidth || y > innerHeight ? true : owns(document.elementFromPoint(x, y), e));
   if (!ok) small.push((e.tagName.toLowerCase() + ':' + (e.innerText || e.getAttribute('aria-label') || e.name || '').trim().slice(0, 16) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)));
 }
 scrollTo(0, 0);
 const inputs = [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea')].filter(vis);
 // 骨格のメニュー：nav が複数あるとき、screens.yaml の shell.nav の語を最も多く含む 1 つだけ（画面の中の「関連」の nav は数えない）
 const navLinks = n => [...n.querySelectorAll('a, button')].filter(vis).map(e => e.innerText.trim()).filter(Boolean);
 let navs = [], best = -1;
 for (const n of [...document.querySelectorAll('nav, [data-shell-nav]')].filter(vis)) {
   const ls = navLinks(n); if (!ls.length) continue;
   const exact = ls.filter(t => SHELL.includes(t)).length, loose = ls.filter(t => SHELL.some(x => t.includes(x) || x.includes(t))).length;
   const score = exact * 1000 + loose * 10 + (n.closest('header') || n.hasAttribute('data-shell-nav') ? 5 : 0) + Math.min(ls.length, 9) / 10;
   if (score > best) { best = score; navs = ls }
 }
 const full = (document.body.innerText + '\n' + [...document.querySelectorAll('svg text')].map(e => e.textContent).join('\n') + '\n' + [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join('\n'));
 const norm = document.body.innerText.replace(/\s+/g, ' ').trim();
 const sig = norm + '#' + [modals.length, document.querySelectorAll(':disabled').length, document.querySelectorAll('[aria-busy=true]').length, document.querySelectorAll('[aria-invalid=true]').length, document.querySelectorAll('[role=alert]').length, document.querySelectorAll('[aria-disabled=true]').length].join(',');
 return { overflowX: document.documentElement.scrollWidth - innerWidth, targets: targets.length, small, modal: !!scope,
   inputFontUnder16: inputs.filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).length,
   inputsNoLabel: inputs.filter(e => !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby')).length,
   nav: navs, text: document.body.innerText, full, sig, textLen: document.body.innerText.trim().length,
   bgFill: getComputedStyle(document.documentElement).backgroundColor !== 'rgba(0, 0, 0, 0)' || document.documentElement.scrollHeight >= innerHeight ? true : getComputedStyle(document.body).minHeight !== '0px' }
}"""

# 下に固定した帯が、最後の押せる要素・最後の文を隠していないか（窓が開いている状態は見ない）
JS_BAND = r"""() => {
 const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' };
 if (document.querySelector('dialog[open], [role=dialog][aria-modal=true]')) return { skipped: true }
 scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
 const all = [...document.querySelectorAll('body *')];
 const bands = all.filter(e => { const s = getComputedStyle(e); if (s.position !== 'fixed' && s.position !== 'sticky') return false; if (!vis(e)) return false; if (s.pointerEvents === 'none' && !e.innerText.trim()) return false; /* 中身の無い、押せない入れ物（知らせの置き場など）は帯に数えない */
   const r = e.getBoundingClientRect(); return r.width > innerWidth * 0.5 && r.height < innerHeight * 0.5 && r.bottom >= innerHeight - 2 && r.top > innerHeight * 0.4 });
 if (!bands.length) { scrollTo(0, 0); return { bands: 0 } }
 const top = Math.min(...bands.map(b => b.getBoundingClientRect().top));
 const inBand = e => bands.some(b => b === e || b.contains(e));
 const isFixed = e => { for (let x = e; x && x !== document.body; x = x.parentElement) if (getComputedStyle(x).position === 'fixed') return true; return false };
 const ok = e => vis(e) && !inBand(e) && !isFixed(e) && !e.closest('[aria-hidden=true],[inert]');
 const label = e => (e.tagName.toLowerCase() + ':' + (e.innerText || e.getAttribute('aria-label') || e.name || '').trim().replace(/\s+/g, ' ').slice(0, 16));
 const last = list => list.reduce((a, e) => (!a || e.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom) ? e : a, null);
 const inter = last(all.filter(e => e.matches('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],summary') && !e.disabled && ok(e)));
 const txt = last(all.filter(e => ok(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0) && !e.closest('svg,script,style')));
 const out = []; const hid = (e, kind) => { if (!e) return; const b = e.getBoundingClientRect().bottom; if (b > top + 1) out.push(`最後の${kind}「${label(e)}」の下端 ${Math.round(b)}px が帯の上端 ${Math.round(top)}px より下（${Math.round(b - top)}px 隠れる）`) };
 hid(inter, '押せる要素'); hid(txt, '文');
 scrollTo(0, 0);
 return { bands: bands.length, top: Math.round(top), hidden: out }
}"""

JS_LAYOUT = r"""(SCALE) => {
 const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' };
 const name = e => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 14);
 const isBtn = e => e.matches('button,[role=button],a.btn,a[class*=btn],a[class*=button],input[type=submit],input[type=button]') && !e.closest('[role=tablist]') && !e.closest('svg');
 // D-05 成り行きの折り返し：同じ親の直下に並ぶボタンが 2 行以上に分かれ、どれかの行に 2 個以上ある
 const wraps = [], mixed = [];
 for (const p of document.querySelectorAll('*')) {
   const kids = [...p.children].filter(c => isBtn(c) && vis(c)); if (kids.length < 2) continue;
   const cs = getComputedStyle(p); if (!/flex|grid|inline/.test(cs.display) && !kids.every(k => /inline/.test(getComputedStyle(k).display))) continue;
   const rows = {}; for (const k of kids) { const t = Math.round(k.getBoundingClientRect().top / 6); (rows[t] = rows[t] || []).push(k) }
   const rs = Object.values(rows);
   if (rs.length > 1 && rs.some(r => r.length > 1)) wraps.push(kids.map(name).join(' / ') + '（' + rs.map(r => r.length).join('+') + '）');
   for (const r of rs) if (r.length > 1) { const hs = r.map(k => Math.round(k.getBoundingClientRect().height)); if (Math.max(...hs) - Math.min(...hs) > 6) mixed.push(r.map(name).join(' / ') + ' 高さ ' + hs.join(',')) }
 }
 // D-01 タブ列の折り返し
 const tabwrap = [...document.querySelectorAll('[role=tablist]')].filter(vis).filter(t => new Set([...t.querySelectorAll('[role=tab]')].filter(vis).map(k => Math.round(k.getBoundingClientRect().top / 6))).size > 1).length;
 // D-06 文字サイズの段
 const texts = [...document.querySelectorAll('body *')].filter(e => vis(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1) && !e.closest('svg'));
 const sizes = [...new Set(texts.map(e => Math.round(parseFloat(getComputedStyle(e).fontSize) * 2) / 2))].sort((a, b) => a - b);
 const close = []; for (let i = 1; i < sizes.length; i++) if (sizes[i] / sizes[i - 1] < 1.1) close.push(sizes[i - 1] + '/' + sizes[i]);
 // D-07 刻みに無い余白
 const off = {}; let spTotal = 0;
 for (const e of document.querySelectorAll('body *')) { if (!vis(e) || e.closest('svg')) continue; const cs = getComputedStyle(e);
   for (const k of ['paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginBottom','rowGap','columnGap']) { const v = parseFloat(cs[k]); if (!v || v < 0 || isNaN(v)) continue; spTotal++; const r = Math.round(v * 10) / 10; if (!SCALE.includes(r)) off[r] = (off[r] || 0) + 1 } }
 // D-08 左端の線の数（主な内容の中の、文字を持つ要素の左端）
 const mainEl = document.querySelector('main') || document.body;
 const lefts = {}; for (const e of texts) { if (!mainEl.contains(e) || e.closest('table,svg,nav,button,[role=tablist]')) continue; const cs = getComputedStyle(e); if (cs.display === 'inline' || cs.textAlign === 'center' || cs.textAlign === 'right') continue;
   const r = e.getBoundingClientRect(); if (r.width < 40) continue; const x = Math.round((r.left + parseFloat(cs.paddingLeft || 0)) / 4) * 4; lefts[x] = (lefts[x] || 0) + 1 }
 const leftLines = Object.entries(lefts).filter(([, n]) => n >= 2).map(([x]) => +x).sort((a, b) => a - b);
 // D-09 見出しの最終行が短い／省略記号
 const orphan = []; for (const h of document.querySelectorAll('h1,h2,h3')) { if (!vis(h)) continue; const rg = document.createRange(); rg.selectNodeContents(h); const rc = [...rg.getClientRects()].filter(r => r.width > 1); if (rc.length < 2) continue;
   const lines = {}; for (const r of rc) { const k = Math.round(r.top / 4); lines[k] = (lines[k] || 0) + r.width } const ws = Object.values(lines); if (ws.length > 1 && ws[ws.length - 1] < parseFloat(getComputedStyle(h).fontSize) * 2.2) orphan.push(name(h)) }
 const ellipsis = [...document.querySelectorAll('body *')].filter(e => vis(e) && getComputedStyle(e).textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1).length;
 // D-12 最初の 1 画面に図が入るか
 const figs = [...document.querySelectorAll('figure,svg,[role=img],[data-figure]')].filter(e => vis(e) && e.getBoundingClientRect().width > 160 && e.getBoundingClientRect().height > 80);
 const firstFigTop = figs.length ? Math.round(Math.min(...figs.map(f => f.getBoundingClientRect().top + scrollY))) : null;
 // D-04 主ボタンの数（同じ塗り色のボタンのうち、最も濃い塗りを主とみなす）
 return { wraps, mixed, tabwrap, sizes, close, offScale: Object.entries(off).sort((a, b) => b[1] - a[1]).slice(0, 8), offCount: Object.values(off).reduce((a, b) => a + b, 0), spTotal, leftLines, orphan, ellipsis, firstFigTop, vh: innerHeight }
}"""

JS_STRUCTURE = r"""() => {
 const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 };
 const tag = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : '');
 const INTER = 'a[href],button,input:not([type=hidden]),select,textarea,label,[role=button],[role=link],[role=tab],[role=switch],[role=checkbox],[tabindex]:not([tabindex="-1"])';
 const nested = [];
 for (const e of document.querySelectorAll('a[href],button,[role=button],[role=link]')) { if (e.closest('svg')) continue;
   const inner = [...e.querySelectorAll(INTER)].filter(x => x !== e); if (inner.length) nested.push(tag(e) + ' の中に ' + tag(inner[0])) }
 for (const e of document.querySelectorAll('label label')) nested.push('label の中に label');
 const BLOCK = 'div,p,ul,ol,dl,table,section,article,header,footer,nav,main,aside,h1,h2,h3,h4,h5,h6,form,fieldset,figure,blockquote,pre,hr';
 const phr = [];
 for (const e of document.querySelectorAll('span,button,h1,h2,h3,h4,h5,h6,p,strong,em,b,i,small,label')) { if (e.closest('svg')) continue; const c = e.querySelector(BLOCK); if (c) phr.push(tag(e) + ' の中に ' + tag(c)) }
 const lists = [];
 for (const l of document.querySelectorAll('ul,ol')) for (const c of l.children) if (!/^(LI|SCRIPT|TEMPLATE)$/.test(c.tagName)) { lists.push(tag(l) + ' の直下に ' + tag(c)); break }
 for (const l of document.querySelectorAll('dl')) for (const c of l.children) if (!/^(DT|DD|DIV|SCRIPT|TEMPLATE)$/.test(c.tagName)) { lists.push(tag(l) + ' の直下に ' + tag(c)); break }
 const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).map(h => +h.tagName[1]); const skips = [];
 for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) skips.push('h' + hs[i - 1] + '→h' + hs[i]);
 const h1 = [...document.querySelectorAll('h1')].filter(vis).length, mains = document.querySelectorAll('main,[role=main]').length;
 const ids = {}; for (const e of document.querySelectorAll('[id]')) ids[e.id] = (ids[e.id] || 0) + 1; const dup = Object.entries(ids).filter(([, n]) => n > 1).map(([k]) => k);
 const fake = [...document.querySelectorAll('div[onclick],span[onclick],li[onclick],td[onclick],div[tabindex="0"]:not([role]),span[tabindex="0"]:not([role])')].filter(vis).map(tag);
 let depth = 0; for (const e of document.querySelectorAll('div')) { let d = 0, x = e; while (x) { if (x.tagName === 'DIV') d++; x = x.parentElement } if (d > depth) depth = d }
 return { nested: nested.slice(0, 6), phr: phr.slice(0, 6), lists: lists.slice(0, 4), skips: [...new Set(skips)], h1, mains, dup: dup.slice(0, 6), fake: fake.slice(0, 6), divDepth: depth, inlineStyle: document.querySelectorAll('body [style]').length }
}"""

JS_MOTION = r"""() => {
 const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 };
 const ms = v => v.split(',').map(x => x.trim().endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000);
 const LAYOUT = /(^|,\s*)(width|height|top|left|right|bottom|margin|padding|max-height|max-width|inset)\b/;
 const long = [], layout = [], all = []; const name = e => e.tagName.toLowerCase() + ':' + (e.innerText || e.getAttribute('aria-label') || e.className || '').toString().trim().slice(0, 12);
 for (const e of document.querySelectorAll('body *')) { if (!vis(e)) continue; const cs = getComputedStyle(e); const d = Math.max(...ms(cs.transitionDuration)); if (!d) continue;
   if (d > 500) long.push(name(e) + ' ' + d + 'ms');
   const prop = cs.transitionProperty; if (/(^|,\s*)all\b/.test(prop)) all.push(name(e)); else if (LAYOUT.test(prop)) layout.push(name(e) + ' ' + prop.slice(0, 30)) }
 const anims = document.getAnimations().filter(a => a.playState === 'running');
 const timing = a => { try { return a.effect.getComputedTiming() } catch (e) { return {} } };
 const infinite = anims.filter(a => timing(a).iterations === Infinity).length;
 const longAnim = anims.filter(a => { const t = timing(a); return t.iterations !== Infinity && t.duration > 1000 }).length;
 const tokens = getComputedStyle(document.documentElement); const hasTok = ['--dur-instant', '--dur-quick', '--dur-base'].filter(k => tokens.getPropertyValue(k).trim()).length;
 const busy = document.querySelectorAll('[aria-busy=true],[role=status],[role=progressbar],[aria-live]').length;
 return { long: long.slice(0, 6), longN: long.length, layout: layout.slice(0, 6), layoutN: layout.length, allN: all.length, infinite, longAnim, hasTok, busy }
}"""

JS_AXE = """async () => { const r = await axe.run(document, { resultTypes: ['violations'] });
 return r.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length,
   nodes: v.nodes.slice(0, 600).map(n => { const c = (n.any || []).concat(n.all || []).find(c => c.data && (c.data.fgColor || c.data.contrastRatio)); const d = (c && c.data) || {};
     return { t: (n.target || []).map(x => Array.isArray(x) ? x.join('>') : x).join(' ').slice(0, 90), fg: d.fgColor, bg: d.bgColor, ratio: d.contrastRatio, exp: d.expectedContrastRatio } }) })) }"""

# A-01 で飛ばす物：いま選ばれている印（選択中のタブなど）。選択中は乗せても押しても変わらなくてよい
JS_A01_SKIP = """e => !!e.closest('svg') || e.getAttribute('aria-selected') === 'true' || e.hasAttribute('aria-current') || e.getAttribute('aria-pressed') === 'true' || e.closest('[inert]') ||
  (() => { const m = [...document.querySelectorAll('dialog[open], [role=dialog][aria-modal=true]')].pop(); return !!m && !m.contains(e) })()"""

SNAP = "(e) => { const c = getComputedStyle(e); return [c.backgroundColor, c.color, c.borderColor, c.boxShadow, c.transform, c.outlineStyle + c.outlineWidth + c.outlineColor, c.opacity, c.textDecorationLine, c.filter, c.scale, c.translate, c.rotate].join('|') }"


def static_checks(html):
    body = re.sub(r":root\s*\{[^}]*\}", "", html)
    body = re.sub(r"&#[0-9a-fA-F]+;", "", body)
    colors = re.findall(r"#[0-9a-fA-F]{3,8}\b", body) + re.findall(r"rgba?\([^)]*\)", body)
    m = re.search(r'data-scr=["\'](SCR-\d+)["\'][^>]*', html)
    st = re.search(r'data-states=["\']([^"\']+)', html)
    return {
        "lang_ja": bool(re.search(r'<html[^>]*lang=["\']ja', html)),
        "scr": m.group(1) if m else None,
        "states": [s for s in re.split(r"[,\s]+", st.group(1)) if s] if st else None,
        "cmp": len(set(re.findall(r'data-cmp=["\'](CMP-\d+)', html))),
        "hardcoded_colors": sorted(set(colors))[:10],
        "hardcoded_color_count": len(colors),
        "important": len(re.findall(r"!important", html)),
        "dup_blocks": sum(1 for b, n in __import__("collections").Counter(re.sub(r"\s+", "", b) for b in re.findall(r"\{([^{}]{40,})\}", re.sub(r":root[^{]*\{[^}]*\}", "", html))).items() if n >= 3),
        "external": sorted(set(re.findall(r'(?:src|href)=["\'](https?://[^"\']+)', html)))[:5],
    }


def axe_detail(axe):
    """規則ごとに、数と、代表の selector・色（前景・背景・比）を 3 件まで。色の違反は（前景, 背景）の組でまとめる。"""
    parts = []
    for rid, v in axe.items():
        groups = {}
        for nd in v["nodes"]:
            key = (nd.get("fg"), nd.get("bg")) if nd.get("fg") else nd["t"]
            g = groups.setdefault(key, {"n": 0, "nd": nd}); g["n"] += 1
        top = sorted(groups.values(), key=lambda g: -g["n"])[:3]
        def one(g):
            nd = g["nd"]; col = f" 前景 {nd['fg']} 背景 {nd['bg']} 比 {nd['ratio']}（要 {nd['exp']}）" if nd.get("fg") else ""
            return f"{nd['t']}{col}" + (f" ほか同じ色の組 {g['n']} か所" if g["n"] > 1 and nd.get("fg") else "")
        more = f"（先頭 {len(v['nodes'])} 件のうち）" if v["n"] > len(v["nodes"]) else ""
        parts.append(f"{rid}×{v['n']}［{v['where']}］{more} 例: " + " ／ ".join(one(g) for g in top))
    return "; ".join(parts)


def load_shell(root):
    p = os.path.join(root, ".konomi", "screens.yaml")
    if not os.path.exists(p):
        return None, []
    try:
        import yaml
        doc = yaml.safe_load(open(p, encoding="utf-8")) or {}
    except Exception:
        return None, []
    return (doc.get("shell") or {}).get("nav"), doc.get("terms") or []


def main():
    if len(sys.argv) < 3 or sys.argv[1] in ("-h", "--help"):
        print(__doc__); sys.exit(2)
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument("root"); ap.add_argument("inputs", nargs="*")
    ap.add_argument("--spa"); ap.add_argument("--only"); ap.add_argument("--out"); ap.add_argument("--standalone", action="store_true")
    ns = ap.parse_args(sys.argv[1:])
    root = os.path.abspath(ns.root); files = []
    standalone = ns.standalone
    only = [x for x in re.split(r"[,\s]+", ns.only or "") if x] or None
    out_dir = os.path.abspath(ns.out) if ns.out else os.path.join(root, "evidence")
    for a in ns.inputs:
        files += sorted(glob.glob(os.path.join(a, "*.html"))) if os.path.isdir(a) else [a]
    if only: files = [f for f in files if os.path.splitext(os.path.basename(f))[0] in only]
    spa = os.path.abspath(ns.spa) if ns.spa else None
    if spa: files = []
    if not files and not spa:
        print("ui-audit: 画面の HTML が見つかりません"); sys.exit(2)
    axe_path = os.path.join(root, "node_modules", "axe-core", "axe.min.js")
    axe = open(axe_path).read() if os.path.exists(axe_path) else None
    shell_nav, terms = load_shell(root)
    shots = os.path.join(out_dir, "shots"); os.makedirs(shots, exist_ok=True)
    checks = []; screens = {}

    def add(cid, screen, status, detail=""):
        checks.append({"id": cid, "screen": screen, "status": status, "detail": detail})

    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        targets = [(os.path.splitext(os.path.basename(f))[0], f, None) for f in files]
        if spa:
            # 1 枚に固めたアプリ：画面の一覧（?screen= の無い表示）から slug を読み、画面ごとに DOM から状態を読む
            ctx = b.new_context(locale="ja-JP"); pg = ctx.new_page(); pg.goto(f"file://{spa}"); pg.wait_for_timeout(500)
            slugs = pg.evaluate("[...new Set([...document.querySelectorAll('a[href*=\"screen=\"]')].map(a => new URLSearchParams(a.getAttribute('href').split('?')[1]).get('screen')))]")
            if only:
                unknown = [x for x in only if x not in slugs]
                if unknown: print(f"ui-audit: --only の画面 {unknown} は一覧にありません（あるのは {slugs}）"); sys.exit(2)
                slugs = [x for x in slugs if x in only]
            for sl in slugs:
                pg.goto(f"file://{spa}?screen={sl}"); pg.wait_for_timeout(300)
                info = pg.evaluate("(() => { const e = document.querySelector('[data-scr]'); return e ? [e.getAttribute('data-scr'), e.getAttribute('data-states') || ''] : [null, ''] })()")
                targets.append((sl, spa, {"slug": sl, "scr": info[0], "states": [x for x in re.split(r"[,\s]+", info[1]) if x]}))
            ctx.close()
        for name, f, sp in targets:
            html = open(f, encoding="utf-8").read(); S = static_checks(html)
            if sp:
                S.update({"scr": sp["scr"], "states": sp["states"] or None, "hardcoded_color_count": 0, "hardcoded_colors": [], "important": 0, "dup_blocks": 0})
            url = (lambda st, f=f, sp=sp: f"file://{os.path.abspath(f)}?" + (f"screen={sp['slug']}&" if sp else "") + f"state={st}")
            add("lang", name, "pass" if S["lang_ja"] else "fail", "html に lang=\"ja\" が無い" if not S["lang_ja"] else "")
            add("data-scr", name, "pass" if S["scr"] else "fail", "" if S["scr"] else "data-scr が無い")
            add("states-declared", name, "pass" if S["states"] else "fail", "" if S["states"] else "data-states が無いので default だけを検査した")
            add("no-hardcoded-color", name, "not_run" if sp else ("pass" if S["hardcoded_color_count"] == 0 else "fail"), "固めたアプリでは src-lint で確かめる" if sp else ", ".join(S["hardcoded_colors"]))
            add("no-external", name, "pass" if not S["external"] else "fail", ", ".join(S["external"]))
            states = S["states"] or ["default"]; lay = {}; struct = {}; reduced_inf = 0; LOADING = ("loading", "saving", "processing", "submitting", "generating"); busy_missing = []; texts = {}; agg = {"overflow": [], "small": {}, "font": 0, "label": 0, "axe": {}, "errors": [], "bg": True, "dup": [], "band": {}, "terms": {}}; navs = None
            for st in states:
                for w, scheme in ((375, "light"), (1280, "light"), (1280, "dark")):
                    if scheme == "dark" and st != states[0]:
                        continue
                    ctx = b.new_context(viewport={"width": w, "height": 812 if w == 375 else 800}, color_scheme=scheme, locale="ja-JP", reduced_motion="reduce")
                    pg = ctx.new_page(); errs = []
                    pg.on("pageerror", lambda e: errs.append(str(e)[:120]))
                    pg.goto(url(st)); pg.wait_for_timeout(350)
                    if st not in LOADING and st not in ('refreshing',):  # 自動のやり直しなどで待ちが続く状態は、落ち着くまで最大 3 秒待つ
                        try: pg.wait_for_function("() => !document.querySelector('[aria-busy=\"true\"]')", timeout=3000)
                        except Exception: pass
                    m = pg.evaluate(JS_METRICS, {"min": MIN_HIT, "shell": list(shell_nav or [])})
                    if scheme == "light": lay[(st, w)] = pg.evaluate(JS_LAYOUT, SPACE_SCALE)
                    if scheme == "light" and w == 375:
                        struct[st] = pg.evaluate(JS_STRUCTURE); mo = pg.evaluate(JS_MOTION); reduced_inf = max(reduced_inf, mo["infinite"])
                        if st in LOADING and mo["busy"] == 0: busy_missing.append(st)
                    if axe:
                        pg.add_script_tag(content=axe)
                        for v in pg.evaluate(JS_AXE):
                            if v["n"] >= agg["axe"].get(v["id"], {}).get("n", 0):
                                agg["axe"][v["id"]] = {"n": v["n"], "nodes": v["nodes"], "where": f"{st}・{w}px・{scheme}"}
                    pg.screenshot(path=os.path.join(shots, f"{name}__{st}__{w}-{scheme}.png"), full_page=True)
                    if w == 375 and scheme == "light":
                        bd = pg.evaluate(JS_BAND)
                        if bd.get("hidden"): agg["band"][st] = bd["hidden"]
                    if w == 375:
                        texts[st] = hashlib.sha1(m["sig"].encode("utf-8")).hexdigest()[:12]; agg["font"] = max(agg["font"], m["inputFontUnder16"]); agg["label"] = max(agg["label"], m["inputsNoLabel"])
                        if m["overflowX"] > 1: agg["overflow"].append(st)
                        if m["small"]: agg["small"][st] = m["small"]
                        if not m["bgFill"]: agg["bg"] = False
                        for t in terms:
                            body = m["text"]
                            for ok in t.get("allow", []) or []:     # 制度が名前を決めている語は、その語の中の avoid を数えない
                                if ok: body = body.replace(ok, "")
                            for bad in t.get("avoid", []) or []:
                                if bad and bad in body:
                                    agg["terms"].setdefault((bad, t.get("use")), []).append(st)
                        for mt in re.finditer(WORDS_DUP, m["full"]):
                            agg["dup"].append((st, mt.group(0)))
                    if w == 1280 and scheme == "light" and st == states[0]: navs = m["nav"]
                    agg["errors"] += errs; ctx.close()
            for (bad, use), sts in agg["terms"].items():
                add("terms", name, "fail", f"「{bad}」が使われている（決めた呼び名は「{use}」）状態 {', '.join(dict.fromkeys(sts))}")
            dd = list(dict.fromkeys(agg["dup"]))
            add("WORDS-dup", name, "pass" if not dd else "fail", "; ".join(f"{st}: 「{w}」" for st, w in dd[:5]) if dd else "")
            add("fixed-band-last-item", name, "pass" if not agg["band"] else "fail", "; ".join(f"{st}: {x[0]}" + (f"／{x[1]}" if len(x) > 1 else "") for st, x in list(agg["band"].items())[:3]))
            n_small = sum(len(v) for v in agg["small"].values())
            add("no-overflow-375", name, "pass" if not agg["overflow"] else "fail", "横にはみ出す状態: " + ", ".join(agg["overflow"]) if agg["overflow"] else "")
            add("hit-area-44", name, "pass" if n_small == 0 else "fail", "; ".join(f"{k}: {', '.join(v[:4])}" for k, v in list(agg["small"].items())[:3]) + (f"（延べ {n_small} か所）" if n_small else ""))
            add("input-font-16", name, "pass" if agg["font"] == 0 else "fail", f"16px 未満の入力欄 {agg['font']} 個" if agg["font"] else "")
            add("input-label", name, "pass" if agg["label"] == 0 else "fail", f"ラベルの無い入力欄 {agg['label']} 個" if agg["label"] else "")
            add("axe-serious", name, "not_run" if not axe else ("pass" if not agg["axe"] else "fail"), "axe-core が無い" if not axe else axe_detail(agg["axe"]))
            add("no-js-error", name, "pass" if not agg["errors"] else "fail", "; ".join(agg["errors"][:3]))
            # 構造の理論（references/structure.md）S-01・S-08
            def scol(key): return [(st, v[key]) for st, v in struct.items() if v[key]]
            ne = scol("nested"); add("S-01-interactive-nesting", name, "pass" if not ne else "fail", "; ".join(f"{st}: {x[0]}" for st, x in ne[:3]))
            ph = scol("phr"); add("S-01-block-in-phrasing", name, "pass" if not ph else "fail", "; ".join(f"{st}: {x[0]}" for st, x in ph[:3]))
            li = scol("lists"); add("S-01-list-children", name, "pass" if not li else "fail", "; ".join(f"{st}: {x[0]}" for st, x in li[:3]))
            sk = scol("skips"); add("S-10-heading-order", name, "info", "; ".join(f"{st}: {', '.join(x)}" for st, x in sk[:3]))
            b0 = struct[states[0]]; add("S-10-main", name, "pass" if b0["mains"] == 1 else "fail", "" if b0["mains"] == 1 else f"main が {b0['mains']} 個（h1 は {b0['h1']} 個）")
            du = scol("dup"); add("S-01-duplicate-id", name, "pass" if not du else "fail", "; ".join(f"{st}: {', '.join(x[:3])}" for st, x in du[:2]))
            fk = scol("fake"); add("S-01-fake-button", name, "pass" if not fk else "fail", "; ".join(f"{st}: {', '.join(x[:3])}" for st, x in fk[:2]))
            add("S-08-css", name, "info", f"!important {S['important']} 個、style 属性 {b0['inlineStyle']} 個、同じ宣言のかたまりの重複 {S['dup_blocks']} 種、div の深さ {b0['divDepth']}")
            # 動きの理論（references/motion.md）
            ctx = b.new_context(viewport={"width": 1280, "height": 800}, color_scheme="light", locale="ja-JP", reduced_motion="no-preference")
            pg = ctx.new_page(); pg.goto(url(states[0])); pg.wait_for_timeout(400)
            mo = pg.evaluate(JS_MOTION)
            add("A-motion-duration", name, "pass" if mo["longN"] == 0 else "fail", f"500ms を超える変化 {mo['longN']} か所: " + ", ".join(mo["long"][:4]) if mo["longN"] else "")
            add("A-motion-layout-props", name, "info", f"幅・高さ・余白などを動かしている {mo['layoutN']} か所、transition: all が {mo['allN']} か所" + (": " + ", ".join(mo["layout"][:3]) if mo["layoutN"] else ""))
            add("A-motion-tokens", name, "info", f"時間のトークン {mo['hasTok']}/3 個が定義されている。くり返す動き {mo['infinite']} 個、1 秒を超える動き {mo['longAnim']} 個")
            add("A-05-reduced-motion", name, "pass" if reduced_inf == 0 else "fail", f"動きを減らす設定でも、くり返す動きが {reduced_inf} 個動いている" if reduced_inf else "")
            add("A-03-busy-announce", name, "pass" if not busy_missing else "fail", "読み上げに伝わらない待ちの状態: " + ", ".join(busy_missing) if busy_missing else "")
            btns = [h for h in pg.query_selector_all("button:not([disabled]), a[class*=btn], a[class*=button], [role=button]") if h.is_visible() and not h.evaluate(JS_A01_SKIP)][:6]
            no_hover, no_press, no_focus, tested = [], [], [], 0
            for h in btns:
                try:
                    label = (h.inner_text() or h.get_attribute("aria-label") or "").strip()[:12]
                    h.scroll_into_view_if_needed(timeout=1000); pg.mouse.move(2, 2); pg.wait_for_timeout(120); base = h.evaluate(SNAP)
                    h.hover(timeout=1500); pg.wait_for_timeout(450); hov = h.evaluate(SNAP)
                    pg.mouse.down(); pg.wait_for_timeout(120); act = h.evaluate(SNAP); pg.mouse.move(2, 2); pg.mouse.up(); pg.wait_for_timeout(200)
                    pg.keyboard.press("Tab"); foc = h.evaluate("e => { e.focus({focusVisible: true}); const c = getComputedStyle(e); return (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) || c.boxShadow !== 'none' }")
                    tested += 1
                    if hov == base: no_hover.append(label)
                    if act == hov or act == base: no_press.append(label)
                    if not foc: no_focus.append(label)
                except Exception:
                    continue
            if tested:
                add("A-01-hover", name, "pass" if not no_hover else "fail", "乗せても見た目が変わらない: " + ", ".join(no_hover) if no_hover else f"{tested} 個を確認")
                add("A-01-press", name, "pass" if not no_press else "fail", "押しても見た目が変わらない: " + ", ".join(no_press) if no_press else f"{tested} 個を確認")
                add("A-01-focus", name, "pass" if not no_focus else "fail", "キーボードで選んでも輪が出ない: " + ", ".join(no_focus) if no_focus else f"{tested} 個を確認")
            else:
                add("A-01-hover", name, "not_run", "確かめられるボタンが無い")
            ctx.close()
            # 判断の理論（references/decisions.md）に対応する検査
            def col(key): return [(st, w, v[key]) for (st, w), v in lay.items() if v[key]]
            wr = col("wraps"); add("D-05-button-wrap", name, "pass" if not wr else "fail", "; ".join(f"{st}@{w}px: {x[0]}" for st, w, x in wr[:3]) + (f"（{len(wr)} か所の状態・幅）" if wr else ""))
            mx = col("mixed"); add("D-05-button-height", name, "pass" if not mx else "fail", "; ".join(f"{st}@{w}px: {x[0]}" for st, w, x in mx[:3]))
            tw = col("tabwrap"); add("D-01-tab-wrap", name, "pass" if not tw else "fail", ", ".join(f"{st}@{w}px" for st, w, _ in tw[:4]))
            base = lay.get((states[0], 375)) or next(iter(lay.values()))
            add("D-06-font-steps", name, "info", f"文字サイズ {len(base['sizes'])} 段 {base['sizes']}" + (f"、近すぎる段 {base['close']}" if base["close"] else ""))
            add("D-07-spacing-scale", name, "info", f"刻みに無い余白 {base['offCount']}/{base['spTotal']} か所" + (f"（多い値: {', '.join(str(k)+'px×'+str(n) for k, n in base['offScale'][:5])}）" if base["offCount"] else ""))
            add("D-08-left-edges", name, "info", f"左端の線 {len(base['leftLines'])} 本 {base['leftLines']}（375px）")
            orp = col("orphan"); add("D-09-heading-orphan", name, "info", "; ".join(f"{st}@{w}px: {', '.join(x[:2])}" for st, w, x in orp[:3]) if orp else "なし")
            el = col("ellipsis"); add("D-09-ellipsis", name, "info", f"省略記号で切れている要素あり（{len(el)} の状態・幅）" if el else "なし")
            if base["firstFigTop"] is not None: add("D-12-figure-first-screen", name, "info", f"最初の図の位置 {base['firstFigTop']}px（1 画面は {base['vh']}px）" + ("。最初の 1 画面に入っていない" if base["firstFigTop"] > base["vh"] else ""))
            groups = {}
            for st_, h in texts.items(): groups.setdefault(h, []).append(st_)
            same = [g for g in groups.values() if len(g) > 1]; dup = sum(len(g) - 1 for g in same)
            add("states-distinct", name, "pass" if dup == 0 else "fail", f"表示の文字（と窓・disabled・aria-busy などの数）がまったく同じ状態が {dup} 組ある（状態が切り替わっていない疑い）: " + "; ".join(" = ".join(g) for g in same) if dup else "")
            screens[name] = {"scr": S["scr"], "states": states, "nav": navs, "cmp": S["cmp"], "hit_small": n_small}
        b.close()

    # 画面をまたぐ骨格
    navsets = {n: tuple(s["nav"] or []) for n, s in screens.items() if s["nav"]}
    if standalone:
        pass
    elif shell_nav:
        for n, nv in navsets.items():
            miss = [x for x in shell_nav if x not in nv]; extra = [x for x in nv if x not in shell_nav]
            add("shell-nav", n, "pass" if not miss and not extra else "fail", (f"足りない: {miss} " if miss else "") + (f"決めていない項目: {extra}" if extra else ""))
    elif len(navsets) > 1:
        kinds = {}
        for n, nv in navsets.items(): kinds.setdefault(nv, []).append(n)
        add("shell-nav", "*", "pass" if len(kinds) == 1 else "fail", "" if len(kinds) == 1 else f"上のメニューが {len(kinds)} 通りある。screens.yaml の shell.nav を決めること")
    else:
        add("shell-nav", "*", "not_run", "比べる画面が 1 枚以下")

    commit = None
    try: commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, stderr=subprocess.DEVNULL).decode().strip()
    except Exception: pass
    fails = [c for c in checks if c["status"] == "fail"]; notrun = [c for c in checks if c["status"] == "not_run"]
    report = {"tool": "konomi ui-audit", "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "commit": commit,
              "status": "fail" if fails else "pass", "counts": {"screens": len(screens), "states": sum(len(s["states"]) for s in screens.values()), "checks": len(checks), "problems": len(fails), "not_run": len(notrun)},
              "screens": screens, "checks": checks}
    os.makedirs(out_dir, exist_ok=True)
    json.dump(report, open(os.path.join(out_dir, "ui-report.json"), "w"), ensure_ascii=False, indent=1)
    c = report["counts"]; print(f"画面 {c['screens']} / 状態 {c['states']} / 検査 {c['checks']} → 不合格 {c['problems']}、未実行 {c['not_run']}")
    by = {}
    for x in fails: by.setdefault(x["id"], []).append(x)
    for k, v in by.items():
        print(f"\n{k}（{len(v)}）")
        for x in v[:12]: print(f"  {x['screen']}  {x['detail'][:150]}")
    info = [c for c in checks if c["status"] == "info"]
    if info:
        print("\n参考（合否に入れない。判断の理論 D-06〜D-12 の材料）")
        for x in info: print(f"  {x['screen']}  {x['id']}  {x['detail'][:140]}")
    print(f"\n{os.path.join(out_dir, 'ui-report.json')} に書きました（{report['status']}）")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
