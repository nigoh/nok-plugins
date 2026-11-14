---
name: distill-skill
description: This skill should be used when the user wants to distill a skill from a stronger model to a weaker one and measure whether it works - "distill a skill", "run skill distillation", "make Haiku do what Sonnet does", "スキルを蒸留して", "蒸留実験を回して", "下位モデルでも解けるようにして". It runs teacher and student subagents on the user's graded tasks, turns their differences into a skill, and evaluates it against a same-length placebo on held-out tasks.
---

# Distill a skill from a stronger model to a weaker one

Transfer how a stronger model (teacher, Sonnet) solves a kind of task to a weaker model (student, Haiku) as one written skill, with no fine-tuning, and measure the effect on tasks the skill never saw.

Talk to the user in their language and in plain terms. Report numbers, not process.

The script is `${CLAUDE_PLUGIN_ROOT}/skills/distill-skill/scripts/distill.py` (called `distill.py` below). Every command takes `--work DIR`; use one directory per experiment.

## What the user must provide

A JSON Lines file with one task per line: `{"id": "...", "prompt": "...", "answer": "..."}`. See `references/task-format.md` for accepted-answer lists, custom graders and how to write prompts.

Requirements to check before spending anything:
- At least 60 tasks of ONE kind (default split: 20 for distillation, 40 held out). Fewer than 30 held-out tasks cannot show anything but very large effects.
- Each task has a short answer that can be graded automatically. Do not use an LLM as the grader.
- The tasks are not solvable by lookup, and the answers are verified. A wrong answer key makes every result meaningless.

If the user has no task file, help them design one, but do not invent answers you cannot verify by running code.

## Workflow

Run the steps in order. Each gate is a real stop: tell the user what happened and let them decide.

### 1. Plan and confirm the cost

Run `distill.py init --tasks FILE [--distill 20 --val 40 --per-run 5 --reps 3 --intro "..." --answer-format "..."]`. It prints the planned number of runs (93 with defaults).

Each run is one subagent and costs roughly 100k-250k tokens. Tell the user the number of runs and the rough total, and wait for a clear yes before step 2.

Set `--intro` to one or two sentences describing the task kind and any conditions (for example "solve by reasoning only"), and `--answer-format` to the exact format the grader expects.

### 2. Baseline on the distillation set (gate: is there a gap?)

`distill.py runs --phase base` prints one JSON line per pending run: `{"run", "agent", "prompt"}`.

Dispatch every line with the Agent tool: `subagent_type` = `skill-distiller:<agent>` (the plugin's `distill-student`, `distill-teacher`, `distill-analyst`), `prompt` = the line's prompt, unchanged. If the plugin agents are not available, use a general agent with `model: haiku` for `distill-student` and `model: sonnet` for the other two. Never use a larger model for the student or teacher.

Dispatch in batches of at most 20 and wait for each batch. Run `distill.py status --phase base` to see what is done; rerun `runs` to list what is still pending and re-dispatch it.

Then `distill.py grade --phase base`. If it prints `STOP` (gap under 15 points), stop and report: on these tasks the student is already close to the teacher, so there is nothing to distill. Suggest a different kind of task rather than harder versions of the same kind.

### 3. Distill

`distill.py material` builds the comparison material and prints one dispatch line for `distill-analyst`. Dispatch it, then run `distill.py skills`. This writes `skill.md` (the lessons) and `placebo.md` (generic advice of the same length).

Read `skill.md` yourself. Do not edit the lessons. Note for the final report any lesson that describes the answer distribution of this task set rather than a way of working (for example "most answers are X"): such a lesson can raise scores here and hurt elsewhere.

### 4. Pre-check on the distillation set (gate: does it hurt?)

`distill.py runs --phase pre`, dispatch, `distill.py grade --phase pre`. If it prints `STOP`, the skill made the student worse on the very tasks it came from; report that and do not evaluate.

A small gain here does not predict the held-out result in either direction; single runs are noisy. Do not tune the skill on this number.

### 5. Evaluate on held-out tasks

`distill.py runs --phase eval --limit 20` lists the next 20 pending runs; dispatch, wait, repeat until `status` shows all done. Conditions are interleaved and the run folders do not reveal the condition.

Four conditions: A student alone, B teacher alone, C student + skill, D student + placebo.

### 6. Report

`distill.py report` writes `report.md` and prints it. Before presenting:
- If any run is reported as unreadable, re-dispatch it (`runs --phase eval`) and rerun the report.
- Give the user the four success rates, the gap closure, and the two verdicts (skill vs alone, skill vs placebo) with their intervals.
- State what the result does not show: see `references/reading-results.md`. Always mention any distribution-leaking lesson found in step 3.
- Give the user `skill.md` as the deliverable.

## Rules

- Never look at or reveal the answer key to a solving agent. Agents get only their own PROMPT.md path.
- Never change tasks, the split, the skill or the grader after seeing evaluation results. If something must change, start a new work directory.
- Never report a result from partial runs as final.
- If a run fails because its output was too long, lower `--per-run` in a new work directory rather than retrying the same sheet repeatedly.
