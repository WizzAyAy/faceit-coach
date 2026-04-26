# Publier l'extension sur les stores

L'extension `faceit-coach` est buildee en deux variantes (Chrome MV3 + Firefox MV3) via WXT. Ce document couvre la publication sur **Chrome Web Store** (Unlisted, distribution privee) et **Firefox AMO** (self-distribution avec XPI signe).

Pre-requis : avoir un build a publier. Pour chaque release, le workflow GitHub Actions produit automatiquement les zips a la racine de la release du tag courant (cf. [`RELEASE.md`](./RELEASE.md)). Sinon en local :

```bash
pnpm --filter @faceit-coach/extension zip          # Chrome
pnpm --filter @faceit-coach/extension zip:firefox  # Firefox + sources.zip
# → packages/extension/.output/faceit-coach-X.Y.Z-{chrome,firefox,sources}.zip
```

## 1. Chrome Web Store (Unlisted)

### Pre-requis compte

- Compte developer Google Web Store : **5$ frais unique**, deja paye.
- Dashboard : https://chrome.google.com/webstore/devconsole/

### Pre-flight : conserver le `key` du manifest

Le `key` (cle publique RSA dans `wxt.config.ts`) doit etre **garde au premier upload** sur le Web Store. Ça permet a l'extension publiee d'avoir le **meme Extension ID** que la version sideload actuelle (`khpfppjaichdmbcoihjihfahooklnblc`). Pas de changement de CORS necessaire pour les friends qui passent du sideload au CWS.

### Etapes

1. Recupere le zip Chrome depuis la GitHub release du tag courant (ou build localement : `pnpm --filter @faceit-coach/extension zip`).

2. Sur le dashboard CWS : **Add new item** → upload le zip.

3. **Store listing** :
   - Title : `FACEIT Coach`
   - Summary (132 char) : `Pick/ban analysis & live match detection for FACEIT CS2 — requires self-hosted backend`
   - Description : etre **explicite** que l'extension necessite un backend self-hosted (`apiBaseUrl` configurable dans Options). Sinon les reviewers vont penser que c'est casse.
   - Category : Productivity
   - Language : English (Worldwide)
   - **Screenshots** (obligatoire, min 1) : 1280x800 ou 640x400. A faire : popup ouvert avec une analyse en cours + page Options.
   - Icon : 128x128 (deja dans le zip).

4. **Privacy practices** (zone qui se fait souvent reject si baclee) :
   - Single purpose : `Display FACEIT match analysis in the browser popup`
   - Permissions justifications :
     - `storage` → Persist user settings (API URL, FACEIT pseudo)
     - `activeTab` → Detect FACEIT room ID from current tab URL
     - `host_permissions` → Communicate with self-hosted FACEIT Coach API
   - Data usage : declarer "Personally identifiable information (FACEIT pseudo)" et "Authentication information (API key)" — both **stored locally only, not transmitted to any third party**.
   - Remote code : **No** (tout est bundle).

5. **Distribution** :
   - Visibility : **Unlisted** (pas dans la recherche, accessible via lien direct)
   - Geographic distribution : All regions
   - Pricing : Free

6. **Submit for review** → 1 a 3 jours typiquement.

7. Apres publication : recuperer le lien public + l'Extension ID. Si tu as garde le `key`, l'ID matche `khpfppjaichdmbcoihjihfahooklnblc` — sinon mettre a jour `API_CORS_ORIGINS` cote serveur.

### Updates suivants

Pour chaque nouvelle release :

1. Pousser un tag `vX.Y.Z` → CI build automatiquement le zip Chrome (dispo sur la GitHub release).
2. Sur le dashboard CWS : **Package → Upload new package** → upload le zip → Submit for review.

Pas d'auto-publish gratuit (Google demande OAuth + l'API privee, faisable avec [`chrome-webstore-upload-cli`](https://github.com/fregante/chrome-webstore-upload-cli) si on veut s'embeter).

## 2. Firefox AMO (self-distribution)

L'AMO est gratuit (pas de fee). Compte sur https://addons.mozilla.org/developers/.

### Self-distribution (recommande pour rester prive)

C'est l'option qu'on veut : Mozilla **signe** un XPI mais ne le liste pas publiquement. On distribue le `.xpi` signe directement (lien GitHub release).

1. Build le zip Firefox **avec sources** :
   ```bash
   pnpm --filter @faceit-coach/extension zip:firefox
   # produit:
   # - faceit-coach-X.Y.Z-firefox.zip      (le bundle)
   # - faceit-coach-X.Y.Z-sources.zip      (sources requises par AMO pour reviewer)
   ```

2. Sur https://addons.mozilla.org/developers/addon/submit/ :
   - Choisir **On your own** (self-distribution).
   - Upload le `firefox.zip`.
   - Repondre "Yes" a "Does your add-on use code from external sources?" (Vue, Pinia, etc. sont bundles) → AMO va demander les sources.
   - Upload le `sources.zip` (genere par WXT au step precedent).
   - Indiquer comment build dans le champ "Build instructions" :
     ```
     pnpm install --frozen-lockfile && pnpm --filter @faceit-coach/core build && pnpm --filter @faceit-coach/extension build:firefox
     ```

3. **Listing info** :
   - Name : `FACEIT Coach`
   - Summary : meme contenu que CWS
   - Categories : Productivity
   - License : a choisir (MIT/ISC OK, ou "All Rights Reserved" si on veut)

4. **Soumettre** → review automatique + manuelle. Souvent **plus rapide que CWS** (heures a 1-2 jours).

5. Apres acceptance : Mozilla genere un `.xpi` signe, dispo dans l'admin du listing. **Telecharger ce XPI** et l'ajouter a la GitHub release du tag concerne (a la place du zip non-signe — sinon les friends peuvent pas l'installer en prod sur Firefox stable).

### Add-on ID stable

Le manifest contient `browser_specific_settings.gecko.id = "faceit-coach@quentin.maignan"` (dans `wxt.config.ts`). Cet ID restera fige au premier upload AMO — ne le change jamais.

> **A noter** : Firefox utilise un **UUID local aleatoire** par installation pour l'origin `moz-extension://<UUID>` (different de l'add-on ID). C'est pour ça que `API_CORS_ORIGINS` doit inclure `moz-extension://*` (wildcard) — l'API ne peut pas connaitre a l'avance les UUID des installs des friends.

### Updates suivants

Pour chaque release :

1. Build le zip Firefox + sources via le tag.
2. Sur le listing AMO : **New version** → upload `firefox.zip` + `sources.zip` → submit.
3. Recuperer le XPI signe et l'attacher a la GitHub release.

## 3. Cle privee Chrome

La cle publique est dans `packages/extension/wxt.config.ts` (constante `CHROME_PUBLIC_KEY`, ajoutee au manifest Chrome via le hook `build:manifestGenerated`). La **cle privee** correspondante n'est PAS dans le repo — elle est utile uniquement si on veut un jour signer un CRX ou re-uploader sur le Web Store en gardant le meme Extension ID.

Stocker en lieu sur (1Password, gestionnaire de secrets) :

```bash
# La cle privee a ete generee une fois avec :
openssl genrsa -out faceit-coach-extension.key 2048
```

Ne jamais committer ce fichier. Le `.gitignore` exclut `*.pem` et `*-extension.key` par precaution.
