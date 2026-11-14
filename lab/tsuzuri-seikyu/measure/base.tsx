// 測るためだけの入口：骨格と基本の部品だけ（画面は 1 枚も入れない）
import { createRoot } from 'react-dom/client'
import '../src/index.css'
import { AppShell } from '../src/app/AppShell'
import * as ui from '../src/ui'
import * as parts from '../src/parts'
import * as data from '../src/data'
import { ToastProvider } from '../src/ui'
;(window as unknown as Record<string, unknown>).__keep = [ui, parts, data]
createRoot(document.getElementById('root')!).render(<ToastProvider><AppShell data-scr="SCR-000" kind="view" state="default" states={['default']} title="base" current="home">x</AppShell></ToastProvider>)
