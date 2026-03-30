# X Japanese Translator

A Brave/Chrome extension that automatically annotates Japanese tweets on [x.com](https://x.com) with furigana readings and EN/FR translations — without leaving the page.

---

## Install (no developer tools needed)

1. Go to the [**Releases**](https://github.com/JulienMaurice/x-japanese-translator/releases/latest) page
2. Download **x-japanese-translator.zip**
3. Unzip it anywhere on your computer
4. Open **brave://extensions** (or **chrome://extensions**)
5. Enable **Developer mode** — toggle in the top-right corner
6. Click **Load unpacked** → select the unzipped `dist/` folder
7. Open [x.com](https://x.com) — Japanese tweets are annotated automatically

> The first page load takes a few seconds while the Japanese dictionary (~12 MB) loads in the background. Tweets that appear before it's ready are queued and annotated once it's done.

---

## Install (from source)

### Requirements

- [Node.js](https://nodejs.org/) ≥ 18
- Brave or any Chromium-based browser

```bash
git clone https://github.com/JulienMaurice/x-japanese-translator
cd x-japanese-translator
npm install
npm run build
```

Then follow steps 4–7 above, selecting the `dist/` folder you just built.

### Development (watch mode)

```bash
npm run watch
```

Rebuilds on every file save. Reload the extension in the browser after each build.

### Publishing a new release

Tag the commit and push — GitHub Actions builds the zip and publishes the release automatically:

```bash
git tag v1.0.1
git push origin v1.0.1
```

---

## What it does

For every tweet that contains Japanese text, an annotation panel is injected directly below the tweet:

```
覚悟        キマり      まくり      の      友達        が
かくご      きまり                          ともだち
kakugo    kimari    makuri     no    tomodachi    ga

────────────────────────────────────────────────────────
English   Be ready to watch your friend fight to the end
French    Sois prêt à regarder ton ami se battre jusqu'au bout
```

### Three annotation layers

| Layer | What it shows | Example |
|---|---|---|
| **Surface** (large) | Original text — kanji, kana, punctuation | `覚悟` |
| **Reading** (blue, small) | Hiragana reading — only for tokens that contain kanji | `かくご` |
| **Romaji** (grey italic) | Hepburn romanisation | `kakugo` |

- Pure hiragana/katakana tokens already show their pronunciation, so they only get romaji (no redundant reading row).
- Latin characters, numbers and punctuation appear inline at baseline with no annotation.
- Line breaks from the original tweet are preserved.

### Translations

Two rows appear below the word grid:

- **English** — `ja → en` via MyMemory
- **French** — `ja → fr` via MyMemory

Both requests are fired in parallel. If a tweet exceeds ~450 characters the text is truncated at the nearest sentence boundary (`。！？`) and a *"translation may be partial"* notice is shown.

---

## What to expect from translations

The extension uses the **[MyMemory](https://mymemory.translated.net/)** free API — no account or API key required.

- **Quality**: good for standard phrases; can be awkward for slang, internet language, or highly context-dependent tweets.
- **Anonymous quota**: 5 000 characters / day per IP. For casual reading this is plenty (≈ 30–100 tweets/day). Heavy use may hit the limit.
- **Speed**: translations are queued at ~1 tweet/second on page load to stay within rate limits.
- **Mixed content**: tweets mixing Japanese with other languages translate the Japanese portions correctly; non-Japanese parts pass through unchanged.

To raise the limit to 50 000 chars/day, register a free MyMemory account and append `&de=your@email.com` to the API calls in `src/lib/translation.js`.

---

## How it works

```
x.com page
  └── content.js (injected by the extension)
        ├── observer.js       MutationObserver watches for article[data-testid="tweet"]
        │                     additions; retries at 800 ms / 2 s / 4 s for React's
        │                     deferred render; patches history.pushState for SPA nav
        │
        ├── processor.js      For each tweet with ≥ 2 Japanese characters:
        │                     runs getTokens() + translate() in parallel,
        │                     then calls updateAnnotation()
        │
        ├── lib/japanese.js   kuroshiro + kuromoji (morphological analyser)
        │                       • Singleton init: loads ~12 MB kuromoji dictionary
        │                         once per tab via XHR from dist/dict/
        │                       • getTokens(): parses each line into typed token
        │                         descriptors; wanakana converts katakana readings
        │                         to hiragana / romaji per token
        │                       • Non-Japanese segments bypass kuroshiro entirely
        │                         (prevents crashes on mixed-language tweets)
        │
        ├── lib/translation.js  MyMemory REST API
        │                       • FIFO queue, ~1 req/s to respect the daily quota
        │                       • ja→en and ja→fr fired in parallel per tweet
        │                       • In-memory cache: re-seen tweets cost zero requests
        │
        └── renderer.js       Shadow DOM annotation panel
                                • Inserted after the tweet text block, above the
                                  action bar (like / retweet buttons)
                                • Shadow DOM prevents X's CSS from leaking in/out
                                • Word grid: flex-wrap cells stacking
                                  surface / reading / romaji
                                • Dark mode: samples document.body background
                                  luminance to detect X's dark theme independently
                                  of the OS colour-scheme setting
```

### Tech stack

| Concern | Library |
|---|---|
| Morphological analysis | [kuromoji](https://github.com/takuyaa/kuromoji.js) via [kuroshiro-analyzer-kuromoji](https://github.com/hexenq/kuroshiro-analyzer-kuromoji) |
| Kana / romaji conversion | [kuroshiro](https://github.com/hexenq/kuroshiro) + [wanakana](https://wanakana.com/) |
| Translation | [MyMemory API](https://mymemory.translated.net/doc/spec.php) (free, no key required) |
| Build | [esbuild](https://esbuild.github.io/) |

---

## Known limitations

- **Dictionary load time**: kuromoji loads ~12 MB on first use. Tweets visible before it's ready are queued.
- **Ads / promoted tweets**: containers without a `tweetText` element are silently skipped.
- **MyMemory quota**: 5 000 chars/day anonymous. Add your email to the API calls to raise it to 50 000.
- **X DOM changes**: X updates its frontend frequently. If annotations stop appearing, the `data-testid="tweet"` or `data-testid="tweetText"` selectors in `observer.js` / `renderer.js` may need updating.
