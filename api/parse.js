import cedict from 'cc-cedict'
import { pinyin } from 'pinyin-pro'

const isHanzi = (value) => /[\u3400-\u9fff]/.test(value)
const MAX_WORD_LENGTH = 8
const MAX_INPUT_LENGTH = 5000

const commonPinyin = {
  wo: '我', yao: '要', ni: '你', shi: '是', de: '的', le: '了',
  zai: '在', bu: '不', hen: '很', hao: '好', shuo: '说', kan: '看',
  qu: '去', lai: '来', you: '有',
}

const toneMarks = {
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4], ē: ['e', 1], é: ['e', 2],
  ě: ['e', 3], è: ['e', 4], ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4], ū: ['u', 1], ú: ['u', 2],
  ǔ: ['u', 3], ù: ['u', 4], ǖ: ['v', 1], ǘ: ['v', 2], ǚ: ['v', 3], ǜ: ['v', 4],
}

const normalizePinyin = (value) => {
  let tone = null
  const base = [...value.toLowerCase()].map((character) => {
    if (/[1-5]/.test(character)) {
      tone = Number(character)
      return ''
    }
    if (!toneMarks[character]) return character
    tone = toneMarks[character][1]
    return toneMarks[character][0]
  }).join('').replace(/ü/g, 'v')
  return base + (tone || 5)
}

const normalizeSyllable = (value) => normalizePinyin(value).replace(/[1-5]/g, '')

const createIndexes = () => {
  const byWord = new Map()
  const byPinyin = new Map()
  const byPinyinWithoutTones = new Map()
  const bySyllable = new Map()

  for (const rawEntry of cedict.data.all) {
    const entry = cedict.expandValue(rawEntry, false)
    const word = entry.simplified || entry.traditional
    if (!word || !entry.english?.length) continue
    if (!byWord.has(word)) byWord.set(word, entry)
    if (entry.traditional && !byWord.has(entry.traditional)) byWord.set(entry.traditional, entry)

    const syllables = entry.pinyin.split(/\s+/)
    const key = syllables.map((syllable) => normalizePinyin(syllable)).join('')
    const keyWithoutTones = key.replace(/[1-5]/g, '')
    const candidate = { word, entry }
    if ([...word].length > 1) {
      byPinyin.set(key, [...(byPinyin.get(key) || []), candidate])
      byPinyinWithoutTones.set(keyWithoutTones, [...(byPinyinWithoutTones.get(keyWithoutTones) || []), candidate])
    }
    for (const syllable of syllables) {
      const syllableKey = normalizeSyllable(syllable)
      bySyllable.set(syllableKey, [...(bySyllable.get(syllableKey) || []), candidate])
    }
  }

  return { byWord, byPinyin, byPinyinWithoutTones, bySyllable }
}

const indexes = createIndexes()

const knownSyllables = new Set([...indexes.bySyllable.keys(), ...Object.keys(commonPinyin)])

const tokenizePinyin = (value) => {
  const tokens = []
  for (const rawToken of value.trim().split(/\s+/).filter(Boolean)) {
    let position = 0
    while (position < rawToken.length) {
      let match = ''
      for (let end = Math.min(rawToken.length, position + 6); end > position; end -= 1) {
        const candidate = rawToken.slice(position, end)
        if (knownSyllables.has(normalizeSyllable(candidate))) {
          match = candidate
          break
        }
      }
      if (!match) return null
      tokens.push(match)
      position += match.length
    }
  }
  return tokens
}

const isPinyin = (value) => !isHanzi(value)
  && /[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(value)
  && Boolean(tokenizePinyin(value)?.length)

const reverseLookup = (value) => {
  const tokens = tokenizePinyin(value) || []
  const resolved = []
  let position = 0

  while (position < tokens.length) {
    let match = null
    for (let length = Math.min(tokens.length - position, MAX_WORD_LENGTH); length > 0; length -= 1) {
      const selectedTokens = tokens.slice(position, position + length)
      const key = selectedTokens.map((token) => normalizePinyin(token)).join('')
      const keyWithoutTones = key.replace(/[1-5]/g, '')
      const candidates = indexes.byPinyin.get(key) || indexes.byPinyinWithoutTones.get(keyWithoutTones)
      if (candidates?.length) {
        match = { word: candidates[0].word, consumed: length }
        break
      }
    }
    if (!match) {
      const syllable = normalizeSyllable(tokens[position])
      match = { word: commonPinyin[syllable] || indexes.bySyllable.get(syllable)?.[0]?.word || tokens[position], consumed: 1 }
    }
    resolved.push(match.word)
    position += match.consumed
  }
  return resolved.join('')
}

const segment = (text) => {
  const words = []
  const characters = Array.from(text)
  let position = 0
  while (position < characters.length) {
    let match = null
    for (let end = Math.min(characters.length, position + MAX_WORD_LENGTH); end > position; end -= 1) {
      const candidate = characters.slice(position, end).join('')
      if (indexes.byWord.has(candidate)) {
        match = candidate
        break
      }
    }
    const fallback = match || characters[position]
    words.push(fallback)
    position += match ? Array.from(match).length : 1
  }
  return words
}

const parseLine = (line) => segment(line).map((word) => {
  let wordPinyin
  try {
    wordPinyin = pinyin(word, { toneType: 'symbol' })
  } catch {
    wordPinyin = ''
  }
  return {
    hanzi: word,
    pinyin: wordPinyin || 'Pinyin unavailable',
    english: indexes.byWord.get(word)?.english.join('; ') || 'Definition not found.',
  }
})

const errorResponse = (response, status, error) => response.status(status).json({
  inputType: 'hanzi',
  resolvedHanzi: '',
  fullTranslation: '',
  lines: [],
  error,
})

export default async function handler(request, response) {
  if (request.method !== 'POST') return errorResponse(response, 405, 'Only POST requests are supported.')
  const rawText = typeof request.body?.text === 'string' ? request.body.text : ''
  const text = rawText.trim().slice(0, MAX_INPUT_LENGTH)
  if (!text) return errorResponse(response, 400, 'Text is required.')

  const inputType = isPinyin(text) ? 'pinyin' : 'hanzi'
  let resolvedHanzi = text
  if (inputType === 'pinyin') {
    resolvedHanzi = reverseLookup(text)
  }

  const sourceLines = resolvedHanzi.split(/\r?\n/)
  const lines = sourceLines.map((line, index) => ({
    lineId: index + 1,
    englishLine: '',
    words: parseLine(line),
  }))
  for (const line of lines) line.englishLine = line.words.map((word) => word.english).join(' / ')

  return response.status(200).json({
    inputType,
    resolvedHanzi,
    fullTranslation: lines.map((line) => line.englishLine).join('\n'),
    lines,
  })
}
