import { processTweet } from './processor.js';

const PROCESSED_ATTR = 'data-jptrans-done';
const TWEET_SELECTOR = '[data-testid="tweet"]';

function handleArticle(article, settings) {
  if (article.hasAttribute(PROCESSED_ATTR)) return;
  article.setAttribute(PROCESSED_ATTR, 'true');
  console.log('[JpTrans] tweet found, queuing:', article);
  processTweet(article, settings);
}

function scanExisting(settings) {
  const found = document.querySelectorAll(TWEET_SELECTOR);
  console.log(`[JpTrans] scanExisting: ${found.length} tweet(s) found`);
  found.forEach((el) => handleArticle(el, settings));
}

export function startObserver(settings) {
  console.log('[JpTrans] extension started on', location.href, '| enabled:', settings.enabled);

  if (!settings.enabled) return;

  scanExisting(settings);
  setTimeout(() => scanExisting(settings), 800);
  setTimeout(() => scanExisting(settings), 2000);
  setTimeout(() => scanExisting(settings), 4000);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches?.(TWEET_SELECTOR)) {
          handleArticle(node, settings);
        } else if (node.querySelectorAll) {
          node.querySelectorAll(TWEET_SELECTOR).forEach((el) => handleArticle(el, settings));
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  const originalPushState = history.pushState.bind(history);
  history.pushState = function (...args) {
    try {
      originalPushState(...args);
    } catch (err) {
      console.warn('[JpTrans] pushState failed:', err);
    }
    setTimeout(() => scanExisting(settings), 1500);
    setTimeout(() => scanExisting(settings), 3000);
  };

  window.addEventListener('popstate', () => {
    setTimeout(() => scanExisting(settings), 1500);
    setTimeout(() => scanExisting(settings), 3000);
  });
}
