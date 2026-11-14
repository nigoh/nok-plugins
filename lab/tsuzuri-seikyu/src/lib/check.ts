/**
 * [MOD-009] 欄の検査の骨（form.md F-04）。「欄の表の 1 行 → 空・形の誤り」と「欄を順に回して誤りを集める」の 2 つだけ。
 * 欄の表（どの欄が必須か・誤りの文・形の検査）と、欄どうしの誤りは画面が持つ。ここは文を持たない。
 * 画面ごとに作られていた validateAll・validateStep・formatError の、回し方と空・形の判定を 1 つにした。
 */

/** 検査に要る欄の定義。画面の欄の表（FieldSpec・FieldDef）が、この形の項目を持つ。 */
export type FieldRule = {
  key: string
  required: boolean
  /** 必須の欄が空のときの文（送る時に出す）。 */
  empty?: string
  /** 値の形が違うときの文。 */
  bad?: string
  /** 入っている値の形の検査（直したあとの値を渡す）。 */
  valid?: (value: string) => boolean
}

/** 入っている値の形の誤り。空は見ない（空の誤りは送る時に checkRule が出す）。 */
export function formatError(rule: Pick<FieldRule, 'bad' | 'valid'>, value: string): string | undefined {
  if (value === '' || !rule.valid) return undefined
  return rule.valid(value) ? undefined : rule.bad
}

/** 送る時の 1 つの欄の誤り。空の必須は empty、入っていれば形の誤り。 */
export function checkRule(rule: FieldRule, value: string): string | undefined {
  return value.trim() === '' ? (rule.required ? rule.empty : undefined) : formatError(rule, value)
}

/** 欄を順に回し、誤りのある欄だけ（欄 → 文）を集める。欄どうしの誤りも、check の中で書ける。 */
export function checkEach<K extends string>(keys: readonly K[], check: (key: K) => string | null | undefined): { [P in K]?: string } {
  const out: { [P in K]?: string } = {}
  for (const key of keys) {
    const message = check(key)
    if (message) out[key] = message
  }
  return out
}
