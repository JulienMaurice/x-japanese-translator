// Minimal service worker — all processing happens in the content script.
// This file satisfies the MV3 requirement for a background service_worker.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
