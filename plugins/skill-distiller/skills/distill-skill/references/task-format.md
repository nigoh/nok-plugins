# Task file format

One JSON object per line.

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | no | Unique id. Defaults to the line number. |
| `prompt` | yes | The task text shown to the solver. Self-contained; several tasks share one sheet. |
| `answer` | yes, unless a grader is used | The accepted answer. |
| `answers` | no | A list of accepted answers, used instead of `answer`. |

Default grading: the solver's answer equals an accepted answer after trimming, lower-casing and collapsing whitespace.

## Custom grader

Pass `--grader path/to/grader.py` to `init`. The file defines:

```python
def grade(task: dict, answer: str) -> bool:
    ...
```

`task` is the task's JSON object, so extra fields (for example a position to check a move against) are available. Keep the grader deterministic. An exception counts as wrong.

## Writing tasks that can show an effect

- One kind of task per experiment. A skill distilled from mixed kinds teaches nothing specific.
- The stronger model must clearly beat the weaker one. Well-specified function implementation showed no gap between Sonnet and Haiku (15 tasks, zero student failures); multi-step search without tools (mate-in-two puzzles) showed a 20 to 40 point gap.
- Generate tasks and answers by program where possible, and verify each answer by exhaustive check. Generated tasks cannot have been memorised.
- State the conditions in `--intro` (what may and may not be used) so every condition works under the same rules.
- Use short, unambiguous answer formats and spell them out in `--answer-format`, with an example.
- Sheets of 5 short tasks worked; sheets of 10 hit the output limit on one teacher run.
