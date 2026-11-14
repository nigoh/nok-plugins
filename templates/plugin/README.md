# プラグインの雛形

- `.claude-plugin/plugin.json`：名前・版・説明（`name` だけが必須）。
- `skills/<名前>/SKILL.md`：スキル。frontmatter の `name` と `description` が要る。
- 足せる物：`commands/`（コマンド）、`agents/`（エージェント）、`hooks/hooks.json`（フック）、`scripts/`（フックやスキルが呼ぶ道具）。どれもプラグインの直下に置く（`.claude-plugin/` の中に入れない）。
- プラグインの直下に `bin/` を作らない（claude.ai 側で入れられなくなる）。直下の `CLAUDE.md` は読まれない。
