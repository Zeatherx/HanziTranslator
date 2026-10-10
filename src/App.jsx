import { useCallback, useEffect, useRef, useState } from 'react'
import HanziReader from './components/HanziReader'
import './App.css'

const SAMPLE_TEXT = '你好，请随意尝试.'

function Icon({ name }) {
  const paths = {
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M8 7h8M8 10h6" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  }
  return <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function App() {
  const [text, setText] = useState(SAMPLE_TEXT)
  const [inputMode, setInputMode] = useState('Hanzi')
  const [lines, setLines] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const requestRef = useRef(null)
  const initialSampleParsedRef = useRef(false)

  const parseText = useCallback(async (textToParse = text) => {
    if (!textToParse.trim() || isLoading) return
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setIsLoading(true)
    setError('')
    setLines([])

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToParse }),
        signal: controller.signal,
      })
      const responseText = await response.text()
      let result
      try {
        result = responseText ? JSON.parse(responseText) : null
      } catch {
        throw new Error(`The parse service returned an invalid response (HTTP ${response.status}).`)
      }
      if (!response.ok) throw new Error(result?.error || `The parse service returned HTTP ${response.status}.`)
      if (!result || !Array.isArray(result.lines)) throw new Error('The parse service returned an invalid response.')
      if (!result.lines.every((line) => line && Array.isArray(line.words)
        && line.words.every((word) => word
          && typeof word.hanzi === 'string'
          && typeof word.pinyin === 'string'
          && typeof word.english === 'string'))) {
        throw new Error('The parse service returned invalid line data.')
      }
      setLines(result.lines.map((line) => line.words))
      setInputMode(result.inputType === 'pinyin' ? 'Pinyin → Hanzi' : '中文 / 中國')
    } catch (requestError) {
      if (requestError?.name === 'AbortError') return
      setError(requestError instanceof Error ? requestError.message : 'Unable to parse this text.')
      setLines([])
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setIsLoading(false)
      }
    }
  }, [isLoading, text])

  useEffect(() => {
    if (initialSampleParsedRef.current) return undefined
    const timer = window.setTimeout(() => {
      if (initialSampleParsedRef.current) return
      initialSampleParsedRef.current = true
      void parseText(SAMPLE_TEXT)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [parseText])

  const clearText = () => {
    requestRef.current?.abort()
    requestRef.current = null
    setText('')
    setLines([])
    setError('')
    setIsLoading(false)
  }

  return (
    <main className="mx-auto min-h-screen max-w-[1180px] px-5 text-[#26232d] sm:px-8 lg:px-[54px]">
      <header className="flex h-[72px] items-center border-b border-[#e8e4e1] sm:h-[91px]">
        <a className="flex items-center gap-2.5 text-sm font-bold tracking-[-0.2px] text-[#26232d] no-underline" href="/" aria-label="HanziTranslator home">
          <span className="grid h-[31px] w-[31px] place-items-center rounded-[9px] bg-[#26232d] text-white"><Icon name="book" /></span>
          <span>HanziTranslator</span>
        </a>
      </header>

      <section className="grid items-center gap-8 px-1 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12 lg:py-[68px]">
        <div className="max-w-3xl">
          <span className="mb-2 block font-mono text-xs font-medium uppercase tracking-wider text-orange-500">
            ABOUT
          </span>
          <h1 className="max-w-2xl space-y-1 font-serif text-4xl tracking-tight md:text-6xl">
            <span className="block font-bold leading-none text-slate-900">Read Chinese</span>
            <span className="block italic leading-tight text-[#8b82ad]">one by one.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
            Automated translators alter individual word meanings to fit full sentences, making character study frustrating. HanziTranslator breaks down Chinese text word-by-word with instant Pinyin and direct dictionary lookups.
          </p>
        </div>
        <div className="hidden justify-center lg:flex" aria-label="Decorative Hanzi cards">
          <div className="flex [transform:rotate(-8deg)] items-center">
            <span className="grid h-[92px] w-[68px] place-items-center border border-[#dad4eb] text-[42px] text-[#8b82ad] [font-family:'Playfair_Display',serif]">文</span>
            <span className="z-10 -mx-1 mt-[22px] grid h-[92px] w-[68px] place-items-center border border-[#f0d4c7] text-[42px] text-[#d9a28b] [font-family:'Playfair_Display',serif]">字</span>
            <span className="mt-[43px] grid h-[92px] w-[68px] place-items-center border border-[#dad4eb] text-[42px] text-[#8b82ad] [font-family:'Playfair_Display',serif]">學</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 pb-8 sm:pb-10 lg:grid-cols-[1fr_1.15fr] lg:gap-[18px]">
        <div className="flex flex-col gap-2">
          <div className="flex min-h-[360px] flex-col rounded-[13px] border border-[#e8e4e1] bg-white p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] font-medium tracking-[.04em] text-[#aaa5ab]">01</span>
                <h2 className="text-sm font-bold tracking-[-.2px]">Your text</h2>
              </div>
              <span className="rounded bg-[#f7f5f3] px-2 py-1.5 font-mono text-[10px] text-[#9d98a2]">{inputMode}</span>
            </div>
            <textarea
              className="h-auto min-h-0 flex-1 resize-none border-0 bg-transparent text-[25px] leading-[1.7] text-[#26232d] outline-none placeholder:text-[#c3bdc1]"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.ctrlKey && event.key === 'Enter') {
                  event.preventDefault()
                  parseText()
                }
              }}
              placeholder="Type Chinese or Pinyin here..."
              aria-label="Chinese or Pinyin text input"
            />
            <div className="mt-5 border-t border-[#f0edeb] pt-3">
              <div className="flex items-center justify-between font-mono text-[10px] text-[#b0abb0]">
                <span>{Array.from(text).length} characters</span>
                <div className="flex items-center gap-3 sm:gap-[18px]">
                  <button className="border-0 bg-transparent text-[11px] text-[#b0abb0]" type="button" onClick={clearText}>Clear text</button>
                  <button className="flex items-center gap-1.5 border-0 bg-transparent text-[11px] font-semibold text-[#e66e39] disabled:cursor-wait disabled:opacity-60" disabled={!text.trim() || isLoading} type="button" onClick={() => parseText()}>
                    {isLoading ? 'Parsing…' : 'Parse text'} <Icon name="arrow" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 px-1 text-xs text-slate-500">
            Note: Please enter Hanzi for the best results.
          </div>
        </div>

        <div className="h-full min-h-[360px]">
          <HanziReader error={error} isLoading={isLoading} lines={lines} />
        </div>
      </section>

      <footer className="flex justify-center border-t border-[#e8e4e1] py-7 font-mono text-[10px] text-[#b6b0b5]">
        <span>Built as a portfolio project</span>
      </footer>
    </main>
  )
}

export default App
