#!/usr/bin/env python3
"""プラグインと雛形（templates/plugin/）の決まりとの差を、決まりごとに出典つきで出す。

使い方:
  python3 scripts/plugin_drift.py <プラグインのフォルダ> [...]
  python3 scripts/plugin_drift.py --marketplace .claude-plugin/marketplace.json --workspace ..
  オプション: --json（結果を JSON で）・--all（合格した決まりも出す）・--strict（推奨の外れも落とす）
             --no-repo（リポジトリ側の決まり R** を見ない）・--claude <命令>（公式の検査に使う claude）

終わりの値: 0 = 必須の外れも未実行も無い。1 = 必須の外れ（--strict なら推奨の外れも）か、未実行がある。2 = 使い方の誤り。
標準ライブラリだけで動く（ほかのリポジトリへ写しても動くように）。決まりの一覧と出典は templates/README.md。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, asdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_TEMPLATE = HERE.parent / "templates" / "plugin"

D_MANIFEST = "https://code.claude.com/docs/en/plugins/manifest-reference.md"
D_COMPONENTS = "https://code.claude.com/docs/en/plugins/components.md"
D_SKILLS = "https://code.claude.com/docs/en/skills.md"
D_SKILL_BP = "https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices"
D_AGENTS = "https://code.claude.com/docs/en/sub-agents.md"
D_HOOKS = "https://code.claude.com/docs/en/hooks.md"
D_PUBLISH = "https://code.claude.com/docs/en/plugins/publish.md"
D_CHECKLIST = "https://claude.com/docs/plugins/pre-submission-checklist"
D_EVALS = "https://code.claude.com/docs/en/plugin-evals.md"
D_CLI = "https://code.claude.com/docs/en/plugins/cli-reference.md#plugin-validate"
D_MARKET = "https://code.claude.com/docs/en/plugins/marketplace-reference.md"
D_LOADING = "https://code.claude.com/docs/en/plugins/loading.md"
D_NOK = "nok-plugins の決まり（templates/README.md）"

MUST, SHOULD = "must", "should"

# 決まりの一覧：ID → (重さ, 中身, 出典)。templates/README.md の表と同じ物を保つ（tests が突き合わせる）。
RULES: dict[str, tuple[str, str, str]] = {
    "V01": (MUST, "公式の検査（claude plugin validate --strict --profile directory）を通る", D_CLI),
    "M01": (MUST, ".claude-plugin/plugin.json があり、JSON として読める", D_MANIFEST),
    "M02": (MUST, "name が小文字・数字・ハイフンで 64 字まで、予約語で始まらない", D_CHECKLIST),
    "M03": (MUST, "version が semver（x.y.z）で書いてある", D_PUBLISH),
    "M04": (MUST, "description がある", D_MANIFEST),
    "M05": (MUST, "author.name がある", D_MANIFEST),
    "M06": (SHOULD, "homepage と repository がある", D_MANIFEST),
    "M07": (MUST, "license がある（または LICENSE ファイル）", D_CHECKLIST),
    "M08": (SHOULD, "keywords がある", D_MANIFEST),
    "M09": (SHOULD, "$schema が公式の雛形（claude plugin init）と同じ URL", D_NOK),
    "M10": (SHOULD, "supportUrl がある", D_MANIFEST),
    "M11": (MUST, "コンポーネントのパスが ./ で始まり、.. を含まない", D_MANIFEST),
    "F01": (MUST, "README.md がある（プラグインのフォルダか、リポジトリの直下）", D_CHECKLIST),
    "F02": (SHOULD, "README に入れ方（/plugin install）が書いてある", D_CLI),
    "F03": (SHOULD, "README に、手元で動かす物・外へ送る物の節がある", D_CHECKLIST),
    "F04": (SHOULD, "LICENSE ファイルがある", D_CHECKLIST),
    "F05": (SHOULD, "CHANGELOG.md に、今の版の見出しがある", D_NOK),
    "F06": (SHOULD, "アイコン（.claude-plugin/icon.png など）がある", D_CHECKLIST),
    "F07": (MUST, "アイコンが雛形の仮の物のままでない", D_NOK),
    "F08": (MUST, "雛形の印（【雛形】）と仮の名前（plugin-name）が残っていない", D_NOK),
    "F09": (SHOULD, "プラグインの直下に CLAUDE.md と bin/ を置かない（読まれない・claude.ai で入れられない）", D_MANIFEST),
    "F10": (MUST, "要らないファイル（.DS_Store・Thumbs.db・__MACOSX）とシンボリックリンクが無い", D_CHECKLIST),
    "F11": (SHOULD, "256 KiB を超えるファイルが無い", D_CHECKLIST),
    "F12": (SHOULD, "プラグインのフォルダの中に README.md がある（入れた人の手元に届くのはフォルダの中だけ）", D_LOADING),
    "S01": (MUST, "スキルの frontmatter が読め、description がある", D_SKILLS),
    "S02": (SHOULD, "スキルの name がフォルダ名と同じ", D_SKILLS),
    "S03": (MUST, "スキルの name が小文字・数字・ハイフンで 64 字まで、claude・anthropic を含まない", D_SKILL_BP),
    "S04": (MUST, "スキルの description が 1,024 字まで", D_SKILL_BP),
    "S05": (MUST, "SKILL.md が 500 行未満", D_SKILL_BP),
    "S06": (MUST, "SKILL.md からリンクした補助ファイルがある", D_SKILL_BP),
    "S07": (SHOULD, "100 行を超える補助ファイルの先頭に目次がある", D_SKILL_BP),
    "S08": (SHOULD, "パスにバックスラッシュを使わない", D_SKILL_BP),
    "A01": (MUST, "エージェントに name と description がある", D_AGENTS),
    "A02": (SHOULD, "エージェントの tools を絞っている（書かないと全部の道具を使える）", D_AGENTS),
    "A03": (SHOULD, "プラグインでは無視される項目（hooks・mcpServers・permissionMode）を書かない", D_AGENTS),
    "H01": (MUST, "hooks.json が JSON で、最上位に hooks がある", D_HOOKS),
    "H02": (MUST, "フックがプラグインの中のファイルを ${CLAUDE_PLUGIN_ROOT} で指す", D_HOOKS),
    "H03": (SHOULD, "フックに timeout を書いている", D_HOOKS),
    "H04": (SHOULD, "シェルの形で ${CLAUDE_PLUGIN_ROOT} を使うときは二重引用符で囲む（または args を使う）", D_HOOKS),
    "P01": (MUST, "MCP の npx・uvx は版を固定している", D_CHECKLIST),
    "P02": (MUST, "リモートの MCP は https", D_CHECKLIST),
    "E01": (SHOULD, "eval のケースが 3 件以上ある", D_SKILL_BP),
    "E02": (MUST, "eval の各ケースに prompt.md と graders/ の 1 件以上がある", D_EVALS),
    "R01": (SHOULD, "リポジトリの CI が claude plugin validate を流す", D_CLI),
    "R02": (SHOULD, "リポジトリの検査が --strict で流れる", D_CLI),
    "R03": (SHOULD, "リポジトリに PR のテンプレートがある", D_NOK),
    "R04": (SHOULD, "リポジトリに tests/ がある", D_NOK),
    "K01": (MUST, "一覧（marketplace.json）の name と plugin.json の name が同じ", D_MARKET),
    "K02": (SHOULD, "一覧の項目に description と category がある", D_MARKET),
}

PLACEHOLDER = "【雛形】"
PLACEHOLDER_NAME = "plugin-name"
OFFICIAL_SCHEMA = "https://anthropic.com/claude-code/plugin.schema.json"
TEXT_SUFFIXES = {".md", ".json", ".yaml", ".yml", ".mjs", ".js", ".cjs", ".ts", ".py", ".sh", ".txt", ".toml"}
NAME_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$")
SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")
RESERVED_PREFIX = ("claude-", "anthropic-", "cc-plugin-")
RESERVED_NAMES = {"claude", "anthropic", "claude-code", "official"}
JUNK = {".DS_Store", "Thumbs.db"}
MAX_FILE = 256 * 1024          # 公式ディレクトリが保留にするファイルの大きさ
SKILL_MAX_LINES = 500           # SKILL.md は 500 行未満（公式の指針）
DESC_MAX = 1024                 # description の上限（公式の指針）
TOC_AFTER = 100                 # 100 行を超える補助ファイルには目次（公式の指針）
MIN_EVALS = 3                   # eval は 3 件以上（公式の指針）
COMPONENT_KEYS = ("skills", "commands", "agents", "hooks", "mcpServers", "lspServers", "outputStyles")
IGNORED_AGENT_KEYS = ("hooks", "mcpServers", "permissionMode")


@dataclass
class Result:
    rule: str
    level: str
    status: str  # ok / ng / not_run / na
    message: str
    source: str


class Report:
    def __init__(self, target: str):
        self.target = target
        self.title = target
        self.results: list[Result] = []

    def add(self, rule: str, ok: bool | None, message: str = "") -> None:
        level, title, source = RULES[rule]
        status = "na" if ok is None else ("ok" if ok else "ng")
        self.results.append(Result(rule, level, status, message or title, source))

    def not_run(self, rule: str, message: str) -> None:
        level, _, source = RULES[rule]
        self.results.append(Result(rule, level, "not_run", message, source))

    def merged(self) -> list[Result]:
        """同じ決まりの結果を 1 つにまとめる（スキルごとなどに何度も出るため）。外れは全部残す。"""
        out: dict[str, Result] = {}
        bad: list[Result] = []
        for r in self.results:
            if r.status in ("ng", "not_run"):
                bad.append(r)
            elif r.rule not in out or out[r.rule].status == "na":
                out[r.rule] = r
        bad_rules = {r.rule for r in bad}
        good = [r for k, r in out.items() if k not in bad_rules]
        return sorted(bad + good, key=lambda r: (list(RULES).index(r.rule), r.message))

    def counts(self) -> dict[str, int]:
        m = self.merged()
        return {
            "must_ng": sum(r.status == "ng" and r.level == MUST for r in m),
            "should_ng": sum(r.status == "ng" and r.level == SHOULD for r in m),
            "not_run": sum(r.status == "not_run" for r in m),
        }


# ── 読む道具 ─────────────────────────────────────────────

def parse_frontmatter(text: str) -> tuple[dict | None, str]:
    """--- で囲んだ frontmatter を読む。読めなければ (None, 本文)。pyyaml があれば使い、無ければ簡単な読み方をする。"""
    if not text.startswith("---"):
        return None, text
    lines = text.splitlines()
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if end is None:
        return None, text
    raw = "\n".join(lines[1:end])
    body = "\n".join(lines[end + 1:])
    try:
        import yaml  # type: ignore
        data = yaml.safe_load(raw) or {}
        return (data if isinstance(data, dict) else None), body
    except ImportError:
        return _simple_yaml(raw), body
    except Exception:
        return None, body


def _simple_yaml(raw: str) -> dict | None:
    data: dict = {}
    key = None
    for line in raw.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line[0] in " \t":
            if key is None:
                return None
            s = line.strip()
            if s.startswith("- "):
                if not isinstance(data[key], list):
                    data[key] = []
                data[key].append(_scalar(s[2:]))
            elif isinstance(data[key], str):
                data[key] = (data[key] + " " + s).strip()
            continue
        m = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if not m:
            return None
        key, val = m.group(1), m.group(2).strip()
        if val.startswith("[") and val.endswith("]"):
            data[key] = [_scalar(v) for v in val[1:-1].split(",") if v.strip()]
        elif val in ("|", ">", "|-", ">-", ""):
            data[key] = ""
        else:
            data[key] = _scalar(val)
    return data


def _scalar(v: str):
    v = v.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        return v[1:-1]
    if v in ("true", "false"):
        return v == "true"
    return v


def load_json(path: Path) -> tuple[object | None, str]:
    try:
        return json.loads(path.read_text(encoding="utf-8")), ""
    except FileNotFoundError:
        return None, "無い"
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        return None, f"JSON として読めない：{e}"


def find_repo_root(path: Path) -> Path | None:
    for p in [path, *path.parents]:
        if (p / ".git").exists():
            return p
    return None


def tracked_files(plugin: Path) -> list[Path]:
    """配られるファイル。git の中なら追跡しているファイルだけ（node_modules や結果の置き場を数えない）。"""
    root = find_repo_root(plugin)
    if root and shutil.which("git"):
        r = subprocess.run(["git", "-C", str(plugin), "ls-files", "-z", "--", "."],
                           capture_output=True, text=True)
        if r.returncode == 0:
            files = [plugin / f for f in r.stdout.split("\0") if f]
            # まだ追跡していない新しいファイルも、配る候補として見る（無視しているファイルは除く）
            r2 = subprocess.run(["git", "-C", str(plugin), "ls-files", "-z", "--others", "--exclude-standard", "--", "."],
                                capture_output=True, text=True)
            files += [plugin / f for f in r2.stdout.split("\0") if f]
            return sorted({f for f in files if f.exists() or f.is_symlink()})
    out = []
    for dirpath, dirnames, filenames in os.walk(plugin):
        dirnames[:] = [d for d in dirnames if d not in (".git", "node_modules")]
        out += [Path(dirpath) / f for f in filenames]
    return sorted(out)


def as_paths(value) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [v for v in value if isinstance(v, str)]
    return []


# ── 決まりの検査 ─────────────────────────────────────────

def check_plugin(plugin: Path, template: Path = DEFAULT_TEMPLATE, *, claude: str | None = "claude",
                 repo: bool = True) -> Report:
    plugin = plugin.resolve()
    rep = Report(str(plugin))
    if not plugin.is_dir():
        rep.not_run("M01", f"フォルダが見つからない：{plugin}")
        return rep
    manifest_path = plugin / ".claude-plugin" / "plugin.json"
    manifest, err = load_json(manifest_path)
    if not isinstance(manifest, dict):
        rep.add("M01", False, f".claude-plugin/plugin.json が{err or '読めない'}")
        manifest = {}
    else:
        rep.add("M01", True)
        rep.title = f"{manifest.get('name', '?')} {manifest.get('version', '')}".strip()
    files = tracked_files(plugin)

    check_validate(rep, plugin, claude)
    check_manifest(rep, plugin, manifest)
    check_files(rep, plugin, manifest, files, template)
    check_skills(rep, plugin, manifest)
    check_agents(rep, plugin, manifest)
    check_hooks(rep, plugin, manifest)
    check_mcp(rep, plugin, manifest)
    check_evals(rep, plugin, manifest)
    if repo:
        check_repo(rep, plugin)
    return rep


def check_validate(rep: Report, plugin: Path, claude: str | None) -> None:
    exe = shutil.which(claude) if claude else None
    if not exe:
        rep.not_run("V01", f"{claude or 'claude'} が見つからない（npm install -g @anthropic-ai/claude-code）")
        return
    try:
        r = subprocess.run([exe, "plugin", "validate", "--strict", "--profile", "directory", "--json", str(plugin)],
                           capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        rep.not_run("V01", "公式の検査が 120 秒で終わらなかった")
        return
    try:
        data = json.loads(r.stdout)
    except json.JSONDecodeError:
        rep.not_run("V01", f"公式の検査の結果が読めない（終わりの値 {r.returncode}）：{(r.stderr or r.stdout).strip()[:200]}")
        return
    if data.get("success") and r.returncode == 0:
        rep.add("V01", True)
        return
    msgs = []
    m = data.get("manifest") or {}
    for e in (m.get("errors") or []) + (m.get("warnings") or []):
        msgs.append(f"{e.get('path', '')}: {e.get('message', '')}")
    for c in data.get("contents") or []:
        for e in (c.get("errors") or []) + (c.get("warnings") or []):
            msgs.append(f"{c.get('file', '')}: {e.get('message', '')}")
    for f in (data.get("directory") or {}).get("findings") or []:
        msgs.append(f"{f.get('code', '')}（{f.get('severity', '')}）")
    rep.add("V01", False, "公式の検査に落ちた：" + ("; ".join(msgs)[:400] or f"終わりの値 {r.returncode}"))


def check_manifest(rep: Report, plugin: Path, m: dict) -> None:
    if not m:
        return
    name = m.get("name")
    ok_name = isinstance(name, str) and bool(NAME_RE.match(name)) and not name.startswith(RESERVED_PREFIX) \
        and name not in RESERVED_NAMES
    rep.add("M02", ok_name, "" if ok_name else f"name が決まりに合わない：{name!r}")
    ver = m.get("version")
    ok = isinstance(ver, str) and bool(SEMVER_RE.match(ver))
    rep.add("M03", ok, "" if ok else f"version が semver でない・無い：{ver!r}（上げないと入れた人に届かない）")
    desc = m.get("description")
    rep.add("M04", isinstance(desc, str) and bool(desc.strip()))
    author = m.get("author")
    rep.add("M05", isinstance(author, dict) and bool(str(author.get("name", "")).strip()))
    missing = [k for k in ("homepage", "repository") if not m.get(k)]
    rep.add("M06", not missing, "" if not missing else f"無い：{', '.join(missing)}")
    has_license_file = any((plugin / n).exists() for n in ("LICENSE", "LICENSE.md", "LICENSE.txt"))
    rep.add("M07", bool(m.get("license")) or has_license_file)
    kw = m.get("keywords")
    rep.add("M08", isinstance(kw, list) and len(kw) > 0)
    rep.add("M09", m.get("$schema") == OFFICIAL_SCHEMA,
            "" if m.get("$schema") == OFFICIAL_SCHEMA else f"$schema が {OFFICIAL_SCHEMA} でない（{m.get('$schema')!r}）")
    rep.add("M10", bool(m.get("supportUrl")))
    bad = []
    for key in COMPONENT_KEYS:
        for p in as_paths(m.get(key)):
            if key == "skills" and p == ".":
                continue
            if key == "mcpServers" and p.startswith("https://"):
                continue
            if not p.startswith("./") or ".." in Path(p).parts or "\\" in p:
                bad.append(f"{key}: {p}")
    rep.add("M11", not bad, "" if not bad else "パスの形が違う：" + ", ".join(bad))


def check_files(rep: Report, plugin: Path, m: dict, files: list[Path], template: Path) -> None:
    readme = plugin / "README.md"
    root = find_repo_root(plugin)
    rep.add("F12", readme.exists(), "" if readme.exists() else "プラグインのフォルダに README.md が無い")
    if not readme.exists() and root is not None and (root / "README.md").exists():
        readme = root / "README.md"
    if readme.exists():
        rep.add("F01", True)
        text = readme.read_text(encoding="utf-8", errors="replace")
        rep.add("F02", bool(re.search(r"(?:/plugin|claude plugin)\s+install\b", text)))
        heads = [l for l in text.splitlines() if l.startswith("#")]
        rep.add("F03", any(re.search(r"動かす|送る|送信|Security|Privacy|Data|セキュリティ|安全", h, re.I) for h in heads))
    else:
        rep.add("F01", False, "README.md が無い（公式ディレクトリは 40 語以上の README を求める）")
    rep.add("F04", any((plugin / n).exists() for n in ("LICENSE", "LICENSE.md", "LICENSE.txt")))
    ch = plugin / "CHANGELOG.md"
    ver = m.get("version")
    if not ch.exists():
        rep.add("F05", False, "CHANGELOG.md が無い")
    else:
        has = isinstance(ver, str) and re.search(rf"^#+\s*\[?v?{re.escape(ver)}\]?", ch.read_text(encoding="utf-8"), re.M)
        rep.add("F05", bool(has), "" if has else f"CHANGELOG.md に {ver} の見出しが無い")

    icon = None
    if isinstance(m.get("icon"), str):
        cand = (plugin / m["icon"]).resolve()
        icon = cand if cand.is_file() else None
    if icon is None:
        for c in (".claude-plugin/icon.png", ".claude-plugin/icon.svg", "assets/icon.png", "assets/icon.svg"):
            if (plugin / c).is_file():
                icon = plugin / c
                break
    rep.add("F06", icon is not None)
    tmpl_icon = template / ".claude-plugin" / "icon.png"
    if icon is not None and tmpl_icon.is_file() and plugin != template.resolve():
        same = sha256(icon) == sha256(tmpl_icon)
        rep.add("F07", not same, "アイコンが雛形の仮の物のまま" if same else "")
    elif icon is not None and plugin == template.resolve():
        rep.add("F07", False, "アイコンが雛形の仮の物のまま（雛形そのもの）")
    else:
        rep.add("F07", None)

    left = []
    if m.get("name") == PLACEHOLDER_NAME:
        left.append("plugin.json の name が plugin-name")
    for f in files:
        if f.suffix in TEXT_SUFFIXES and f.is_file() and not f.is_symlink():
            try:
                t = f.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            n = t.count(PLACEHOLDER)
            if n:
                left.append(f"{f.relative_to(plugin)}（{n} か所）")
    rep.add("F08", not left, "" if not left else "雛形の印が残っている：" + ", ".join(left[:8]) + (" ほか" if len(left) > 8 else ""))

    root_bad = [n for n in ("CLAUDE.md", "bin") if (plugin / n).exists()]
    rep.add("F09", not root_bad, "" if not root_bad else "直下にある：" + ", ".join(root_bad))
    junk = [str(f.relative_to(plugin)) for f in files
            if f.name in JUNK or "__MACOSX" in f.parts or f.is_symlink()]
    rep.add("F10", not junk, "" if not junk else "要らない物：" + ", ".join(junk[:8]))
    big = [f"{f.relative_to(plugin)}（{f.stat().st_size // 1024} KiB）" for f in files
           if f.is_file() and not f.is_symlink() and f.stat().st_size > MAX_FILE]
    rep.add("F11", not big, "" if not big else "大きい：" + ", ".join(big[:8]))


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def skill_dirs(plugin: Path, m: dict) -> list[Path]:
    roots = [plugin / "skills"] + [(plugin / p).resolve() for p in as_paths(m.get("skills"))]
    out: list[Path] = []
    for r in roots:
        if (r / "SKILL.md").is_file():
            out.append(r)
        elif r.is_dir():
            out += sorted(d for d in r.iterdir() if (d / "SKILL.md").is_file())
    return sorted(set(out))


def check_skills(rep: Report, plugin: Path, m: dict) -> None:
    dirs = skill_dirs(plugin, m)
    if not dirs:
        for r in ("S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08"):
            rep.add(r, None, "スキルが無い")
        return
    for d in dirs:
        label = d.relative_to(plugin) if d.is_relative_to(plugin) else d
        text = (d / "SKILL.md").read_text(encoding="utf-8", errors="replace")
        fm, body = parse_frontmatter(text)
        if fm is None or not isinstance(fm.get("description"), str) or not fm["description"].strip():
            rep.add("S01", False, f"{label}/SKILL.md：frontmatter が読めないか、description が無い")
            fm = fm or {}
        else:
            rep.add("S01", True)
        name = fm.get("name")
        rep.add("S02", name is None or name == d.name,
                "" if name is None or name == d.name else f"{label}：name {name!r} がフォルダ名 {d.name!r} と違う")
        nm = name if isinstance(name, str) else d.name
        ok = bool(NAME_RE.match(nm)) and "claude" not in nm and "anthropic" not in nm
        rep.add("S03", ok, "" if ok else f"{label}：name {nm!r} が決まりに合わない")
        desc = fm.get("description") if isinstance(fm.get("description"), str) else ""
        rep.add("S04", len(desc) <= DESC_MAX, "" if len(desc) <= DESC_MAX else f"{label}：description が {len(desc)} 字")
        n = len(text.splitlines())
        rep.add("S05", n < SKILL_MAX_LINES, "" if n < SKILL_MAX_LINES else f"{label}/SKILL.md が {n} 行")
        broken = []
        for target in re.findall(r"\]\(([^)\s]+)\)", body):
            if re.match(r"^[a-z]+:", target) or target.startswith("#"):
                continue
            t = target.split("#")[0]
            t = t.replace("${CLAUDE_SKILL_DIR}/", "")
            if t and not (d / t).exists():
                broken.append(t)
        rep.add("S06", not broken, "" if not broken else f"{label}：リンク先が無い：" + ", ".join(broken))
        no_toc = []
        for f in sorted(d.rglob("*.md")):
            if f.name == "SKILL.md":
                continue
            lines = f.read_text(encoding="utf-8", errors="replace").splitlines()
            if len(lines) > TOC_AFTER:
                head = "\n".join(lines[:40])
                if not (re.search(r"目次|Contents", head, re.I) or len(re.findall(r"^\s*[-*]\s*\[.+\]\(#", head, re.M)) >= 3):
                    no_toc.append(str(f.relative_to(d)))
        rep.add("S07", not no_toc, "" if not no_toc else f"{label}：目次が無い：" + ", ".join(no_toc))
        bs = re.findall(r"\b[\w.-]+\\[\w.-]+\.(?:py|sh|mjs|js|ts|md|json|ya?ml)\b", text)
        rep.add("S08", not bs, "" if not bs else f"{label}：" + ", ".join(sorted(set(bs))[:5]))


def agent_files(plugin: Path, m: dict) -> list[Path]:
    out = sorted((plugin / "agents").rglob("*.md")) if (plugin / "agents").is_dir() else []
    out += [(plugin / p).resolve() for p in as_paths(m.get("agents")) if p.endswith(".md")]
    return sorted({p for p in out if p.is_file()})


def check_agents(rep: Report, plugin: Path, m: dict) -> None:
    files = agent_files(plugin, m)
    if not files:
        for r in ("A01", "A02", "A03"):
            rep.add(r, None, "エージェントが無い")
        return
    for f in files:
        label = f.relative_to(plugin) if f.is_relative_to(plugin) else f
        fm, _ = parse_frontmatter(f.read_text(encoding="utf-8", errors="replace"))
        fm = fm or {}
        ok = bool(fm.get("name")) and bool(fm.get("description"))
        rep.add("A01", ok, "" if ok else f"{label}：name か description が無い")
        rep.add("A02", "tools" in fm, "" if "tools" in fm else f"{label}：tools が無い")
        ign = [k for k in IGNORED_AGENT_KEYS if k in fm]
        rep.add("A03", not ign, "" if not ign else f"{label}：無視される項目：" + ", ".join(ign))


def hook_sources(plugin: Path, m: dict) -> list[tuple[str, object]]:
    out = []
    default = plugin / "hooks" / "hooks.json"
    if default.exists():
        out.append(("hooks/hooks.json", default))
    v = m.get("hooks")
    if isinstance(v, dict):
        out.append(("plugin.json の hooks", v))
    for p in as_paths(v):
        q = (plugin / p).resolve()
        if q != default.resolve():
            out.append((p, q))
    return out


def check_hooks(rep: Report, plugin: Path, m: dict) -> None:
    srcs = hook_sources(plugin, m)
    if not srcs:
        for r in ("H01", "H02", "H03", "H04"):
            rep.add(r, None, "フックが無い")
        return
    for label, src in srcs:
        if isinstance(src, Path):
            data, err = load_json(src)
        else:
            data, err = src, ""
        if not isinstance(data, dict) or not isinstance(data.get("hooks"), dict):
            rep.add("H01", False, f"{label}：{err or '最上位に hooks が無い'}")
            continue
        rep.add("H01", True)
        for event, groups in data["hooks"].items():
            for g in groups if isinstance(groups, list) else []:
                for h in (g.get("hooks") or []) if isinstance(g, dict) else []:
                    if not isinstance(h, dict) or h.get("type") != "command":
                        continue
                    cmd = str(h.get("command", ""))
                    args = [str(a) for a in h.get("args") or []]
                    joined = " ".join([cmd, *args])
                    rel = re.search(r"(?:^|[\s\"'])(?:\./|hooks/|scripts/)[\w./-]+", joined)
                    rep.add("H02", not rel, "" if not rel else f"{label} {event}：{rel.group(0).strip()} を ${{CLAUDE_PLUGIN_ROOT}} で指していない")
                    rep.add("H03", "timeout" in h, "" if "timeout" in h else f"{label} {event}：timeout が無い（既定は 600 秒）")
                    unquoted = not args and re.search(r'(?<!")\$\{CLAUDE_PLUGIN_ROOT\}', cmd)
                    rep.add("H04", not unquoted, "" if not unquoted else f"{label} {event}：${{CLAUDE_PLUGIN_ROOT}} を二重引用符で囲んでいない")


def mcp_servers(plugin: Path, m: dict) -> list[tuple[str, dict]]:
    out = []
    srcs: list[object] = []
    if (plugin / ".mcp.json").exists():
        srcs.append(plugin / ".mcp.json")
    v = m.get("mcpServers")
    if isinstance(v, dict):
        srcs.append(v)
    srcs += [(plugin / p).resolve() for p in as_paths(v) if p.endswith(".json")]
    for s in srcs:
        data = load_json(s)[0] if isinstance(s, Path) else s
        if not isinstance(data, dict):
            continue
        servers = data.get("mcpServers", data)
        for name, conf in servers.items() if isinstance(servers, dict) else []:
            if isinstance(conf, dict):
                out.append((name, conf))
    return out


def check_mcp(rep: Report, plugin: Path, m: dict) -> None:
    servers = mcp_servers(plugin, m)
    if not servers:
        rep.add("P01", None, "MCP サーバーが無い")
        rep.add("P02", None, "MCP サーバーが無い")
        return
    for name, conf in servers:
        cmd = Path(str(conf.get("command", ""))).name
        if cmd in ("npx", "uvx", "bunx"):
            pkg = next((a for a in conf.get("args") or [] if isinstance(a, str) and not a.startswith("-")), "")
            pinned = bool(re.match(r"^(?:@[^/@]+/)?[^@]+[@=]{1,2}\d", pkg))
            rep.add("P01", pinned, "" if pinned else f"{name}：{cmd} の {pkg or '（パッケージ不明）'} の版が固定されていない")
        else:
            rep.add("P01", None)
        url = conf.get("url")
        if url:
            rep.add("P02", str(url).startswith("https://"), "" if str(url).startswith("https://") else f"{name}：{url}")
        else:
            rep.add("P02", None)


def check_evals(rep: Report, plugin: Path, m: dict) -> None:
    ev = (m.get("experimental") or {}).get("evals") if isinstance(m.get("experimental"), dict) else None
    d = plugin / (ev if isinstance(ev, str) else "evals")
    cases = sorted(p for p in d.iterdir() if p.is_dir() and p.name not in ("results", "mocks")) if d.is_dir() else []
    rep.add("E01", len(cases) >= MIN_EVALS, "" if len(cases) >= MIN_EVALS else f"eval のケースが {len(cases)} 件")
    if not cases:
        rep.add("E02", None, "eval が無い")
    for c in cases:
        ok = (c / "prompt.md").is_file() and any((c / "graders").glob("*.md"))
        rep.add("E02", ok, "" if ok else f"{c.name}：prompt.md か graders/*.md が無い")


def check_repo(rep: Report, plugin: Path) -> None:
    root = find_repo_root(plugin)
    if root is None:
        for r in ("R01", "R02", "R03", "R04"):
            rep.add(r, None, "git のリポジトリの中でない")
        return
    wf = sorted((root / ".github" / "workflows").glob("*.y*ml")) if (root / ".github" / "workflows").is_dir() else []
    texts = [p.read_text(encoding="utf-8", errors="replace") for p in wf]
    # CI から呼ぶ scripts/*.sh も、CI の中身として読む
    for t in list(texts):
        for s in re.findall(r"(scripts/[\w.-]+\.sh)", t):
            if (root / s).is_file():
                texts.append((root / s).read_text(encoding="utf-8", errors="replace"))
    runs_validate = any("plugin validate" in t for t in texts)
    rep.add("R01", runs_validate, "" if runs_validate else ("CI が無い" if not wf else "CI が claude plugin validate を流していない"))
    strict = any(re.search(r"plugin validate[^\n]*--strict", t) for t in texts)
    rep.add("R02", strict, "" if strict else "CI の検査に --strict が無い")
    gh = root / ".github"
    rep.add("R03", (gh / "pull_request_template.md").exists() or (gh / "PULL_REQUEST_TEMPLATE").is_dir())
    rep.add("R04", (root / "tests").is_dir())


# ── マーケットプレイス ───────────────────────────────────

def resolve_entry(entry: dict, market_root: Path, workspace: Path) -> Path | None:
    src = entry.get("source")
    if isinstance(src, str):
        return (market_root / src).resolve()
    if isinstance(src, dict):
        kind = src.get("source")
        if kind == "github" and src.get("repo"):
            return workspace / src["repo"].split("/")[-1] / src.get("path", "")
        if kind in ("git-subdir", "url") and src.get("url"):
            name = re.sub(r"\.git$", "", src["url"].rstrip("/").split("/")[-1])
            return workspace / name / src.get("path", "")
    return None


def check_marketplace(path: Path, workspace: Path, **kw) -> list[Report]:
    data, err = load_json(path)
    if not isinstance(data, dict):
        r = Report(str(path))
        r.not_run("K01", f"marketplace.json が{err}")
        return [r]
    root = path.resolve().parent.parent
    reports = []
    for e in data.get("plugins") or []:
        target = resolve_entry(e, root, workspace)
        if target is None or not (target / ".claude-plugin" / "plugin.json").exists():
            r = Report(f"{e.get('name')}（{target or e.get('source')}）")
            r.not_run("K01", f"向けた先が手元に無い：{target}（--workspace に、そのリポジトリを置く）")
            reports.append(r)
            continue
        r = check_plugin(target, **kw)
        m = load_json(target / ".claude-plugin" / "plugin.json")[0] or {}
        same = isinstance(m, dict) and m.get("name") == e.get("name")
        r.add("K01", same, "" if same else f"一覧は {e.get('name')!r}、plugin.json は {m.get('name')!r}")
        miss = [k for k in ("description", "category") if not e.get(k)]
        r.add("K02", not miss, "" if not miss else "一覧に無い：" + ", ".join(miss))
        reports.append(r)
    return reports


# ── 出力 ─────────────────────────────────────────────────

MARK = {"ok": "○", "ng": "✗", "not_run": "？", "na": "－"}
LEVEL = {MUST: "必須", SHOULD: "推奨"}


def render(reports: list[Report], show_all: bool) -> str:
    out = []
    for rep in reports:
        c = rep.counts()
        out.append(f"■ {rep.title}  （{rep.target}）")
        out.append(f"  必須の外れ {c['must_ng']}・推奨の外れ {c['should_ng']}・未実行 {c['not_run']}")
        for r in rep.merged():
            if r.status in ("ng", "not_run") or (show_all and r.status == "ok"):
                tag = "未実行" if r.status == "not_run" else LEVEL[r.level]
                out.append(f"  {MARK[r.status]} {r.rule} {tag}：{r.message}")
        out.append("")
    if len(reports) > 1:
        out.append("| プラグイン | 必須の外れ | 推奨の外れ | 未実行 |")
        out.append("| --- | --- | --- | --- |")
        for rep in reports:
            c = rep.counts()
            out.append(f"| {rep.title} | {c['must_ng']} | {c['should_ng']} | {c['not_run']} |")
    return "\n".join(out)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="プラグインと雛形の決まりとの差を出す")
    ap.add_argument("plugins", nargs="*", type=Path)
    ap.add_argument("--marketplace", type=Path)
    ap.add_argument("--workspace", type=Path, default=Path(".."))
    ap.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE)
    ap.add_argument("--claude", default="claude")
    ap.add_argument("--no-repo", action="store_true")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--strict", action="store_true")
    a = ap.parse_args(argv)
    if not a.plugins and not a.marketplace:
        ap.print_usage(sys.stderr)
        return 2
    kw = dict(template=a.template, claude=a.claude, repo=not a.no_repo)
    reports = [check_plugin(p, **kw) for p in a.plugins]
    if a.marketplace:
        reports += check_marketplace(a.marketplace, a.workspace.resolve(), **kw)
    if a.json:
        print(json.dumps([{"target": r.target, "title": r.title, "counts": r.counts(),
                           "results": [asdict(x) for x in r.merged()]} for r in reports],
                         ensure_ascii=False, indent=2))
    else:
        print(render(reports, a.all))
    bad = any(r.counts()["must_ng"] or r.counts()["not_run"] or (a.strict and r.counts()["should_ng"]) for r in reports)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
