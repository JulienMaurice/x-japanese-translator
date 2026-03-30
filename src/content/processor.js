import { initJapanese, getTokens } from '../lib/japanese.js';
import { translate } from '../lib/translation.js';
import { createAnnotationHost, updateAnnotation, showAnnotationError } from './renderer.js';

const JAPANESE_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g;

function countJapanese(text) {
  return (text.match(JAPANESE_RE) || []).length;
}

// Eagerly initialise kuroshiro so the dict is ready for the first tweet
initJapanese().catch((err) => console.error('[JpTrans] kuroshiro init failed:', err));

export async function processTweet(article, settings) {
  // #2 — global toggle
  if (!settings.enabled) return;

  const textEl = article.querySelector('[data-testid="tweetText"]');
  if (!textEl) {
    console.log('[JpTrans] no tweetText — skipping');
    return;
  }

  const text = textEl.innerText || textEl.textContent || '';
  console.log(`[JpTrans] tweet text (${text.length} chars):`, text.substring(0, 80));

  // #9 — configurable minimum threshold
  if (!text || countJapanese(text) < settings.minJapaneseChars) {
    console.log('[JpTrans] not enough Japanese — skipping');
    return;
  }

  const host = createAnnotationHost(article, settings);
  if (!host) return;

  try {
    console.log('[JpTrans] processing...');
    const [tokens, translations] = await Promise.all([
      getTokens(text, settings),   // #7 romajiSystem, #8 skipKatakana
      translate(text),
    ]);
    console.log(`[JpTrans] done — ${tokens.length} tokens`);
    updateAnnotation(host, tokens, translations, settings);
  } catch (err) {
    console.error('[JpTrans] processing error:', err);
    showAnnotationError(host, `Error: ${err.message}`);
  }
}
