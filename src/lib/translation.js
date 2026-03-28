const ENDPOINT = 'https://api.mymemory.translated.net/get';

// MyMemory limit: ~500 chars per request.
// We keep a safe margin and split at sentence boundaries.
const MAX_CHARS = 450;

// In-memory cache: tweet text → translation result
const cache = new Map();

// Simple FIFO queue so we don't flood the API on page load
const queue = [];
let processing = false;

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function truncate(text) {
  if (text.length <= MAX_CHARS) return { text, truncated: false };

  const candidate = text.substring(0, MAX_CHARS);
  // Try to break at a Japanese sentence boundary
  const last = Math.max(
    candidate.lastIndexOf('\u3002'), // 。
    candidate.lastIndexOf('\uff01'), // ！
    candidate.lastIndexOf('\uff1f'), // ？
    candidate.lastIndexOf('. '),
    candidate.lastIndexOf('! '),
    candidate.lastIndexOf('? '),
  );
  if (last > MAX_CHARS * 0.5) {
    return { text: candidate.substring(0, last + 1), truncated: true };
  }
  return { text: candidate, truncated: true };
}

async function fetchTranslation(text, langpair) {
  const url = `${ENDPOINT}?q=${encodeURIComponent(text)}&langpair=${langpair}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated || data?.responseStatus === 403) {
    throw new Error('MyMemory quota exceeded or error');
  }
  return translated;
}

async function translateNow(text) {
  const { text: q, truncated } = truncate(text);

  // Fire both language requests in parallel — they share the same rate-limit slot
  const [en, fr] = await Promise.all([
    fetchTranslation(q, 'ja|en').catch(() => '[translation unavailable]'),
    fetchTranslation(q, 'ja|fr').catch(() => '[traduction indisponible]'),
  ]);

  return { en, fr, truncated };
}

async function drainQueue() {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const { text, resolve, reject } = queue.shift();

    // Re-check cache in case a duplicate queued while we were waiting
    if (cache.has(text)) {
      resolve(cache.get(text));
      continue;
    }

    try {
      const result = await translateNow(text);
      cache.set(text, result);
      resolve(result);
    } catch (err) {
      reject(err);
    }

    // ~1 tweet/second to stay well under MyMemory rate limits
    if (queue.length > 0) await sleep(1000);
  }

  processing = false;
}

/**
 * Translate Japanese text to English and French.
 * Returns { en, fr, truncated }.
 */
export function translate(text) {
  if (cache.has(text)) return Promise.resolve(cache.get(text));

  return new Promise((resolve, reject) => {
    queue.push({ text, resolve, reject });
    drainQueue();
  });
}
