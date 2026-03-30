/**
 * Shared settings helper.
 * Read by the content script on every page load;
 * written by the options page via chrome.storage.sync.
 */

export const DEFAULTS = {
  enabled: true,
  showReading: true,        // hiragana reading above kanji
  showRomaji: true,         // romaji subtitle
  showLang1: true,          // first translation row
  showLang2: true,          // second translation row
  lang1: 'en',
  lang2: 'fr',
  romajiSystem: 'hepburn',  // 'hepburn' | 'nihon' | 'kunrei'
  skipKatakana: false,      // hide romaji for pure katakana tokens
  fontSize: 'normal',       // 'small' | 'normal' | 'large'
  clickToTranslate: false,
  myMemoryEmail: '',
  minJapaneseChars: 2,
};

/** Returns current settings merged with defaults. */
export async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULTS, (result) => resolve(result));
  });
}

/** Persists a partial settings object. */
export async function saveSettings(partial) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(partial, resolve);
  });
}
