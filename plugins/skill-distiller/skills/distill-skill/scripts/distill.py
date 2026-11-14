#!/usr/bin/env python3
"""Skill distillation harness: teacher -> student, no weight updates.

Commands (all take --work DIR, default ./distill-work):
  init      split the task file into a distillation set and a held-out validation set
  runs      create run folders for a phase and print one dispatch line per pending run
  status    how many runs of a phase have answers
  grade     grade a phase
  material  build the comparison material and the analyst prompt
  skills    turn the analyst's lessons into the skill and a same-length placebo
  report    write report.md for the evaluation phase
Phases: base (distillation set, both models, no skill), pre (distillation set, student + skill),
        eval (validation set: A student, B teacher, C student + skill, D student + placebo)
"""
import argparse, collections, importlib.util, json, math, os, random, re, secrets, statistics as st, sys

def P(a, *x): return os.path.join(os.path.abspath(a.work), *x)
def jl(path, default=None): return json.load(open(path, encoding="utf-8")) if os.path.exists(path) else default
def jd(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True); json.dump(obj, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
def state(a):
    s = jl(P(a, "state.json"))
    if not s: sys.exit("No state found. Run `init` first.")
    return s
def tasks(a): return {t["id"]: t for t in jl(P(a, ".key", "tasks.json"))}
def norm(x): return re.sub(r"\s+", " ", str(x)).strip().lower()

def load_grader(path):
    if not path: return None
    sp = importlib.util.spec_from_file_location("user_grader", path); m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m)
    return m.grade
def is_correct(t, ans, grader):
    if ans is None: return False
    if grader:
        try: return bool(grader(t, str(ans)))
        except Exception: return False
    acc = t.get("answers") or [t["answer"]]
    return norm(ans) in {norm(x) for x in acc}

# ------------------------------------------------------------------ init
def init(a):
    raw = [json.loads(l) for l in open(a.tasks, encoding="utf-8") if l.strip()]
    ids = [str(t.get("id", i)) for i, t in enumerate(raw)]
    if len(set(ids)) != len(ids): sys.exit("Task ids must be unique.")
    for t, i in zip(raw, ids):
        t["id"] = i
        if "prompt" not in t: sys.exit(f"Task {i} has no 'prompt'.")
        if not a.grader and "answer" not in t and "answers" not in t: sys.exit(f"Task {i} has no 'answer' (or pass --grader).")
    need = a.distill + a.val
    if len(raw) < need: sys.exit(f"{len(raw)} tasks given, but distill ({a.distill}) + val ({a.val}) = {need} are needed.")
    if a.distill % a.per_run or a.val % a.per_run: sys.exit("--distill and --val must be multiples of --per-run.")
    r = random.Random(a.seed); order = ids[:]; r.shuffle(order)
    s = dict(distill=order[:a.distill], val=order[a.distill:need], per_run=a.per_run, reps=a.reps, teacher_reps=a.teacher_reps, seed=a.seed,
             grader=os.path.abspath(a.grader) if a.grader else None, intro=a.intro, answer_format=a.answer_format, min_gap=a.min_gap)
    jd(P(a, ".key", "tasks.json"), raw); jd(P(a, "state.json"), s)
    sheets = (a.distill + a.val) // a.per_run
    n_base = 2 * a.distill // a.per_run; n_pre = a.distill // a.per_run; n_eval = (a.val // a.per_run) * (3 * a.reps + a.teacher_reps)
    print(f"distillation set: {a.distill} tasks, validation set: {a.val} tasks, {a.per_run} per run")
    print(f"planned runs: base {n_base} + analyst 1 + pre {n_pre} + eval {n_eval} = {n_base + 1 + n_pre + n_eval}")
    if len(raw) > need: print(f"note: {len(raw) - need} tasks are unused")

# ------------------------------------------------------------------ runs
def sheet_prompt(s, ts, d, guidance):
    g = f"\n## Guidance\nRead this guidance carefully before you start, and apply it.\n\n{guidance.strip()}\n" if guidance else ""
    body = "\n\n".join(f"### Task {i + 1}\n{t['prompt'].strip()}" for i, t in enumerate(ts))
    return f"""# Tasks
{s['intro']}

Write two files:
1. {d}/notes.md : for each task, 2 to 4 sentences on how you reached your answer and how you checked it.
2. {d}/answers.json : a JSON object mapping the task number (as a string) to your answer. Answer format: {s['answer_format']}

Rules:
- Do not read, list or search any file other than this PROMPT.md. Do not use the web.
- Answer every task. If you are unsure, give your best answer and say so in the notes.
- Write each file once. When both are written, reply with exactly: DONE
{g}
## The tasks
{body}
"""
def plan(a, s, phase):
    k = s["per_run"]; sheets = lambda ids: [ids[i:i + k] for i in range(0, len(ids), k)]
    skill = lambda: open(P(a, "skill.md"), encoding="utf-8").read() if os.path.exists(P(a, "skill.md")) else sys.exit("skill.md missing. Run `skills` first.")
    placebo = lambda: open(P(a, "placebo.md"), encoding="utf-8").read()
    jobs = []
    if phase == "base":
        for i, ids in enumerate(sheets(s["distill"])):
            jobs += [dict(cond="A", role="student", sheet=i, rep=0, ids=ids, g=None), dict(cond="B", role="teacher", sheet=i, rep=0, ids=ids, g=None)]
    elif phase == "pre":
        sk = skill(); jobs = [dict(cond="C", role="student", sheet=i, rep=0, ids=ids, g=sk) for i, ids in enumerate(sheets(s["distill"]))]
    elif phase == "eval":
        sk = skill(); pl = placebo()
        for i, ids in enumerate(sheets(s["val"])):
            for r in range(s["teacher_reps"]): jobs.append(dict(cond="B", role="teacher", sheet=i, rep=r, ids=ids, g=None))
            for r in range(s["reps"]):
                jobs += [dict(cond="A", role="student", sheet=i, rep=r, ids=ids, g=None), dict(cond="C", role="student", sheet=i, rep=r, ids=ids, g=sk), dict(cond="D", role="student", sheet=i, rep=r, ids=ids, g=pl)]
    else: sys.exit("phase must be base, pre or eval")
    return jobs
def runs(a):
    s = state(a); T = tasks(a); mp = P(a, f"manifest_{a.phase}.json"); man = jl(mp, {})
    if not man:
        jobs = plan(a, s, a.phase); random.Random(s["seed"] + len(a.phase)).shuffle(jobs)   # shuffled so conditions interleave
        for j in jobs:
            rid = secrets.token_hex(4); d = P(a, "runs", rid); os.makedirs(d)
            open(os.path.join(d, "PROMPT.md"), "w", encoding="utf-8").write(sheet_prompt(s, [T[i] for i in j["ids"]], d, j.pop("g")))
            man[rid] = j
        jd(mp, man)
    pend = [(r, m) for r, m in man.items() if not os.path.exists(P(a, "runs", r, "answers.json"))]
    for r, m in pend[: a.limit or None]:
        print(json.dumps(dict(run=r, agent=f"distill-{m['role']}", prompt=f"Read the file {P(a, 'runs', r, 'PROMPT.md')} and follow it exactly.")))
    print(f"# {len(man)} runs in phase {a.phase}; {len(pend)} pending; {min(len(pend), a.limit or len(pend))} listed", file=sys.stderr)
def status(a):
    man = jl(P(a, f"manifest_{a.phase}.json"), {}); done = sum(os.path.exists(P(a, "runs", r, "answers.json")) for r in man)
    print(f"{done}/{len(man)} runs of phase {a.phase} have answers")

# ------------------------------------------------------------------ grade
def rows_of(a, phase):
    s = state(a); T = tasks(a); g = load_grader(s["grader"]); man = jl(P(a, f"manifest_{phase}.json"), {}); out = []
    for rid, m in man.items():
        try: ans = json.load(open(P(a, "runs", rid, "answers.json"), encoding="utf-8"))
        except Exception: ans = None
        for i, tid in enumerate(m["ids"]):
            x = None if not isinstance(ans, dict) else ans.get(str(i + 1))
            out.append(dict(rid=rid, cond=m["cond"], sheet=m["sheet"], rep=m["rep"], tid=tid, ans=x, ok=is_correct(T[tid], x, g), missing=ans is None))
    return out
def summarize(rows):
    d = {}
    for c in sorted({r["cond"] for r in rows}):
        x = [r for r in rows if r["cond"] == c]; d[c] = (sum(r["ok"] for r in x), len(x))
    return d
NAMES = {"A": "student, no skill", "B": "teacher, no skill", "C": "student + distilled skill", "D": "student + placebo"}
def grade(a):
    s = state(a); rows = rows_of(a, a.phase)
    if not rows: sys.exit(f"No runs for phase {a.phase}.")
    miss = len({r["rid"] for r in rows if r["missing"]})
    for c, (k, n) in summarize(rows).items(): print(f"{c} ({NAMES[c]}): {k}/{n} = {k / n:.1%}")
    if miss: print(f"WARNING: {miss} runs have no readable answers.json and count as wrong. Re-dispatch them (`runs` lists pending ones) before trusting these numbers.")
    if a.phase == "base":
        sm = summarize(rows); gap = sm["B"][0] / sm["B"][1] - sm["A"][0] / sm["A"][1]
        fails = sum(1 for r in rows if r["cond"] == "A" and not r["ok"])
        print(f"teacher - student gap: {gap:+.1%}; student failures available to learn from: {fails}")
        if gap < s["min_gap"]: print(f"STOP: the gap is under {s['min_gap']:.0%}. There is little to distill on these tasks. Tell the user and do not continue without their decision.")
    if a.phase == "pre":
        base = summarize(rows_of(a, "base")); c = summarize(rows)["C"]
        print(f"same tasks without the skill: {base['A'][0]}/{base['A'][1]}")
        if c[0] < base["A"][0]: print("STOP: the skill made the student worse on the tasks it was distilled from. Tell the user before evaluating.")

# ------------------------------------------------------------------ material / skills
def material(a):
    s = state(a); T = tasks(a); rows = rows_of(a, "base"); man = jl(P(a, "manifest_base.json"), {})
    if not rows or any(r["missing"] for r in rows): sys.exit("Baseline runs are incomplete. Finish and grade phase base first.")
    d = P(a, "analyst"); os.makedirs(d, exist_ok=True); out = ["# Material: the same tasks solved by a student and a teacher\n"]
    for sh in sorted({m["sheet"] for m in man.values()}):
        out.append(f"\n## Sheet {sh + 1}\n")
        ids = next(m["ids"] for m in man.values() if m["sheet"] == sh)
        for i, tid in enumerate(ids):
            t = T[tid]; h = next(r for r in rows if r["tid"] == tid and r["cond"] == "A"); te = next(r for r in rows if r["tid"] == tid and r["cond"] == "B")
            exp = "" if s["grader"] else f" | accepted answer: {json.dumps(t.get('answers') or t['answer'], ensure_ascii=False)}"
            out.append(f"### Task {i + 1}\n{t['prompt'].strip()[:1500]}\n\nstudent answered {json.dumps(h['ans'], ensure_ascii=False)} ({'correct' if h['ok'] else 'WRONG'}) | teacher answered {json.dumps(te['ans'], ensure_ascii=False)} ({'correct' if te['ok'] else 'WRONG'}){exp}\n")
        for cond, label in (("A", "Student"), ("B", "Teacher")):
            rid = next(r for r, m in man.items() if m["sheet"] == sh and m["cond"] == cond); f = P(a, "runs", rid, "notes.md")
            out.append(f"\n### {label} notes for sheet {sh + 1}\n\n{open(f, encoding='utf-8').read()[:6000] if os.path.exists(f) else '(no notes written)'}\n")
    open(os.path.join(d, "MATERIAL.md"), "w", encoding="utf-8").write("\n".join(out))
    open(os.path.join(d, "PROMPT.md"), "w", encoding="utf-8").write(f"""# Task
Read {d}/MATERIAL.md. It contains tasks, the answers and working notes of a weaker solver (student) and a stronger solver (teacher), and which answers were correct.

Compare how the student and the teacher worked, especially on the tasks the student got wrong and the teacher got right. Then write lessons that would have prevented the student's mistakes on NEW tasks of the same kind.

Requirements for the lessons:
- At most {a.max_lessons} lessons, most important first. Each at most 60 words.
- Each lesson must be a general working procedure or check. Do not mention any specific task, value or answer from the material.
- Base them on differences you can actually see in the material, not on general advice.
- The reader works under the same conditions as the student did.

Write the result to {d}/lessons.json as a JSON list of strings, and nothing else in that file.
Do not read any other file. When the file is written, reply with exactly: DONE
""")
    print(json.dumps(dict(run="analyst", agent="distill-analyst", prompt=f"Read the file {d}/PROMPT.md and follow it exactly.")))
PLACEBO = ["Read each task carefully before you start.", "Take your time and work through the tasks one at a time.", "Careful work rewards patience and clear thinking.", "Make sure every answer uses the requested format.",
           "Keep your notes short and well organised.", "Stay focused from the first task to the last.", "Double-check that every answer is written in the answer file.", "Work in a consistent order so that nothing is skipped.",
           "Stay calm if a task looks unfamiliar; each one has an answer.", "Clear writing makes your reasoning easier to follow.", "Give each task the same level of attention.", "Think about the task as a whole before settling on an answer.",
           "Use plain, standard wording in your notes.", "Quality matters more than speed on tasks like these.", "Finish every task before writing the final file.", "Check that the task numbers in your answer file match the sheet."]
def skills(a):
    s = state(a); L = jl(P(a, "analyst", "lessons.json"))
    if not (isinstance(L, list) and L and all(isinstance(x, str) and x.strip() for x in L)): sys.exit("analyst/lessons.json is missing or is not a non-empty JSON list of strings.")
    head = "# Working practices for these tasks\n\n"; C = head + "\n".join(f"- {x.strip()}" for x in L) + "\n"
    r = random.Random(s["seed"]); pool = PLACEBO[:]; r.shuffle(pool); ps = []; i = 0
    while len(head + "\n".join(f"- {x}" for x in ps) + "\n") < len(C): ps.append(pool[i % len(pool)]); i += 1
    D = head + "\n".join(f"- {x}" for x in ps) + "\n"
    open(P(a, "skill.md"), "w", encoding="utf-8").write(C); open(P(a, "placebo.md"), "w", encoding="utf-8").write(D)
    print(f"{len(L)} lessons -> skill.md ({len(C)} characters, {len(C.split())} words); placebo.md ({len(D)} characters)")

# ------------------------------------------------------------------ report
def sign_p(w, l):
    n = w + l
    return 1.0 if n == 0 else min(1.0, 2 * sum(math.comb(n, i) for i in range(min(w, l) + 1)) / 2 ** n)
def boot(groups, seed, n=10000):
    """groups: list of lists of per-task differences; resamples whole groups (runs share a sheet, so tasks in a sheet are not independent)."""
    r = random.Random(seed); ms = []
    for _ in range(n):
        d = [v for g in (r.choice(groups) for _ in groups) for v in g]; ms.append(st.mean(d))
    ms.sort(); return ms[int(.025 * n)], ms[int(.975 * n) - 1]
def report(a):
    s = state(a); rows = rows_of(a, "eval"); man = jl(P(a, "manifest_eval.json"), {})
    if not rows: sys.exit("No evaluation runs.")
    miss = len({r["rid"] for r in rows if r["missing"]}); conds = [c for c in "ABCD" if any(r["cond"] == c for r in rows)]
    per = {c: {t: st.mean(r["ok"] for r in rows if r["cond"] == c and r["tid"] == t) for t in s["val"]} for c in conds}
    sheet = {t: i // s["per_run"] for i, t in enumerate(s["val"])}; m = {c: st.mean(per[c].values()) for c in conds}; sm = summarize(rows)
    jp = {"A": "素の生徒", "B": "素の教師", "C": "生徒＋蒸留スキル", "D": "生徒＋プラセボ"}
    o = ["# スキル蒸留：評価結果", "", f"検証用 {len(s['val'])} 件、1実行 {s['per_run']} 件、生徒 {s['reps']} 回・教師 {s['teacher_reps']} 回、蒸留用 {len(s['distill'])} 件。", "",
         "| 条件 | 内容 | 正解 | 正解率 |", "| --- | --- | --- | --- |"] + [f"| {c} | {jp[c]} | {sm[c][0]} / {sm[c][1]} | {sm[c][0] / sm[c][1]:.1%} |" for c in conds]
    gap = m["B"] - m["A"]
    o += ["", f"**差の縮小率 (C − A) / (B − A)：{(m['C'] - m['A']) / gap:.0%}**" if gap > 0 else "**差の縮小率：計算不能（教師が生徒を上回っていません）**"]
    if gap > 0: o.append(f"プラセボの縮小率 (D − A) / (B − A)：{(m['D'] - m['A']) / gap:.0%}")
    o += ["", "| 比較 | 差 | 95%区間（シート単位の再標本化） | 課題単位の勝ち / 負け / 引き分け | 符号検定 p |", "| --- | --- | --- | --- | --- |"]
    verdict = {}
    for x, y, name in (("C", "A", "スキル 対 素"), ("C", "D", "スキル 対 プラセボ"), ("D", "A", "プラセボ 対 素"), ("B", "C", "教師 対 スキルあり生徒")):
        d = {t: per[x][t] - per[y][t] for t in s["val"]}; w = sum(v > 0 for v in d.values()); l = sum(v < 0 for v in d.values())
        groups = [[d[t] for t in s["val"] if sheet[t] == g] for g in sorted(set(sheet.values()))]; lo, hi = boot(groups, s["seed"]); verdict[(x, y)] = (lo, hi)
        o.append(f"| {name}（{x} − {y}） | {st.mean(d.values()):+.1%} | {lo:+.1%} 〜 {hi:+.1%} | {w} / {l} / {len(d) - w - l} | {sign_p(w, l):.3f} |")
    def v(k): lo, hi = verdict[k]; return "支持（区間がゼロを含まない）" if lo > 0 else "不支持（逆方向）" if hi < 0 else "判定できない（区間がゼロを含む）"
    o += ["", f"- スキルで生徒が上がる：{v(('C', 'A'))}", f"- 効果は中身による（プラセボを上回る）：{v(('C', 'D'))}", "", "## 実行ごとの正解数", ""]
    run = collections.Counter(); 
    for r in rows: run[(r["cond"], r["rid"])] += r["ok"]
    for c in conds: o.append(f"- {c}：" + "、".join(f"{k}問が{n}実行" for k, n in sorted(collections.Counter(v for (cc, _), v in run.items() if cc == c).items())))
    o += ["", "## 読み取りの注意", ""]
    if miss: o.append(f"- **{miss} 実行は答案が読めず、不正解として数えています。**")
    if sm["B"][0] / sm["B"][1] - sm["A"][0] / sm["A"][1] < s["min_gap"]: o.append("- 教師と生徒の差が小さく、縮小率は不安定です。")
    if len(set(sheet.values())) < 6: o.append("- シート数が6未満で、区間は粗い目安です。")
    o += ["- 同じシートの課題は同じ実行で解かれるため独立ではありません。区間はシート単位で再標本化しています。", "- どの教訓が効いたかは分かりません。検証はスキル全体で行っています。",
          "- スキルが課題の偏りそのもの（例：答えの傾向）を教えていないか、skill.md を読んで確認してください。", "- 効果はこの課題の種類に限った結果です。"]
    text = "\n".join(o) + "\n"; open(P(a, "report.md"), "w", encoding="utf-8").write(text); print(text)

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); ap.add_argument("--work", default="distill-work")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("init"); p.add_argument("--tasks", required=True); p.add_argument("--distill", type=int, default=20); p.add_argument("--val", type=int, default=40)
    p.add_argument("--per-run", type=int, default=5); p.add_argument("--reps", type=int, default=3); p.add_argument("--teacher-reps", type=int, default=1); p.add_argument("--seed", type=int, default=1)
    p.add_argument("--grader"); p.add_argument("--intro", default="Solve each of the tasks below."); p.add_argument("--answer-format", default="a short string"); p.add_argument("--min-gap", type=float, default=0.15)
    for name in ("runs", "status", "grade"):
        q = sub.add_parser(name); q.add_argument("--phase", required=True, choices=["base", "pre", "eval"])
        if name == "runs": q.add_argument("--limit", type=int, default=0)
    q = sub.add_parser("material"); q.add_argument("--max-lessons", type=int, default=8)
    sub.add_parser("skills"); sub.add_parser("report")
    a = ap.parse_args(); {"init": init, "runs": runs, "status": status, "grade": grade, "material": material, "skills": skills, "report": report}[a.cmd](a)
