/**
 * Shared panel rendering — used by the content script renderer and
 * the options-page live preview.
 */

export const STYLES = `
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

  /* A word cell stacks: reading / kanji / romaji (above) or kanji / reading / romaji (below) */
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

  /* ── Click-to-translate button (#6) ── */
  .translate-btn {
    margin-top: 4px;
    padding: 4px 14px;
    border: 1px solid rgba(29, 155, 240, 0.5);
    border-radius: 9999px;
    background: transparent;
    color: rgb(29, 155, 240);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .translate-btn:hover { background: rgba(29, 155, 240, 0.1); }

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

  /* ── Disabled preview state ── */
  .preview-disabled {
    padding: 12px 14px;
    color: #9aa5b1;
    font-style: italic;
    font-size: 13px;
    text-align: center;
  }
`;

// Human-readable language names for translation row labels
export const LANG_NAMES = {
  en: 'English', fr: 'French',  es: 'Spanish',  de: 'German',
  pt: 'Portuguese', it: 'Italian', nl: 'Dutch', pl: 'Polish',
  ru: 'Russian', sv: 'Swedish', tr: 'Turkish', ar: 'Arabic',
  zh: 'Chinese', ko: 'Korean',
};

/**
 * Build a token grid element from an array of tokens.
 * Respects showReading, showRomaji, readingPosition (#15).
 */
export function buildTokenGrid(tokens, settings = {}) {
  const {
    showReading     = true,
    showRomaji      = true,
    readingPosition = 'below',
  } = settings;

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

    // type === 'word'
    const cell = document.createElement('div');
    cell.className = 'token-cell';

    const surface = document.createElement('div');
    surface.className = 'token-surface';
    surface.textContent = token.surface;

    const readingEl = (token.reading && showReading)
      ? Object.assign(document.createElement('div'), {
          className: 'token-reading',
          textContent: token.reading,
        })
      : null;

    const romajiEl = (token.romaji && showRomaji)
      ? Object.assign(document.createElement('div'), {
          className: 'token-romaji',
          textContent: token.romaji,
        })
      : null;

    // #15 — reading position: above inserts reading before surface
    if (readingPosition === 'above') {
      if (readingEl) cell.appendChild(readingEl);
      cell.appendChild(surface);
    } else {
      cell.appendChild(surface);
      if (readingEl) cell.appendChild(readingEl);
    }
    if (romajiEl) cell.appendChild(romajiEl);

    grid.appendChild(cell);
  }

  return grid;
}

/**
 * Build a complete annotation panel: token grid + separator + translation rows.
 */
export function buildPanel(tokens, { lang1, lang2, truncated } = {}, settings = {}) {
  const { showLang1 = true, showLang2 = true, clickToTranslate = false } = settings;

  const panel = document.createElement('div');
  panel.className = 'panel';

  panel.appendChild(buildTokenGrid(tokens, settings));

  const sep = document.createElement('div');
  sep.className = 'sep';
  panel.appendChild(sep);

  if (clickToTranslate && !lang1 && !lang2) {
    const btn = document.createElement('button');
    btn.className = 'translate-btn';
    btn.textContent = 'Translate';
    panel.appendChild(btn);
    return panel;
  }

  const translationRows = [
    { label: LANG_NAMES[settings.lang1] || settings.lang1 || 'English', value: lang1, show: showLang1 },
    { label: LANG_NAMES[settings.lang2] || settings.lang2 || 'French',  value: lang2, show: showLang2 },
  ].filter((r) => r.show && r.value && r.value !== '[translation unavailable]');

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

  return panel;
}
