import { DEFAULTS, getSettings, saveSettings } from '../lib/settings.js';
import { STYLES, buildPanel } from '../lib/panel.js';
import { toRomaji } from 'wanakana';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'ru', label: 'Russian' },
  { code: 'sv', label: 'Swedish' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ko', label: 'Korean' },
];

// Maps settings key → wanakana romanization identifier
const ROMAJI_SYSTEM_MAP = {
  hepburn: 'hepburn',
  nihon:   'nihonsiki',
  kunrei:  'kunreisiki',
};

const PURE_KATAKANA_RE = /^[\u30A0-\u30FF\u30FC]+$/;

const PREVIEW_TOKENS_BASE = [
  { type: 'word', surface: '日本語', reading: 'にほんご', katakana: 'ニホンゴ' },
  { type: 'word', surface: 'の',     reading: null,        katakana: 'ノ' },
  { type: 'word', surface: 'ゲーム', reading: null,        katakana: 'ゲーム' },
  { type: 'word', surface: 'を',     reading: null,        katakana: 'ヲ' },
  { type: 'word', surface: 'し',     reading: null,        katakana: 'シ' },
  { type: 'word', surface: 'て',     reading: null,        katakana: 'テ' },
  { type: 'word', surface: 'い',     reading: null,        katakana: 'イ' },
  { type: 'word', surface: 'ます',   reading: null,        katakana: 'マス' },
];

const PREVIEW_TRANSLATIONS = {
  lang1: 'I am playing a Japanese game.',
  lang2: "Je joue à un jeu japonais.",
  truncated: false,
};

function populateSelect(id, selected) {
  const sel = document.getElementById(id);
  for (const { code, label } of LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = label;
    if (code === selected) opt.selected = true;
    sel.appendChild(opt);
  }
}

function val(id) {
  // Radio group: look for a checked radio with name=id
  const radio = document.querySelector(`input[type="radio"][name="${id}"]:checked`);
  if (radio) return radio.value;

  const el = document.getElementById(id);
  if (!el) return undefined;
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'number') return Number(el.value);
  return el.value;
}

function set(id, value) {
  // Radio group
  const radio = document.querySelector(`input[type="radio"][name="${id}"][value="${value}"]`);
  if (radio) { radio.checked = true; return; }

  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === 'checkbox') el.checked = Boolean(value);
  else el.value = value;
}

// ── Live preview (#16) ──────────────────────────────────────────────────────

let previewHost   = null;
let previewShadow = null;

function setupPreview() {
  const container = document.getElementById('preview-host');
  if (!container) return;

  previewHost = document.createElement('div');
  previewHost.style.cssText = 'display:block;width:100%;';
  container.appendChild(previewHost);

  previewShadow = previewHost.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = STYLES;
  previewShadow.appendChild(style);
}

function renderPreview() {
  if (!previewShadow || !previewHost) return;

  const settings = {};
  for (const key of Object.keys(DEFAULTS)) {
    settings[key] = val(key);
  }

  // Reflect "enabled" toggle: show disabled message
  if (!settings.enabled) {
    const old = previewShadow.querySelector('.panel, .preview-disabled');
    const msg = document.createElement('div');
    msg.className = 'preview-disabled';
    msg.textContent = 'Extension disabled — tweets will not be annotated.';
    if (old) previewShadow.replaceChild(msg, old);
    else previewShadow.appendChild(msg);
    return;
  }

  const romanization = ROMAJI_SYSTEM_MAP[settings.romajiSystem] || 'hepburn';

  // Recompute romaji; apply skipKatakana for pure-katakana tokens
  const tokens = PREVIEW_TOKENS_BASE.map((t) => {
    const isPureKatakana = t.surface && PURE_KATAKANA_RE.test(t.surface);
    const skipRomaji = settings.skipKatakana && isPureKatakana;
    return {
      ...t,
      romaji: (!skipRomaji && t.katakana) ? toRomaji(t.katakana, { romanization }) : null,
    };
  });

  // Sync font-size attribute on the Shadow host so :host([data-size=...]) fires
  if (settings.fontSize && settings.fontSize !== 'normal') {
    previewHost.setAttribute('data-size', settings.fontSize);
  } else {
    previewHost.removeAttribute('data-size');
  }

  // When clickToTranslate is on, pass null translations so buildPanel shows the button
  const translations = settings.clickToTranslate
    ? { lang1: null, lang2: null, truncated: false }
    : PREVIEW_TRANSLATIONS;

  const oldPanel = previewShadow.querySelector('.panel, .preview-disabled');
  const newPanel = buildPanel(tokens, translations, settings);

  if (oldPanel) {
    previewShadow.replaceChild(newPanel, oldPanel);
  } else {
    previewShadow.appendChild(newPanel);
  }
}

// ── Init ────────────────────────────────────────────────────────────────────

async function init() {
  const settings = await getSettings();

  populateSelect('lang1', settings.lang1);
  populateSelect('lang2', settings.lang2);

  for (const key of Object.keys(DEFAULTS)) {
    if (key === 'lang1' || key === 'lang2') continue;
    set(key, settings[key]);
  }

  setupPreview();
  renderPreview();

  document.querySelector('.page').addEventListener('input', renderPreview);
}

document.getElementById('save').addEventListener('click', async () => {
  const status = document.getElementById('status');

  const email = val('myMemoryEmail');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    status.textContent = 'Invalid email address.';
    setTimeout(() => { status.textContent = ''; }, 3000);
    return;
  }

  const updated = {};
  for (const key of Object.keys(DEFAULTS)) {
    updated[key] = val(key);
  }

  await saveSettings(updated);

  status.textContent = 'Saved.';
  setTimeout(() => { status.textContent = ''; }, 2000);
});

init();
