import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';
import { toHiragana, toRomaji } from 'wanakana';

let kuroshiro = null;
let initPromise = null;

export function initJapanese() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const dictPath = typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('dict/')
      : 'dict/';

    console.log('[JpTrans] loading kuromoji dictionaries from:', dictPath);

    kuroshiro = new Kuroshiro();
    const analyzer = new KuromojiAnalyzer({ dictPath });
    await kuroshiro.init(analyzer);
    console.log('[JpTrans] kuroshiro ready');
    return kuroshiro;
  })();

  initPromise.catch((err) => {
    console.error('[JpTrans] kuroshiro init error:', err);
    initPromise = null;
  });

  return initPromise;
}

/**
 * Converts a single kuromoji token to a display descriptor.
 *
 * Returns one of:
 *   { type: 'word',  surface, reading (hiragana|null), romaji }
 *   { type: 'plain', surface }   — punctuation / Latin / numbers
 */
function describeToken(token) {
  const surface = token.surface_form;
  const katakana = token.reading; // katakana, or undefined for non-Japanese

  if (!katakana) return { type: 'plain', surface };

  const hasKanji = /[\u4E00-\u9FFF]/.test(surface);
  return {
    type: 'word',
    surface,
    // Show hiragana reading only when surface contains kanji
    // (pure hiragana/katakana tokens are already phonetic)
    reading: hasKanji ? toHiragana(katakana) : null,
    romaji: toRomaji(katakana),
  };
}

/**
 * Parses text into display tokens for the word-by-word annotation view.
 *
 * Returns an array of:
 *   { type: 'word',  surface, reading, romaji }
 *   { type: 'plain', surface }
 *   { type: 'break' }    — from newlines in the original tweet
 */
export async function getTokens(text) {
  const k = await initJapanese();
  const lines = text.split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) result.push({ type: 'break' });
    const tokens = await k._analyzer.parse(lines[i]);
    result.push(...tokens.map(describeToken));
  }

  return result;
}
