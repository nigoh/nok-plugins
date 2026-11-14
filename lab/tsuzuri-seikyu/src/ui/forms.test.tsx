import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox, ErrorSummary, Field, focusFirstInvalid, markFor, Segmented, Select, Switch, Textarea, TextInput, useFocusFirstInvalid } from '.'

describe('[CMP-005] Field', () => {
  it('[REQ-009] ラベルで欄が見つかり、補足とエラーが結び付く', () => {
    render(<Field label="取引先名" hint="請求書に載ります" error="入力してください" required>{(p) => <TextInput {...p} />}</Field>)
    const input = screen.getByRole('textbox', { name: /取引先名/ })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('請求書に載ります 入力してください')
    expect(input).toBeRequired()
  })
  it('[REQ-009] 最初の誤り欄へ移る', () => {
    const { container } = render(
      <form>
        <Field label="A">{(p) => <TextInput {...p} />}</Field>
        <Field label="B" error="誤り">{(p) => <TextInput {...p} />}</Field>
      </form>,
    )
    expect(focusFirstInvalid(container)).toBe(true)
    expect(screen.getByRole('textbox', { name: 'B' })).toHaveFocus()
  })
})

describe('[CMP-006] TextInput', () => {
  it('[REQ-003] 金額の欄は右寄せ・前置きと後置きを持てる', async () => {
    render(<TextInput aria-label="単価" align="end" trailing="円" />)
    const input = screen.getByRole('textbox', { name: '単価' })
    await userEvent.type(input, '1200')
    expect(input).toHaveValue('1200')
    expect(input.className).toContain('text-right')
    expect(screen.getByText('円')).toBeInTheDocument()
  })
})

describe('[CMP-007] Select', () => {
  it('[REQ-009] 選択肢を選べる', async () => {
    const onChange = vi.fn()
    render(<Select aria-label="端数" options={[{ value: 'floor', label: '切り捨て' }, { value: 'ceil', label: '切り上げ' }]} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '端数' }), '切り上げ')
    expect(onChange).toHaveBeenCalled()
  })
})

describe('[CMP-024] Textarea', () => {
  it('[REQ-009] ラベルで見つかる', () => {
    render(<Textarea aria-label="備考" />)
    expect(screen.getByRole('textbox', { name: '備考' })).toBeInTheDocument()
  })
})

describe('[CMP-025] Checkbox', () => {
  it('[REQ-007] ラベルを押しても切り替わる', async () => {
    render(<Checkbox label="控えを受け取る" />)
    await userEvent.click(screen.getByText('控えを受け取る'))
    expect(screen.getByRole('checkbox', { name: '控えを受け取る' })).toBeChecked()
  })
})

describe('[CMP-026] Switch', () => {
  it('[REQ-007] switch の役割で切り替えられる', async () => {
    render(<Switch label="入金を知らせる" />)
    const sw = screen.getByRole('switch', { name: '入金を知らせる' })
    await userEvent.click(sw)
    expect(sw).toBeChecked()
  })
})

describe('[CMP-011] Segmented', () => {
  it('[REQ-023] 選ぶと onChange が呼ばれ、選択中が分かる', async () => {
    const onChange = vi.fn()
    render(<Segmented label="期間" value="month" onChange={onChange} options={[{ value: 'month', label: '月' }, { value: 'year', label: '年' }]} />)
    expect(screen.getByRole('radio', { name: '月' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: '年' }))
    expect(onChange).toHaveBeenCalledWith('year')
  })
})

describe('[CMP-005] Field の必須と任意の印（form.md F-03）', () => {
  it('[REQ-009] 必須が半分より少ない → 必須の欄に「必須」、任意の欄に印なし', () => {
    expect(markFor(true, { required: 2, total: 9 })).toBe('required')
    expect(markFor(false, { required: 2, total: 9 })).toBe('none')
  })
  it('[REQ-009] 必須が半分以上 → 任意の欄に「任意」、必須の欄に印なし。ちょうど半分は任意に印', () => {
    expect(markFor(false, { required: 6, total: 9 })).toBe('optional')
    expect(markFor(true, { required: 6, total: 9 })).toBe('none')
    expect(markFor(false, { required: 2, total: 4 })).toBe('optional')
  })
  it('[REQ-009] 全部が必須 → 印なし（先頭に「すべて入力してください」を書く）', () => {
    expect(markFor(true, { required: 3, total: 3 })).toBe('none')
  })
  it('[REQ-009] 印は欄のラベルに出る。印が none でも required 属性は付く', () => {
    render(<>
      <Field label="取引先名" required mark="required">{(p) => <TextInput {...p} />}</Field>
      <Field label="電話" mark="optional">{(p) => <TextInput {...p} />}</Field>
      <Field label="メール" required mark="none">{(p) => <TextInput {...p} />}</Field>
    </>)
    expect(screen.getByRole('textbox', { name: /取引先名/ })).toHaveAccessibleName('取引先名必須')
    expect(screen.getByRole('textbox', { name: /電話/ })).toHaveAccessibleName('電話任意')
    const mail = screen.getByRole('textbox', { name: 'メール' })
    expect(mail).toBeRequired()
  })
  it('[REQ-009] 印を渡さなければ、required のときだけ「必須」', () => {
    render(<><Field label="A" required>{(p) => <TextInput {...p} />}</Field><Field label="B">{(p) => <TextInput {...p} />}</Field></>)
    expect(screen.getByRole('textbox', { name: 'A必須' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'B' })).toBeInTheDocument()
  })
})

describe('[CMP-031] ErrorSummary（form.md F-04）', () => {
  const two = [{ id: 'a', message: '取引先名を入れてください。' }, { id: 'b', message: 'メールを入れてください。' }]
  it('[REQ-009] 誤りが 1 件なら出さない', () => {
    const { container } = render(<ErrorSummary errors={two.slice(0, 1)} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('[REQ-009] 2 件以上なら role=alert で、各行は欄へのリンク。フォーカスは一覧に移らない', async () => {
    render(<><ErrorSummary errors={two} /><input id="a" aria-label="取引先名" /><input id="b" aria-label="メール" /></>)
    const box = screen.getByRole('alert')
    expect(box).toHaveTextContent('2か所を直してください')
    expect(box).not.toContainElement(document.activeElement as HTMLElement)
    const links = within(box).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['取引先名を入れてください。', 'メールを入れてください。'])
    await userEvent.click(links[1])
    expect(screen.getByLabelText('メール')).toHaveFocus()
  })
})

describe('[CMP-005] 送ったあと、最初の誤り欄へ移る（useFocusFirstInvalid）', () => {
  function Host() {
    const ref = useRef<HTMLFormElement>(null)
    const [errors, setErrors] = useState<{ a?: string; b?: string }>({})
    const [attempt, setAttempt] = useState(0)
    useFocusFirstInvalid(ref, attempt)
    return (
      <form ref={ref} onSubmit={(e) => { e.preventDefault(); setErrors({ b: 'B を入れてください。' }); setAttempt((n) => n + 1) }}>
        <Field label="A" error={errors.a}>{(p) => <TextInput {...p} />}</Field>
        <Field label="B" error={errors.b}>{(p) => <TextInput {...p} />}</Field>
        <button type="submit">送る</button>
      </form>
    )
  }
  it('[REQ-009] 描き直しのあとに最初の誤り欄がフォーカスされ、入力値は残る', async () => {
    render(<Host />)
    await userEvent.type(screen.getByRole('textbox', { name: 'A' }), 'あ')
    await userEvent.click(screen.getByRole('button', { name: '送る' }))
    expect(screen.getByRole('textbox', { name: 'B' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'A' })).toHaveValue('あ')
  })
})
