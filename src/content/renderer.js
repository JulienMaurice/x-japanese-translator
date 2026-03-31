import { STYLES, buildTokenGrid, buildPanel } from '../lib/panel.js';

/**
 * Detect X's dark mode by sampling the page background colour.
 * X lets users set dark mode independently of the OS, so @media prefers-color-scheme
 * is unreliable here. A quick luminance check on document.body is more accurate.
 */
function isPageDark() {
  const bg = getComputedStyle(document.body).backgroundColor;
  const nums = bg.match(/\d+/g);
  if (!nums) return false;
  const [r, g, b] = nums.map(Number);
  // Perceived luminance — dark if below 50%
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

function findInsertionPoint(tweetRoot, textEl) {
  let node = textEl;
  while (node.parentElement && node.parentElement !== tweetRoot) {
    if (node.parentElement.querySelector('[role="group"]')) break;
    node = node.parentElement;
  }
  return node;
}

export function createAnnotationHost(tweetRoot, settings = {}) {
  const textEl = tweetRoot.querySelector('[data-testid="tweetText"]');
  if (!textEl) {
    console.warn('[JpTrans] tweetText not found inside', tweetRoot);
    return null;
  }
  if (tweetRoot.querySelector('[data-jptrans-host]')) return null;

  const host = document.createElement('div');
  host.setAttribute('data-jptrans-host', 'true');
  host.style.cssText = 'display:block;width:100%;';
  if (isPageDark()) host.setAttribute('data-dark', '');
  // #10 — font size
  if (settings.fontSize && settings.fontSize !== 'normal') {
    host.setAttribute('data-size', settings.fontSize);
  }

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLES;

  const panel = document.createElement('div');
  panel.className = 'panel';

  const loading = document.createElement('div');
  loading.className = 'loading';
  loading.textContent = 'Translating…';
  panel.appendChild(loading);

  shadow.appendChild(style);
  shadow.appendChild(panel);

  const anchor = findInsertionPoint(tweetRoot, textEl);
  console.log('[JpTrans] inserting annotation after', anchor);
  anchor.parentElement.insertBefore(host, anchor.nextSibling);

  return host;
}

/**
 * @param {HTMLElement} host
 * @param {Array}  tokens  — from getTokens()
 * @param {{ lang1, lang2, truncated }} translations
 * @param {object} settings
 */
export function updateAnnotation(host, tokens, translations, settings = {}) {
  if (!host?.shadowRoot) return;

  const shadow = host.shadowRoot;
  const style = shadow.querySelector('style');

  // Replace panel with freshly built one
  const oldPanel = shadow.querySelector('.panel');
  const newPanel = buildPanel(tokens, translations, settings);
  shadow.replaceChild(newPanel, oldPanel);

  // Re-attach style if it was removed
  if (!shadow.querySelector('style')) shadow.prepend(style);
}

/**
 * #6 — Click-to-translate: render tokens immediately, show a button
 * instead of auto-translating. Calls onTranslate() when clicked.
 */
export function showTranslateButton(host, tokens, settings, onTranslate) {
  if (!host?.shadowRoot) return;
  const shadow = host.shadowRoot;

  const oldPanel = shadow.querySelector('.panel');
  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.appendChild(buildTokenGrid(tokens, settings));

  const btn = document.createElement('button');
  btn.className = 'translate-btn';
  btn.textContent = 'Translate';
  btn.addEventListener('click', () => {
    btn.remove();
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.textContent = 'Translating…';
    panel.appendChild(loading);
    onTranslate();
  }, { once: true });
  panel.appendChild(btn);

  shadow.replaceChild(panel, oldPanel);
}

export function showAnnotationError(host, message = 'Translation failed.') {
  if (!host?.shadowRoot) return;
  const panel = host.shadowRoot.querySelector('.panel');
  panel.textContent = '';
  const err = document.createElement('div');
  err.className = 'error';
  err.textContent = message;
  panel.appendChild(err);
}
