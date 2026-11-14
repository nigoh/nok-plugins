# Reading the results

## What the numbers mean

- **Success rate**: correct answers over all answers in a condition.
- **Gap closure**: (C − A) / (B − A). How much of the teacher-student difference the skill removed. Unstable when B − A is small.
- **95% interval**: resampled over whole sheets, because tasks solved in the same run succeed or fail together. A comparison is supported only when the interval excludes zero.
- **Task wins / losses / ties**: per held-out task, which condition had the higher success rate.

## What to tell the user every time

1. Which verdicts are supported and which are undecided. "Undecided" is not "no effect".
2. The effect holds for this kind of task only.
3. Whether the gain is spread across runs or comes from preventing a few collapsed runs (see the per-run score distribution). In the first experiment most of the gain came from the student no longer giving up on a whole sheet.
4. Any lesson that describes the task set's answer distribution rather than a way of working.
5. The skill was checked as a whole; which lesson helped is unknown.
6. Token use per condition is not measured by this plugin.

## Reference result

Mate-in-two chess puzzles with a quiet first move, Sonnet teacher, Haiku student, 40 held-out puzzles: student alone 79.2%, teacher 100%, student + skill 97.5%, student + placebo 82.5%; gap closure 88%. Skill vs alone +18.3 points (interval +3.3 to +37.5), skill vs placebo +15.0 points (+3.3 to +28.3).

## Common ways to fool yourself

- Tuning the skill after seeing held-out results, then reporting those same results.
- Dropping a placebo: a longer prompt alone can change behaviour.
- Counting unreadable answer files as data instead of re-running them.
- Using an analyst weaker than the teacher: published work reports far smaller gains in that case.
