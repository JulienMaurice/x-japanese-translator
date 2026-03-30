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

// wanakana romanization system identifiers
const ROMAJI_SYSTEM_MAP = {
  hepburn: 'hepburn',
  nihon:   'nihonsiki',
  kunrei:  'kunreisiki',
};

const PURE_KATAKANA_RE = /^[\u30A0-\u30FF\u30FC]+$/;
const KANJI_RE         = /[\u4E00-\u9FFF]/;

function describeToken(token, romajiSystem, skipKatakana) {
  const surface  = token.surface_form;
  const katakana = token.reading; // undefined for punctuation/Latin

  if (!katakana) return { type: 'plain', surface };

  const hasKanji      = KANJI_RE.test(surface);
  const isPureKatakana = PURE_KATAKANA_RE.test(surface);

  // #8 — skip romaji for pure katakana loanwords when option is on
  const showRomaji = !(skipKatakana && isPureKatakana);

  return {
    type: 'word',
    surface,
    reading: hasKanji ? toHiragana(katakana) : null,
    romaji:  showRomaji
      ? toRomaji(katakana, { romanization: ROMAJI_SYSTEM_MAP[romajiSystem] || 'hepburn' })
      : null,
  };
}

const JP_RUN = /[\u3000-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]+/g;

/**
 * Parse text into display tokens.
 * Respects settings.romajiSystem (#7) and settings.skipKatakana (#8).
 */
export async function getTokens(text, settings = {}) {
  const { romajiSystem = 'hepburn', skipKatakana = false } = settings;
  const k = await initJapanese();
  const lines = text.split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) result.push({ type: 'break' });
    const tokens = await k._analyzer.parse(lines[i]);
    result.push(...tokens.map((t) => describeToken(t, romajiSystem, skipKatakana)));
  }

  return result;
}
