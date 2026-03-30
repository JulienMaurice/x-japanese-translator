const ENDPOINT = 'https://api.mymemory.translated.net/get';
const MAX_CHARS = 450;

// Cache keyed by "text|lang1|lang2" so language changes bust stale entries
const cache = new Map();

const queue = [];
let processing = false;

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function truncate(text) {
  if (text.length <= MAX_CHARS) return { text, truncated: false };

  const candidate = text.substring(0, MAX_CHARS);
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

// #5 — append registered email to raise quota from 5K → 50K chars/day
function buildUrl(text, langpair, email) {
  let url = `${ENDPOINT}?q=${encodeURIComponent(text)}&langpair=${langpair}`;
  if (email) url += `&de=${encodeURIComponent(email)}`;
  return url;
}

async function fetchTranslation(text, langpair, email) {
  const res = await fetch(buildUrl(text, langpair, email));
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated || data?.responseStatus === 403) {
    throw new Error('MyMemory quota exceeded or error');
  }
  return translated;
}

async function translateNow(text, lang1, lang2, email) {
  const { text: q, truncated } = truncate(text);

  // #4 — use configured language codes instead of hardcoded en/fr
  const results = await Promise.all([
    lang1 ? fetchTranslation(q, `ja|${lang1}`, email).catch(() => '[translation unavailable]') : Promise.resolve(null),
    lang2 ? fetchTranslation(q, `ja|${lang2}`, email).catch(() => '[translation unavailable]') : Promise.resolve(null),
  ]);

  return { lang1: results[0], lang2: results[1], truncated };
}

async function drainQueue() {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const { text, lang1, lang2, email, resolve, reject } = queue.shift();
    const cacheKey = `${text}|${lang1}|${lang2}`;

    if (cache.has(cacheKey)) {
      resolve(cache.get(cacheKey));
      continue;
    }

    try {
      const result = await translateNow(text, lang1, lang2, email);
      cache.set(cacheKey, result);
      resolve(result);
    } catch (err) {
      reject(err);
    }

    if (queue.length > 0) await sleep(1000);
  }

  processing = false;
}

/**
 * Translate Japanese text using the configured language pair.
 * Returns { lang1, lang2, truncated }.
 *
 * settings.lang1 / lang2  — #4 configurable language codes
 * settings.myMemoryEmail  — #5 registered email for higher quota
 */
export function translate(text, settings = {}) {
  const lang1 = settings.lang1 || 'en';
  const lang2 = settings.lang2 || 'fr';
  const email = settings.myMemoryEmail || '';
  const cacheKey = `${text}|${lang1}|${lang2}`;

  if (cache.has(cacheKey)) return Promise.resolve(cache.get(cacheKey));

  return new Promise((resolve, reject) => {
    queue.push({ text, lang1, lang2, email, resolve, reject });
    drainQueue();
  });
}
