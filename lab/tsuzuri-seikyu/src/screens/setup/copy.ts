import { messages, screenNames } from '../../app/terms'
import type { StepNo } from './model'

/**
 * この画面にしか出ない文（words.md L-13）。全画面で同じ語（画面名・やめる・元に戻す）は terms.ts から引き、ここに書かない。
 * 欄の補足と誤りの文は欄の表（model.ts）に置く。文は連結せず、差し込む。
 */
export const copy = {
  description: '入力は段ごとに保存されます。',
  stepperLabel: `${screenNames.setup}の進み具合`,
  intro: {
    1: '請求書に載る、自社の情報を入れます。',
    2: '多くの事業者が使う決まりを入れてあります。あとで設定から変えられます。',
    3: '最初に請求書を送る取引先を入れます。',
  } satisfies Record<StepNo, string>,
  allRequired: 'すべて入力してください。',
  /** 欄の値を半角に直したときの読み上げ（補足の末尾には terms の messages.widened が出る）。 */
  normalizedStatus: (label: string) => `${label}を${messages.widened}`,

  finish: '設定を終える',
  skip: 'あとで登録する',
  skipNote: 'いま登録しなくても、設定を終えられます。',
  openHome: 'ホームを開く',

  saved: '設定を保存しました',
  cleared: '入力を消しました',
  resumed: (step: number) => `前回の続きです。${step}段目から始めます`,
  restart: '最初からやり直す',

  loading: '保存した入力を読み込んでいます',
  loadFailedTitle: '保存した入力を読み込めませんでした',

  doneTitle: '設定が終わりました',
  doneBody: '請求書を作る準備ができています。',
}
