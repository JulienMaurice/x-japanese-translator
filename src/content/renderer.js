const STYLES = `
  :host { display: block !important; }

  /* ── Font size — driven by --panel-font-size custom property (#10) ── */
  :host { --panel-font-size: 14px; }
  :host([data-size="small"])  { --panel-font-size: 11px; }
  :host([data-size="large"])  { --panel-font-size: 17px; }

  /* ── Light mode (default) ── */
  .panel {
    margin: 8px 0 4px;
    padding: 10px 14px;
    border-left: 3px solid rgba(29, 155, 240, 0.55);
    background: rgba(29, 155, 240, 0.05);
    border-radius: 0 6px 6px 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: var(--panel-font-size);
    box-sizing: border-box;
  }

  /* ── Dark mode — applied when host has data-dark attribute ── */
  :host([data-dark]) .panel {
    background: rgba(29, 155, 240, 0.08);
    border-left-color: rgba(29, 155, 240, 0.65);
  }
  :host([data-dark]) .token-surface { color: #e7e9ea; }
  :host([data-dark]) .token-reading { color: rgb(29, 155, 240); }
  :host([data-dark]) .token-romaji  { color: #71767b; }
  :host([data-dark]) .token-plain   { color: #8b98a5; }
  :host([data-dark]) .sep           { background: rgba(29, 155, 240, 0.2); }
  :host([data-dark]) .value         { color: #e7e9ea; }
  :host([data-dark]) .label         { color: rgb(29, 155, 240); }
  :host([data-dark]) .loading       { color: #71767b; }
  :host([data-dark]) .error         { color: #f4212e; }
  :host([data-dark]) .note          { color: #71767b; }

  /* ── Word-by-word token grid ── */

  .token-grid {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 2px 1px;
    padding-bottom: 8px;
  }

  /* A word cell stacks: kanji / hiragana reading / romaji */
  .token-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1px 4px;
    min-width: 18px;
  }

  .token-surface {
    font-size: 15px;
    color: #0f1419;
    line-height: 1.4;
    text-align: center;
  }

  /* Hiragana reading — only shown when surface has kanji */
  .token-reading {
    font-size: 9.5px;
    color: rgba(29, 155, 240, 0.9);
    line-height: 1.3;
    text-align: center;
    font-weight: 500;
  }

  /* Romaji — shown for all Japanese tokens */
  .token-romaji {
    font-size: 9px;
    color: #8899a6;
    font-style: italic;
    line-height: 1.3;
    text-align: center;
  }

  /* Punctuation / Latin / numbers — inline, baseline-aligned */
  .token-plain {
    font-size: 15px;
    color: #536471;
    align-self: flex-end;
    padding-bottom: 3px;
    white-space: pre-wrap;
  }

  /* Forces a new line in the flex layout */
  .token-break {
    flex-basis: 100%;
    height: 6px;
  }

  /* ── Translation rows ── */

  .sep {
    height: 1px;
    background: rgba(29, 155, 240, 0.15);
    margin: 2px 0 6px;
  }

  .row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    padding: 2px 0;
    font-size: 13px;
    line-height: 1.55;
    color: #536471;
  }

  .label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: rgba(29, 155, 240, 0.85);
    min-width: 54px;
    padding-top: 3px;
    flex-shrink: 0;
  }

  .value {
    flex: 1;
    word-break: break-word;
  }

  /* ── States ── */

  .loading {
    color: #9aa5b1;
    font-style: italic;
    font-size: 12px;
  }

  .error {
    font-size: 12px;
    color: #e0245e;
  }

  .note {
    font-size: 11px;
    color: #9aa5b1;
    font-style: italic;
    margin-top: 4px;
  }
`;

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
 * @param {{ en, fr, truncated }} translations
 */
export function updateAnnotation(host, tokens, { en, fr, truncated }, settings = {}) {
  const {
    showReading = true,   // #3
    showRomaji  = true,   // #3
    showLang1   = true,   // #3
    showLang2   = true,   // #3
  } = settings;
  if (!host?.shadowRoot) return;

  const panel = host.shadowRoot.querySelector('.panel');
  panel.textContent = '';

  // Token grid — word-by-word display
  const grid = document.createElement('div');
  grid.className = 'token-grid';

  for (const token of tokens) {
    if (token.type === 'break') {
      const br = document.createElement('div');
      br.className = 'token-break';
      grid.appendChild(br);
      continue;
    }

    if (token.type === 'plain') {
      const span = document.createElement('span');
      span.className = 'token-plain';
      span.textContent = token.surface;
      grid.appendChild(span);
      continue;
    }

    // type === 'word': kanji / hiragana reading / romaji
    const cell = document.createElement('div');
    cell.className = 'token-cell';

    const surface = document.createElement('div');
    surface.className = 'token-surface';
    surface.textContent = token.surface;
    cell.appendChild(surface);

    if (token.reading && showReading) {
      const reading = document.createElement('div');
      reading.className = 'token-reading';
      reading.textContent = token.reading;
      cell.appendChild(reading);
    }

    if (token.romaji && showRomaji) {
      const romaji = document.createElement('div');
      romaji.className = 'token-romaji';
      romaji.textContent = token.romaji;
      cell.appendChild(romaji);
    }

    grid.appendChild(cell);
  }

  panel.appendChild(grid);

  // Separator
  const sep = document.createElement('div');
  sep.className = 'sep';
  panel.appendChild(sep);

  // Translations — only render rows that are enabled (#3)
  const translationRows = [
    { label: 'English', value: en, show: showLang1 },
    { label: 'French',  value: fr, show: showLang2 },
  ].filter((r) => r.show);

  for (const { label, value } of translationRows) {
    const row = document.createElement('div');
    row.className = 'row';

    const lbl = document.createElement('span');
    lbl.className = 'label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className = 'value';
    val.textContent = value;

    row.appendChild(lbl);
    row.appendChild(val);
    panel.appendChild(row);
  }

  if (truncated) {
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = 'Text was too long — translation may be partial.';
    panel.appendChild(note);
  }
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
