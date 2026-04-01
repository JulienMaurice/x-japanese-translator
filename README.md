# X Japanese Translator

A Brave/Chrome extension that automatically annotates Japanese tweets on [x.com](https://x.com) with furigana readings and EN/FR translations — without leaving the page.

![660530619_10238243337650085_3098683026442954446_n](https://github.com/user-attachments/assets/2292c59c-4bca-4b84-a1b5-1913b96a10d5)


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

## What to expect from translations

The extension uses the **[MyMemory](https://mymemory.translated.net/)** free API — no account or API key required.

- **Quality**: good for standard phrases; can be awkward for slang, internet language, or highly context-dependent tweets.
- **Anonymous quota**: 5 000 characters / day per IP. For casual reading this is plenty (≈ 30–100 tweets/day). Heavy use may hit the limit.
- **Speed**: translations are queued at ~1 tweet/second on page load to stay within rate limits.
- **Mixed content**: tweets mixing Japanese with other languages translate the Japanese portions correctly; non-Japanese parts pass through unchanged.

To raise the limit to 50 000 chars/day, register a free MyMemory account and enter your email in the extension settings page (the ⚙️ icon in the toolbar).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/JulienMaurice/x-japanese-translator/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
## Known limitations

- **Dictionary load time**: kuromoji loads ~12 MB on first use. Tweets visible before it's ready are queued.
- **Ads / promoted tweets**: containers without a `tweetText` element are silently skipped.
- **MyMemory quota**: 5 000 chars/day anonymous. Add your email to the API calls to raise it to 50 000.
- **X DOM changes**: X updates its frontend frequently. If annotations stop appearing, the `data-testid="tweet"` or `data-testid="tweetText"` selectors in `observer.js` / `renderer.js` may need updating.
