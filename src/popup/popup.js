import { DEFAULTS, getSettings, saveSettings } from '../lib/settings.js';
import { STYLES, buildPanel } from '../lib/panel.js';
import { toRomaji } from 'wanakana';

const TOGGLE_KEYS = ['enabled', 'showReading', 'showRomaji', 'showLang1', 'showLang2', 'clickToTranslate'];

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
  lang2: 'Je joue à un jeu japonais.',
  truncated: false,
};

let settings = { ...DEFAULTS };
let previewHost = null;
let previewShadow = null;

function getVal(id) {
  const el = document.getElementById(id);
  if (!el) return undefined;
  return el.type === 'checkbox' ? el.checked : el.value;
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === 'checkbox') el.checked = Boolean(value);
  else el.value = value;
}

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

  if (!settings.enabled) {
    const old = previewShadow.querySelector('.panel, .preview-disabled');
    const msg = document.createElement('div');
    msg.className = 'preview-disabled';
    msg.textContent = 'Extension disabled.';
    if (old) previewShadow.replaceChild(msg, old);
    else previewShadow.appendChild(msg);
    return;
  }

  const romanization = ROMAJI_SYSTEM_MAP[settings.romajiSystem] || 'hepburn';

  const tokens = PREVIEW_TOKENS_BASE.map((t) => {
    const isPureKatakana = t.surface && PURE_KATAKANA_RE.test(t.surface);
    const skipRomaji = settings.skipKatakana && isPureKatakana;
    return {
      ...t,
      romaji: (!skipRomaji && t.katakana) ? toRomaji(t.katakana, { romanization }) : null,
    };
  });

  if (settings.fontSize && settings.fontSize !== 'normal') {
    previewHost.setAttribute('data-size', settings.fontSize);
  } else {
    previewHost.removeAttribute('data-size');
  }

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

async function onToggleChange(key) {
  const value = getVal(key);
  if (value === undefined) return;
  settings[key] = value;
  await saveSettings({ [key]: value });
  renderPreview();
}

async function init() {
  settings = await getSettings();

  for (const key of TOGGLE_KEYS) {
    setVal(key, settings[key]);
    const el = document.getElementById(key);
    if (el) el.addEventListener('change', () => onToggleChange(key));
  }

  setupPreview();
  renderPreview();

  document.getElementById('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

init();
