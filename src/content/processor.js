import { initJapanese, getTokens } from '../lib/japanese.js';
import { translate } from '../lib/translation.js';
import { createAnnotationHost, updateAnnotation, showTranslateButton, showAnnotationError } from './renderer.js';

const JAPANESE_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g;

function countJapanese(text) {
  return (text.match(JAPANESE_RE) || []).length;
}

initJapanese().catch((err) => console.error('[JpTrans] kuroshiro init failed:', err));

export async function processTweet(article, settings) {
  if (!settings.enabled) return;

  const textEl = article.querySelector('[data-testid="tweetText"]');
  if (!textEl) return;

  const text = textEl.innerText || textEl.textContent || '';
  console.log(`[JpTrans] tweet text (${text.length} chars):`, text.substring(0, 80));

  if (!text || countJapanese(text) < settings.minJapaneseChars) {
    console.log('[JpTrans] not enough Japanese — skipping');
    return;
  }

  const host = createAnnotationHost(article, settings);
  if (!host) return;

  try {
    // Tokens (reading + romaji) are always loaded immediately
    const tokens = await getTokens(text, settings);

    // #6 — click-to-translate: show tokens + a button, skip auto-translate
    if (settings.clickToTranslate) {
      showTranslateButton(host, tokens, settings, () => runTranslation(host, text, tokens, settings));
      return;
    }

    await runTranslation(host, text, tokens, settings);
  } catch (err) {
    console.error('[JpTrans] processing error:', err);
    showAnnotationError(host, `Error: ${err.message}`);
  }
}

async function runTranslation(host, text, tokens, settings) {
  const translations = await translate(text, settings);
  console.log(`[JpTrans] translated → lang1: ${translations.lang1?.substring(0, 40)}`);
  updateAnnotation(host, tokens, translations, settings);
}
