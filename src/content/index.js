import { startObserver } from './observer.js';

// Wait for the DOM to be interactive before starting
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startObserver);
} else {
  startObserver();
}
