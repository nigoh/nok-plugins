import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { invoiceStatusDef, paymentStatusDef } from '../parts'
import { actions, messages, navItems, screenNames } from './terms'

const src = join(__dirname, '..')
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? files(p) : [p]
  })
const sourceFiles = files(src).filter((x) => /\.tsx?$/.test(x) && !/\.test\.tsx?$/.test(x))

/** .konomi/screens.yaml の terms にある avoid を、1 行の書き方のまま読む。 */
const yaml = readFileSync(join(src, '..', '.konomi', 'screens.yaml'), 'utf8')
const avoid = [...yaml.matchAll(/avoid:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]))
const comments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
/** 文字列と JSX の文字だけを見る（識別子や属性名の英字は対象外）。 */
const literalsOf = (text: string) => [...comments(text).matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`|>([^<>{}]+)</g)].map((m) => m[1] ?? m[2] ?? m[3] ?? m[4] ?? '')
const hasJa = (s: string) => /[^\x00-\x7F]/.test(s)
const JA = '぀-ヿ一-鿿'

/** 制度が名前を決めている語（words.md L-01）。screens.yaml の terms の allow に書く。avoid の「発行」を含んでいても使ってよい。 */
const LEGAL_TERMS = [...yaml.matchAll(/allow:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]))
const withoutLegal = (s: string) => LEGAL_TERMS.reduce((t, w) => t.split(w).join(''), s)

/** 画面に出る文字（日本語を含む文字列）を、ファイルごとに集める。 */
const shown = sourceFiles.map((f) => ({ f: relative(src, f).replace(/\\/g, '/'), lits: literalsOf(readFileSync(f, 'utf8')).filter(hasJa) }))
const allLits = (only?: (f: string) => boolean) => shown.filter((s) => !only || only(s.f)).flatMap((s) => s.lits.map((l) => ({ f: s.f, l })))

/** 設計の言葉（WORDS-02）。画面に出さない。 */
const STATE_WORDS = /\b(?:default|empty|loading|error|forbidden|many|partial|offline|not_found|locked|confirming|filtered_empty|invalid|saving|done|resumed|conflict|expired|refreshing|stale)\b/
export const designWords = (s: string): string[] =>
  [...(s.match(/\b(?:SCR|REQ|CMP)-\d+/g) ?? []), ...(s.match(/\b[A-Z]{1,2}-\d{2}\b/g) ?? []), ...(s.match(STATE_WORDS) ?? []), ...['空状態', '主役', 'この図が答える問い'].filter((w) => s.includes(w))]

/** 言い方の規則（WORDS-07・08・06）。問題の文を返す。 */
export const styleProblems = (s: string, opts: { spaces?: boolean } = {}): string[] => {
  const p: string[] = []
  if (/[…！？]|\.\.\.|[぀-ヿ一-鿿][!?]/.test(s)) p.push('「…」「！」「？」')
  if (/\p{Extended_Pictographic}/u.test(s)) p.push('絵文字')
  if (/[０-９Ａ-Ｚａ-ｚ]/.test(s)) p.push('全角の数字・英字')
  if (/[ｦ-ﾟ]/.test(s)) p.push('半角カナ')
  if (/ヶ|カ月/.test(s)) p.push('「ヶ」「カ月」')
  if (/(?<![\d,])\d{4,}円/.test(s)) p.push('桁区切りの無い 4 桁以上の金額')
  if (/[¥￥]/.test(s)) p.push('¥')
  if (opts.spaces !== false && new RegExp(`[0-9] [${JA}]|[${JA}] [0-9]`).test(s)) p.push('数字と日本語の間の空白')
  if (/エラー|不正|正しくありません|サーバー|例外|を忘れて|入力ミス/.test(s)) p.push('誤りの文で使わない語')
  if (/全て/.test(s)) p.push('「全て」（すべて）')
  return p
}
/** 「〜ませんでした。」で終わる文は、直し方（ください・もう一度・残っています・できます）を含む（L-06）。 */
export const missingFix = (s: string): boolean => /ませんでした。/.test(s) && !/ください|もう一度|残っています|できます|確かめて/.test(s)

describe('[REQ-005] 避ける言い方が文言に出ない（WORDS-01・BT-06）', () => {
  it('terms の avoid と設計の言葉を、画面・部品・見本の文字列に使わない', () => {
    expect(avoid.length).toBeGreaterThan(20)
    const words = [...avoid.filter((w) => /[^\x00-\x7F]/.test(w)), '空状態']
    const bad: string[] = []
    for (const f of sourceFiles) {
      for (const lit of literalsOf(readFileSync(f, 'utf8'))) {
        const text = withoutLegal(lit)
        for (const w of words) if (text.includes(w)) bad.push(`${relative(src, f)}: 「${w}」in「${lit.slice(0, 30)}」`)
      }
    }
    expect(bad).toEqual([])
  })
  it('avoid は日本語だけ（英字の語は識別子に当たって誤検出する。words.md L-02）', () => {
    expect(avoid.filter((w) => !hasJa(w))).toEqual([])
  })
  it('制度の語（適格請求書発行事業者）は avoid の「発行」があっても書ける。例外は screens.yaml の allow から読む', () => {
    expect(LEGAL_TERMS).toContain('適格請求書発行事業者')
    expect(avoid).toContain('発行')
    expect(withoutLegal('適格請求書発行事業者の登録番号').includes('発行')).toBe(false)
    expect(withoutLegal('請求書を発行する').includes('発行')).toBe(true)
  })
})

describe('[REQ-005] WORDS-02 設計の言葉を画面に出さない', () => {
  it('日本語を含む文字列に、ID・状態名・「空状態」「主役」が無い', () => {
    expect(allLits().filter(({ l }) => designWords(l).length).map(({ f, l }) => `${f}: ${l.slice(0, 30)}`)).toEqual([])
  })
  it('判定そのもの：設計の言葉を落とし、ふつうの文を通す', () => {
    expect(designWords('SCR-001 の画面')).toEqual(['SCR-001'])
    expect(designWords('empty の状態')).toEqual(['empty'])
    expect(designWords('空状態を出す')).toEqual(['空状態'])
    expect(designWords('D-05 に従う')).toEqual(['D-05'])
    expect(designWords('請求書はまだありません')).toEqual([])
  })
})

describe('[REQ-005] WORDS-06・07・08 言い方の規則', () => {
  it('日本語を含む文字列に、「…」「！」「？」・絵文字・全角の数字・半角カナ・数字と日本語の間の空白が無い（見本データの住所は空白を除く）', () => {
    const bad = allLits().flatMap(({ f, l }) => styleProblems(l, { spaces: f !== 'data/sample.ts' }).map((p) => `${f}: ${p}「${l.slice(0, 24)}」`))
    expect(bad).toEqual([])
  })
  it('「〜ませんでした。」で終わる文は直し方を持つ', () => {
    expect(allLits().filter(({ l }) => missingFix(l)).map(({ f, l }) => `${f}: ${l}`)).toEqual([])
  })
  it('判定そのもの：悪い例を落とし、良い例を通す', () => {
    expect(styleProblems('読み込んでいます…')).toContain('「…」「！」「？」')
    expect(styleProblems('保存しました！')).toContain('「…」「！」「？」')
    expect(styleProblems('請求書は 3 件です')).toContain('数字と日本語の間の空白')
    expect(styleProblems('１２件')).toContain('全角の数字・英字')
    expect(styleProblems('請求額は1200000円です')).toContain('桁区切りの無い 4 桁以上の金額')
    expect(styleProblems('エラーが起きました')).toContain('誤りの文で使わない語')
    expect(styleProblems('全て選ぶ')).toContain('「全て」（すべて）')
    expect(styleProblems('請求額は1,200,000円で、3件あります。')).toEqual([])
    expect(styleProblems('2026年11月13日')).toEqual([])
    expect(missingFix('通信できませんでした。')).toBe(true)
    expect(missingFix('送れませんでした。入力は残っています。もう一度送ってください。')).toBe(false)
  })
})

describe('[REQ-005] 呼び名の正本 terms.ts（WORDS-03・04・07・L-13）', () => {
  const vals = Object.values(actions)
  it('ボタンの文言は 3〜9 字の言い切りで、句点・「…」「！」が無い。「OK」「はい」「こちら」だけにしない', () => {
    for (const v of vals) {
      expect(v.length, v).toBeGreaterThanOrEqual(3)
      expect(v.length, v).toBeLessThanOrEqual(9)
      expect(v, v).not.toMatch(/[。…！？]/)
    }
    expect(vals.filter((v) => /^(OK|はい|いいえ|実行|確認|こちら|ここ|詳細)$/.test(v))).toEqual([])
  })
  it('同じ種類の動作は同じ語尾（保存は「〜を保存する」。対象のない動詞だけにしない）', () => {
    expect(actions.saveDraft).toBe('下書きを保存する')
    expect(actions.save).toBe('保存する')
    expect(actions.exportTable).toBe('表を書き出す')
    expect(vals.filter((v) => (v as string) === '書き出す')).toEqual([])
  })
  it('画面名・状況の札の言葉に句点が無く、メニューは screens.yaml の shell.nav と同じ並び', () => {
    for (const v of [...Object.values(screenNames), ...Object.values(invoiceStatusDef).map((d) => d.label), ...Object.values(paymentStatusDef).map((d) => d.label)]) expect(v).not.toMatch(/[。…！？]/)
    const nav = /nav:\s*\[([^\]]*)\]/.exec(yaml)?.[1].split(',').map((x) => x.trim().replace(/"/g, ''))
    expect(nav).toEqual(navItems.map((n) => screenNames[n.slug]))
  })
  it('terms の use に、メニューの全項目と状況の全部の言葉がある', () => {
    const uses = [...yaml.matchAll(/\{ use: "([^"]+)"/g)].map((m) => m[1])
    const need = [...navItems.map((n) => screenNames[n.slug]), ...Object.values(invoiceStatusDef).map((d) => d.label), ...Object.values(paymentStatusDef).map((d) => d.label), screenNames.setup]
    expect(need.filter((n) => !uses.includes(n))).toEqual([])
  })
})

describe('[REQ-005] WORDS-09 画面ファイルの文言の置き場所（L-13）', () => {
  const ja = `[${JA}]`
  const concat = new RegExp(`(['"\`])[^'"\`\\n]*${ja}[^'"\`\\n]*\\1\\s*\\+|\\+\\s*(['"\`])[^'"\`\\n]*${ja}`)
  /**
   * 第 3 回の振り返りで土台に引き上げた語（2 画面以上が直書きしていた共通の動詞と、待ち・知らせの文）。
   * 第 1 段（土台）では画面を書き換えないので、いまの直書きは一覧を出すだけで落とさず、新しい直書きだけ落とす（ratchet）。
   * 第 2 段で画面を置き換えたら UPLIFT_STRICT を true にする。そのとき UPLIFT_KNOWN は空にする。
   */
  const UPLIFT_STRICT = true
  const UPLIFT_ACTION_KEYS = ['next', 'prev', 'backToInput', 'discardAndLeave', 'saveAndLeave', 'deleteDraft', 'useTheirs', 'overwriteSave'] as const
  const pending = new Set<string>([
    ...UPLIFT_ACTION_KEYS.map((k) => actions[k] as string),
    ...[messages.saving, messages.loading, messages.refreshing, messages.staleBody, messages.widened, messages.saveFailed, messages.leave.title, messages.leave.body].map((v) => v as string),
  ])
  const shared = new Set<string>([...Object.values(actions).filter((v) => !pending.has(v)), ...Object.values(screenNames)])
  /** 画面ファイルの文字列が terms の値と同じなら直書き（引く）。日本語の文を + でつなぐのも禁止（差し込む）。 */
  const problems = (text: string): string[] => {
    const bad: string[] = []
    for (const l of literalsOf(text).filter(hasJa)) if (shared.has(l.trim())) bad.push(`terms の語を直書き「${l.trim()}」`)
    if (concat.test(comments(text))) bad.push('日本語の文を + でつなぐ')
    return bad
  }
  const screenFiles = sourceFiles.filter((f) => relative(src, f).replace(/\\/g, '/').startsWith('screens/'))
  it('src/screens の日本語は terms.ts の値の直書きでなく、文を連結していない', () => {
    const bad = screenFiles.flatMap((f) => problems(readFileSync(f, 'utf8')).map((p) => `${relative(src, f)}: ${p}`))
    expect(bad).toEqual([])
  })
  /** いま直書きしている引き上げ済みの語（画面ファイル: 語）。第 2 段が終わるたびに減らし、最後は空にして UPLIFT_STRICT を true にする。 */
  const UPLIFT_KNOWN: string[] = [
    'screens/client-form/texts.ts: 半角にそろえました',
    'screens/client-form/texts.ts: 保存しています',
    'screens/client-form/texts.ts: 保存できませんでした。入力は残っています。もう一度保存してください。',
    'screens/client-form/texts.ts: 保存して離れますか',
    'screens/client-form/texts.ts: 入力した内容は、まだ保存されていません。保存せずに離れると、内容は消えます。',
    'screens/client-form/texts.ts: 保存して離れる',
    'screens/client-form/texts.ts: 入力に戻る',
    'screens/client-form/texts.ts: 保存せず離れる',
    'screens/clients/copy.ts: 読み込んでいます',
    'screens/invoice-detail/windows.ts: 下書きを削除する',
    'screens/invoice-new/DateField.tsx: 半角にそろえました',
    'screens/invoice-new/InvoiceForm.tsx: 保存できませんでした。入力は残っています。もう一度保存してください。',
    'screens/invoice-new/LeaveDialog.tsx: 保存して離れますか',
    'screens/invoice-new/LeaveDialog.tsx: 保存せず離れる',
    'screens/invoice-new/LeaveDialog.tsx: 保存しています',
    'screens/invoice-new/LeaveDialog.tsx: 保存して離れる',
    'screens/invoice-new/LineItem.tsx: 半角にそろえました',
    'screens/invoice-new/index.tsx: 保存しています',
    'screens/invoices/index.tsx: 読み込んでいます',
    'screens/invoices/index.tsx: 更新できませんでした。もう一度読み込んでください。',
    'screens/payments/index.tsx: 読み込んでいます',
    'screens/probe/index.tsx: 保存しています',
    'screens/probe/index.tsx: 読み込んでいます',
    'screens/probe/index.tsx: 更新できませんでした。もう一度読み込んでください。',
    'screens/probe/index.tsx: 更新しています',
    'screens/report/texts.ts: 読み込んでいます',
    'screens/report/texts.ts: 更新しています',
    'screens/settings/words.ts: 保存しています',
    'screens/settings/words.ts: 保存できませんでした。入力は残っています。もう一度保存してください。',
    'screens/settings/words.ts: 保存して離れますか',
    'screens/settings/words.ts: 保存して離れる',
    'screens/settings/words.ts: 保存せず離れる',
    'screens/settings/words.ts: 相手の内容を使う',
    'screens/settings/words.ts: 上書きして保存する',
    'screens/setup/copy.ts: 次へ進む',
    'screens/setup/copy.ts: 前の段へ戻る',
    'screens/setup/copy.ts: 保存しています',
    'screens/setup/copy.ts: 保存できませんでした。入力は残っています。もう一度保存してください。',
  ]
  it('[todo] 引き上げ済みの語（次へ進む・入力に戻る・保存しています など）を画面が直書きしている一覧。新しい直書きは落とす', () => {
    const found = screenFiles.flatMap((f) => literalsOf(readFileSync(f, 'utf8')).filter(hasJa).map((l) => l.trim()).filter((l) => pending.has(l)).map((l) => `${relative(src, f).replace(/\\/g, '/')}: ${l}`))
    const unique = [...new Set(found)]
    if (unique.length > 0) console.info(`[todo] 画面が直書きしている引き上げ済みの語 ${unique.length} 件（第 2 段で terms から引く）\n${unique.join('\n')}`)
    if (UPLIFT_STRICT) expect(unique.filter((u) => !u.startsWith('screens/probe/'))).toEqual([]) // 見本ページ（probe）は部品の例として文を直に書く
    else expect(unique.filter((u) => !UPLIFT_KNOWN.includes(u))).toEqual([])
  })
  it('判定そのもの：直書きと連結を落とし、引く・差し込むを通す', () => {
    expect(problems(`<Button>請求書を送る</Button>`)).toEqual(['terms の語を直書き「請求書を送る」'])
    expect(problems(`const t = 'この' + name + 'を送ります'`)).toEqual(['日本語の文を + でつなぐ'])
    expect(problems('<Button>{actions.sendInvoice}</Button>')).toEqual([])
    expect(problems('<p>{`${n}件を確認しました`}</p>')).toEqual([])
  })
})
