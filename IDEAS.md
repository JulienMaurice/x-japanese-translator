# Idées d'amélioration produit

## Corrections / bugs connus (non trackés en issue)

1. Translation failures render `[translation unavailable]` as literal string — should hide the row
2. Settings changes require tab reload (no storage change listener)
3. Click-to-translate button removed on failure — no retry possible
4. `initJapanese()` caches a failed promise — dictionary load failures permanent until reload
5. `settings.enabled` toggle never checked in observer — extension always runs
6. MutationObserver never disconnected — memory leak in long sessions
7. Observer not debounced — potential jank on every DOM mutation
8. In-memory translation cache has no size limit — unbounded growth
9. Dark mode theme changes mid-session not picked up (one-time detection)
10. Quota exhausted vs. network error indistinguishable to user
11. MyMemory email not validated before saving
12. `history.pushState` monkeypatch has no error handling
13. `Object.keys(DEFAULTS)` iteration assumes every key has a matching form element

---

## Nouvelles fonctionnalités produit

### Apprentissage / Gamification
- Mode "quiz" — cacher la traduction et deviner avant de la révéler
- Historique des mots rencontrés (liste de vocabulaire exportable CSV/Anki)
- Niveau de difficulté du tweet affiché (N5→N1 JLPT estimé)
- Marquer des mots comme "à retenir" d'un clic
- Profil d'apprentissage : masquer les mots déjà connus, afficher uniquement les nouveaux

### Traduction / Lecture
- Popup dictionnaire inline au survol d'un mot
- Audio — prononciation d'un tweet via Web Speech API
- Support des threads (annoter toute la conversation d'un coup)
- OCR — détecter et traduire le texte japonais dans les images

### Personnalisation
- Couleur des furigana par type grammatical (verbe = bleu, nom = rouge…)
- Whitelist / blacklist de comptes (toujours/jamais traduire tel auteur)
- Thèmes d'annotation prédéfinis (minimaliste, étude, plein écran)

### Intégrations
- Export vers Anki via AnkiConnect (mots + contexte du tweet)
- Sync avec WaniKani / Bunpro API
- Partager un tweet annoté en image (screenshot avec furigana)

### Découverte & Stats
- Badge sur l'icône : nombre de tweets traduits dans la session
- Stats hebdomadaires : tweets lus, mots nouveaux, temps de lecture estimé
- Recommander des comptes japonais basés sur les tweets déjà lus

### Infrastructure
- Backend proxy pour mutualiser le quota MyMemory entre utilisateurs
- Support Firefox / Edge (manifest MV3 quasi-compatible)
