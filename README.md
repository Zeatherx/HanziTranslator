# HanziTranslator

## What it is

HanziTranslator is a Chinese reading tool. Enter Hanzi or Pinyin to see
tone-marked Pinyin and English definitions for each word.

Try it over here: [hanzitranslator.vercel.app](https://hanzitranslator.vercel.app)

## How it works

The app sends your text to the `/api/parse` Vercel Serverless Function. The
function detects Hanzi or Pinyin, converts Pinyin when needed, adds tone marks,
segments the text, and looks up word definitions. The results are displayed as
interactive ruby text in the reader.

## Credits

- [pinyin-pro](https://www.npmjs.com/package/pinyin-pro) for Pinyin generation
- [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) for
  Chinese-English dictionary definitions
