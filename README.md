# nok-plugins

株式会社ノックの Claude Code プラグイン置き場（マーケットプレイス）です。非公開。

## 使い方

```
/plugin marketplace add nigoh/nok-plugins
/plugin install konomi@nok-plugins
/plugin install pipe-in@nok-plugins
```

非公開のリポジトリなので、GitHub に入れる状態（`gh auth login` など）で実行してください。

## 入っているプラグイン

| 名前 | 中身 | 場所 |
| --- | --- | --- |
| konomi | 好みに沿った良いフロントエンドを、要件からテストまで一貫して作る知識型スキル | 別のリポジトリ（`nigoh/konomi` の `plugin/`） |
| pipe-in | pipe-in のパイプを会話で作る・直す・流す。成果物の検査と審査 | 別のリポジトリ（`nigoh/pipe-in` の `plugin/`） |

## フォルダの決まり

| 場所 | 中身 | 配られるか |
| --- | --- | --- |
| `.claude-plugin/marketplace.json` | プラグインの一覧 | 一覧として読まれる |
| `plugins/<名前>/` | ここに置くプラグインの本体。1 フォルダ 1 プラグイン（今は無い。どれも別のリポジトリにある） | 配られる（このフォルダだけ） |
| `templates/plugin/` | 新しいプラグインの雛形 | 配られない |
| `scripts/` | このリポジトリの確かめ（`check.sh`） | 配られない |

**プラグインに製品のコードを入れない**。試作や振り返りの資料が増えるプラグインは、別のリポジトリに分ける（konomi の試作は `nigoh/konomi` の `lab/`）。

## プラグインを足す手順

1. `templates/plugin/` を `plugins/<名前>/` に写し、`.claude-plugin/plugin.json` の `name`・`description`・`version` を書く。名前は半角小文字とハイフン。`claude-` `anthropic-` で始めない。
2. `.claude-plugin/marketplace.json` の `plugins` に 1 件足す（`name` と `source: "./plugins/<名前>"`）。
3. `scripts/check.sh` を通す（`claude plugin validate`）。
4. 版を上げるときは `plugin.json` の `version` を変える（変えない限り、入れた人は古い版のまま）。

別のリポジトリにあるプラグイン（konomi・pipe-in）は、`source` を別のリポジトリに向けて一覧に足せます。足す前に、向けた先に `.claude-plugin/plugin.json` があることを確かめてください。

- リポジトリの直下にあるとき：`{ "source": "github", "repo": "<持ち主>/<名前>" }`
- 下のフォルダにあるとき（konomi も pipe-in も `plugin/`）：`{ "source": "git-subdir", "url": "https://github.com/<持ち主>/<名前>.git", "path": "<フォルダ>" }`

版は、向けた先の `plugin/.claude-plugin/plugin.json` の `version` で決まります（ここでは書きません）。プラグインごとの確かめも、それぞれのリポジトリでします。

pipe-in は、スキルのほかに `pipe-in-gen` コマンドも要ります（入れ方は pipe-in の `docs/guide/plugin.md`）。
