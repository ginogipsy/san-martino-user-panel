# Guida ai Rilasci e Versionamento (Angular App)

> [!IMPORTANT]
> **Configurazione Obbligatoria per il Deploy Manuale**
> Per abilitare il pulsante di approvazione (il "terzo pallino") sui branch feature, devi configurare l'ambiente su GitHub:
> 1. Vai in **Settings** -> **Environments**.
> 2. Clicca su **New environment** e chiamalo esattamente **`san-martino-registry`**.
> 3. Sotto **Deployment protection rules**, attiva **Required reviewers**.
> 4. Aggiungi il tuo account GitHub come revisore.
> 5. Clicca su **Save protection rules**.

Questa guida spiega come gestire il ciclo di vita dell'applicazione web, i rilasci su GitHub e il sistema di versionamento automatico.

## 📌 Regole del Versionamento

L'applicazione utilizza il **Semantic Versioning** all'interno del file `package.json`.

- **Major (X.0.0)**: Redesign completi o cambiamenti radicali.
- **Minor (0.X.0)**: Nuove funzionalità.
- **Patch (0.0.X)**: Bug fix o piccoli aggiustamenti.

## 🚀 Come effettuare un Rilascio

Il processo segue il modello **Git Flow**. Hai quattro modi per decidere la versione del prossimo rilascio:

### 1. Metodo Standard (Patch automatica)
1. Crea una Pull Request da `develop` a `master`.
2. Fai il Merge.
3. **Risultato**: Il bot incrementerà automaticamente la **Patch** (es. `0.1.0` -> `0.1.1`).

### 2. Tramite Etichette PR (Consigliato per Minor/Major)
1. Crea la Pull Request verso `master`.
2. Su GitHub, aggiungi l'etichetta (label) **`minor`** o **`major`**.
3. Fai il Merge.
4. **Risultato**: Il bot incrementerà la versione in base all'etichetta.

### 3. Tramite Nome del Branch (Git Flow rigido)
1. Crea un branch chiamato `release/1.2.0` (o `release/v1.2.0`).
2. Apri la PR verso `master` e fai il merge.
3. **Risultato**: Il bot forzerà esattamente la versione `1.2.0`.

### 4. Metodo Manuale (GitHub UI)
1. Vai nella tab **Actions** su GitHub.
2. Seleziona il workflow **"Release & Smart Versioning"**.
3. Clicca su **"Run workflow"**.
4. Inserisci la versione desiderata nel campo `manual_version` (es: `1.5.0`).

---

## 📦 Rilascio dell'Immagine Docker

La pubblicazione delle immagini Docker sul registry (GHCR) segue una logica differenziata per garantire velocità in produzione e controllo nello sviluppo.

### 🚀 Pubblicazione Automatica (Continuous Deployment)
L'immagine viene creata e pushata **automaticamente** in due casi:
- **Merge su `master`**: L'immagine viene taggata come `latest`.
- **Creazione di un Tag Git (`v*`)**: L'immagine viene taggata con la versione corrispondente (es. `1.2.0`).

### ✋ Pubblicazione Manuale (Il "Terzo Pallino")
Sui branch di sviluppo (**`develop`**, **`feature/*`**, **`release/*`**), la pipeline si ferma dopo i test:
1. Vai nella tab **Actions** su GitHub.
2. Clicca sulla run corrente della pipeline.
3. Vedrai un pulsante **"Review deployments"**.
4. Clicca su **Approve** (per l'environment `san-martino-registry`).
5. **Risultato**: L'immagine verrà pubblicata con il **nome del branch** (es. `feature-008-permessi`), pronta per essere testata.

---

## 🧪 Qualità del Codice

Ogni commit ed ogni Pull Request viene analizzata automaticamente da TypeScript strict compiler & Angular AOT template check in `ci-cd.yml`.
- Il report è consultabile nella tab **Checks** della Pull Request.
- Assicuratevi che non vengano introdotti nuovi "Critical" o "High" issues prima del merge.

Ad ogni merge su `master`, il workflow di GitHub:
1. Determina la versione corretta tramite **Smart Versioning**.
2. Crea un **Tag Git**.
3. Crea una **GitHub Release**.
4. **Aggiorna `develop`**: Incrementa la versione in `package.json` e fa il back-merge.
