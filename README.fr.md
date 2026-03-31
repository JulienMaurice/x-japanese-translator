# X Japanese Translator

Une extension Brave/Chrome qui annote automatiquement les tweets en japonais sur [x.com](https://x.com) avec les lectures furigana et des traductions — sans quitter la page.

![660530619_10238243337650085_3098683026442954446_n](https://github.com/user-attachments/assets/2292c59c-4bca-4b84-a1b5-1913b96a10d5)


---

## Installation (sans outils de développeur)

1. Allez sur la page [**Releases**](https://github.com/JulienMaurice/x-japanese-translator/releases/latest)
2. Téléchargez **x-japanese-translator.zip**
3. Décompressez l'archive n'importe où sur votre ordinateur
4. Ouvrez **brave://extensions** (ou **chrome://extensions**)
5. Activez le **Mode développeur** — interrupteur en haut à droite
6. Cliquez sur **Charger l'extension non empaquetée** → sélectionnez le dossier `dist/` décompressé
7. Ouvrez [x.com](https://x.com) — les tweets en japonais sont annotés automatiquement

> Le premier chargement prend quelques secondes pendant que le dictionnaire japonais (~12 Mo) se charge en arrière-plan. Les tweets qui apparaissent avant qu'il soit prêt sont mis en file d'attente et annotés dès que c'est possible.

---

## Installation (depuis les sources)

### Prérequis

- [Node.js](https://nodejs.org/) ≥ 18
- Brave ou tout navigateur basé sur Chromium

```bash
git clone https://github.com/JulienMaurice/x-japanese-translator
cd x-japanese-translator
npm install
npm run build
```

Puis suivez les étapes 4 à 7 ci-dessus, en sélectionnant le dossier `dist/` que vous venez de construire.

### Développement (mode watch)

```bash
npm run watch
```

Reconstruit à chaque sauvegarde de fichier. Rechargez l'extension dans le navigateur après chaque build.

### Publier une nouvelle version

Taguez le commit et poussez — GitHub Actions construit le zip et publie la release automatiquement :

```bash
git tag v1.0.1
git push origin v1.0.1
```

---

## Ce que ça fait

Pour chaque tweet contenant du texte japonais, un panneau d'annotation est injecté directement sous le tweet :

```
覚悟        キマり      まくり      の      友達        が
かくご      きまり                          ともだち
kakugo    kimari    makuri     no    tomodachi    ga

────────────────────────────────────────────────────────
English   Be ready to watch your friend fight to the end
French    Sois prêt à regarder ton ami se battre jusqu'au bout
```

### Trois couches d'annotation

| Couche | Ce qu'elle affiche | Exemple |
|---|---|---|
| **Surface** (grande) | Texte original — kanji, kana, ponctuation | `覚悟` |
| **Lecture** (bleue, petite) | Lecture en hiragana — uniquement pour les tokens contenant des kanji | `かくご` |
| **Romaji** (gris italique) | Romanisation Hepburn | `kakugo` |

- Les tokens en hiragana/katakana pur affichent déjà leur prononciation, ils ne reçoivent donc que le romaji (pas de ligne de lecture redondante).
- Les caractères latins, chiffres et ponctuation apparaissent en ligne sans annotation.
- Les sauts de ligne du tweet original sont préservés.

### Traductions

Deux lignes apparaissent sous la grille de mots :

- **Anglais** — `ja → en` via MyMemory
- **Français** — `ja → fr` via MyMemory

Les deux requêtes sont envoyées en parallèle. Si un tweet dépasse ~450 caractères, le texte est tronqué à la limite de phrase la plus proche (`。！？`) et une note *« la traduction peut être partielle »* est affichée.

---

## Ce qu'il faut attendre des traductions

L'extension utilise l'**[API MyMemory](https://mymemory.translated.net/)** gratuite — aucun compte ni clé API requise.

- **Qualité** : bonne pour les phrases courantes ; peut être maladroite pour l'argot, le langage internet ou les tweets très contextuels.
- **Quota anonyme** : 5 000 caractères / jour par IP. Pour une lecture occasionnelle c'est largement suffisant (≈ 30–100 tweets/jour). Une utilisation intensive peut atteindre la limite.
- **Vitesse** : les traductions sont mises en file d'attente à ~1 tweet/seconde au chargement de la page pour respecter les limites de débit.
- **Contenu mixte** : les tweets mêlant japonais et autres langues traduisent correctement les parties japonaises ; les parties non japonaises passent sans modification.

Pour relever la limite à 50 000 caractères/jour, créez un compte MyMemory gratuit et renseignez votre adresse email dans la page de paramètres de l'extension (icône ⚙️ dans la barre d'outils).

---

## Comment ça marche

```
Page x.com
  └── content.js (injecté par l'extension)
        ├── observer.js       MutationObserver surveille les ajouts de article[data-testid="tweet"] ;
        │                     réessaie à 800 ms / 2 s / 4 s pour le rendu différé de React ;
        │                     patche history.pushState pour la navigation SPA
        │
        ├── processor.js      Pour chaque tweet avec ≥ 2 caractères japonais :
        │                     exécute getTokens() + translate() en parallèle,
        │                     puis appelle updateAnnotation()
        │
        ├── lib/japanese.js   kuroshiro + kuromoji (analyseur morphologique)
        │                       • Init singleton : charge le dictionnaire kuromoji (~12 Mo)
        │                         une seule fois par onglet via XHR depuis dist/dict/
        │                       • getTokens() : découpe chaque ligne en descripteurs de tokens
        │                         typés ; wanakana convertit les lectures katakana
        │                         en hiragana / romaji par token
        │                       • Les segments non japonais contournent kuroshiro entièrement
        │                         (évite les plantages sur les tweets multilingues)
        │
        ├── lib/translation.js  API REST MyMemory
        │                       • File FIFO, ~1 req/s pour respecter le quota journalier
        │                       • ja→en et ja→fr envoyés en parallèle par tweet
        │                       • Cache en mémoire : les tweets déjà vus ne coûtent aucune requête
        │
        └── renderer.js       Panneau d'annotation en Shadow DOM
                                • Inséré après le bloc de texte du tweet, au-dessus
                                  de la barre d'actions (like / retweet)
                                • Shadow DOM empêche le CSS de X de fuiter dans/hors du panneau
                                • Grille de mots : cellules flex-wrap empilant
                                  surface / lecture / romaji
                                • Mode sombre : échantillonne la luminance du fond de document.body
                                  pour détecter le thème sombre de X indépendamment
                                  du paramètre de couleur du système
```

### Stack technique

| Besoin | Bibliothèque |
|---|---|
| Analyse morphologique | [kuromoji](https://github.com/takuyaa/kuromoji.js) via [kuroshiro-analyzer-kuromoji](https://github.com/hexenq/kuroshiro-analyzer-kuromoji) |
| Conversion kana / romaji | [kuroshiro](https://github.com/hexenq/kuroshiro) + [wanakana](https://wanakana.com/) |
| Traduction | [API MyMemory](https://mymemory.translated.net/doc/spec.php) (gratuite, sans clé) |
| Build | [esbuild](https://esbuild.github.io/) |

---

## Limitations connues

- **Temps de chargement du dictionnaire** : kuromoji charge ~12 Mo au premier usage. Les tweets visibles avant qu'il soit prêt sont mis en file d'attente.
- **Publicités / tweets sponsorisés** : les conteneurs sans élément `tweetText` sont silencieusement ignorés.
- **Quota MyMemory** : 5 000 caractères/jour en mode anonyme. Renseignez votre email dans les paramètres pour passer à 50 000.
- **Changements du DOM de X** : X met fréquemment à jour son frontend. Si les annotations cessent d'apparaître, les sélecteurs `data-testid="tweet"` ou `data-testid="tweetText"` dans `observer.js` / `renderer.js` peuvent nécessiter une mise à jour.
