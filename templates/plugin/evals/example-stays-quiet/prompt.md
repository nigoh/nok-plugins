---
name: example-stays-quiet
description: 【雛形】関係の無い依頼では、スキルが呼ばれない
tags: [example, trigger, cheap]
expected_outcome: example のスキルを呼ばずに答える
max_turns: 5
allowed_tools: [Read, Glob, Grep, Skill]
---
【雛形】このスキルと似ているが、使うべきでない依頼の文を書く（呼ばれすぎを見つけるため）。
