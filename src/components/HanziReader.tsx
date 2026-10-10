import { useState } from 'react'

export type Word = {
  hanzi: string
  pinyin: string
  english: string
}

export type Line = Word[]

type HanziReaderProps = {
  lines: Line[]
  isLoading?: boolean
  error?: string
  initialFontSize?: number
}

const clampFontSize = (value: number) => Math.min(40, Math.max(20, value))

export default function HanziReader({ lines, isLoading = false, error = '', initialFontSize = 30 }: HanziReaderProps) {
  const [showPinyin, setShowPinyin] = useState(true)
  const [fontSize, setFontSize] = useState(() => clampFontSize(initialFontSize))
  const [activeWord, setActiveWord] = useState<Word | null>(null)

  return (
    <section className="flex h-full w-full flex-col rounded-xl border border-[#e5e1f1] bg-[#fcfbff] p-5 text-[#26232d] shadow-sm sm:p-6" aria-label="Chinese reader">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeaf6] pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9389b8]">Reader</p>
          <h2 className="mt-1 text-sm font-semibold">Read line by line</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex cursor-pointer items-center gap-2 text-[#77717c]">
            <input
              checked={showPinyin}
              className="h-4 w-4 accent-[#9389b8]"
              onChange={(event) => setShowPinyin(event.target.checked)}
              type="checkbox"
            />
            Show Pinyin
          </label>
          <label className="flex items-center gap-2 text-[#77717c]">
            <span>Size</span>
            <input
              aria-label="Hanzi font size"
              className="w-20 accent-[#9389b8]"
              max={40}
              min={20}
              onChange={(event) => setFontSize(clampFontSize(Number(event.target.value)))}
              type="range"
              value={fontSize}
            />
            <output className="w-8 font-mono text-[10px] text-[#9389b8]">{fontSize}px</output>
          </label>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-start space-y-3" onMouseLeave={() => setActiveWord(null)}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-10 text-center" role="status">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e5e1f1] border-t-[#9389b8]" />
            <p className="font-mono text-xs text-[#9389b8]">Parsing text...</p>
          </div>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-[#b45d4d]" role="alert">{error}</p>
        ) : lines.length ? lines.map((line, lineIndex) => (
          <div className="relative min-h-[76px] rounded-lg px-3 py-4 sm:px-5" key={`line-${lineIndex}`}>
            <div className="reader-ruby-row flex flex-wrap items-end gap-x-1 gap-y-5">
              {line.map((word, wordIndex) => (
                <button
                  className="group relative rounded-md px-1.5 py-1 text-left transition-colors hover:bg-[#e7e1f6] focus-visible:bg-[#e7e1f6] focus-visible:outline-none"
                  key={`${word.hanzi}-${wordIndex}`}
                  onFocus={() => setActiveWord(word)}
                  onMouseEnter={() => setActiveWord(word)}
                  onClick={() => setActiveWord(word)}
                  type="button"
                >
                  <ruby className="reader-ruby font-serif leading-none" style={{ fontSize: `${fontSize}px` }}>
                    {word.hanzi}
                    {showPinyin && <rt className="mt-2 font-mono text-[10px] leading-none text-[#9389b8]">{word.pinyin}</rt>}
                  </ruby>
                </button>
              ))}
            </div>

            {activeWord && line.includes(activeWord) && (
              <aside className="reader-tooltip absolute z-10 mt-1 w-[min(280px,calc(100%-1.5rem))] rounded-xl border border-[#e1dbee] bg-white p-4 text-left shadow-[0_12px_30px_rgba(54,43,83,0.14)]" role="status">
                <p className="font-serif text-2xl text-[#645b8f]">{activeWord.hanzi}</p>
                <p className="mt-1 font-mono text-xs text-[#9389b8]">{activeWord.pinyin}</p>
                <p className="mt-3 border-t border-[#eeeaf6] pt-3 text-xs leading-relaxed text-[#77717c]">{activeWord.english}</p>
              </aside>
            )}
          </div>
        )) : (
          <p className="px-5 py-6 text-center text-sm text-[#b0abb0]">Parsed text will appear here.</p>
        )}
      </div>
    </section>
  )
}
