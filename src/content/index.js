import { getSettings } from '../lib/settings.js';
import { startObserver } from './observer.js';

async function main() {
  const settings = await getSettings();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => startObserver(settings));
  } else {
    startObserver(settings);
  }
}

main();
