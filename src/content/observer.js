import { processTweet } from './processor.js';

const PROCESSED_ATTR = 'data-jptrans-done';
// Match both article and div wrappers — X sometimes changes the element type
const TWEET_SELECTOR = '[data-testid="tweet"]';

function handleArticle(article) {
  if (article.hasAttribute(PROCESSED_ATTR)) return;
  article.setAttribute(PROCESSED_ATTR, 'true');
  console.log('[JpTrans] tweet found, queuing:', article);
  processTweet(article);
}

function scanExisting() {
  const found = document.querySelectorAll(TWEET_SELECTOR);
  console.log(`[JpTrans] scanExisting: ${found.length} tweet(s) found`);
  found.forEach(handleArticle);
}

export function startObserver() {
  console.log('[JpTrans] extension started on', location.href);

  scanExisting();

  // Retry scans for status pages where React renders after document_idle
  setTimeout(scanExisting, 800);
  setTimeout(scanExisting, 2000);
  setTimeout(scanExisting, 4000);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        if (node.matches?.(TWEET_SELECTOR)) {
          handleArticle(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll(TWEET_SELECTOR).forEach(handleArticle);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  const originalPushState = history.pushState.bind(history);
  history.pushState = function (...args) {
    originalPushState(...args);
    setTimeout(scanExisting, 1500);
    setTimeout(scanExisting, 3000);
  };

  window.addEventListener('popstate', () => {
    setTimeout(scanExisting, 1500);
    setTimeout(scanExisting, 3000);
  });
}
