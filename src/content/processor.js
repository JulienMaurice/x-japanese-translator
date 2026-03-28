import { initJapanese, getTokens } from '../lib/japanese.js';
import { translate } from '../lib/translation.js';
import { createAnnotationHost, updateAnnotation, showAnnotationError } from './renderer.js';

// Hiragana + Katakana + CJK Unified Ideographs
const JAPANESE_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g;

function countJapanese(text) {
  return (text.match(JAPANESE_RE) || []).length;
}

function hasEnoughJapanese(text) {
  // At least 2 Japanese characters — low threshold to avoid false negatives
  return countJapanese(text) >= 2;
}

// Kick off kuroshiro init eagerly so the dictionary is ready
// before the first tweet is processed.
initJapanese().catch((err) => console.error('[JpTrans] kuroshiro init failed:', err));

/**
 * Processes a tweet article: reads its text, checks for Japanese,
 * creates the annotation UI, then fills it asynchronously.
 */
export async function processTweet(article) {
  const textEl = article.querySelector('[data-testid="tweetText"]');
  if (!textEl) {
    console.log('[JpTrans] no tweetText in article — skipping');
    return;
  }

  const text = textEl.innerText || textEl.textContent || '';
  console.log(`[JpTrans] tweet text (${text.length} chars):`, text.substring(0, 80));

  if (!text || !hasEnoughJapanese(text)) {
    console.log('[JpTrans] not enough Japanese characters — skipping');
    return;
  }

  const host = createAnnotationHost(article);
  if (!host) return; // already annotated

  try {
    console.log('[JpTrans] starting readings + translation...');
    const [tokens, translations] = await Promise.all([
      getTokens(text),
      translate(text),
    ]);
    console.log(`[JpTrans] done — ${tokens.length} tokens`);
    updateAnnotation(host, tokens, translations);
  } catch (err) {
    console.error('[JpTrans] processing error:', err);
    showAnnotationError(host, `Error: ${err.message}`);
  }
}
