import { DEFAULTS, getSettings, saveSettings } from '../lib/settings.js';

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
  const el = document.getElementById(id);
  if (!el) return undefined;
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'number') return Number(el.value);
  return el.value;
}

function set(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === 'checkbox') el.checked = Boolean(value);
  else el.value = value;
}

async function init() {
  const settings = await getSettings();

  populateSelect('lang1', settings.lang1);
  populateSelect('lang2', settings.lang2);

  for (const key of Object.keys(DEFAULTS)) {
    if (key === 'lang1' || key === 'lang2') continue; // already set via populateSelect
    set(key, settings[key]);
  }
}

document.getElementById('save').addEventListener('click', async () => {
  const updated = {};
  for (const key of Object.keys(DEFAULTS)) {
    updated[key] = val(key);
  }

  await saveSettings(updated);

  const status = document.getElementById('status');
  status.textContent = 'Saved.';
  setTimeout(() => { status.textContent = ''; }, 2000);
});

init();
