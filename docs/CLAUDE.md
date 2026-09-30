# San Martino User Panel - Claude Documentation

## Project Overview
Applicazione Web (Angular 21) per la gestione degli stand gastronomici.

## Versioning & CI/CD
- **Branching Model**: `git flow`. `develop` per lo sviluppo, `master` per la produzione.
- **Version Management**: Gestita in `package.json`.
- **CI/CD Pipeline**: `ci-cd.yml` esegue la build su branch/PR. Supporta il deploy manuale dell'immagine Docker via "Approve" (environment `san-martino-registry`).
- **Release Automation (Smart Versioning)**: Al merge su `master`, il workflow `release.yml` determina la versione dal nome del branch o dalle etichette PR.

## Build & Run Commands
- Install: `npm install`
- Start: `npm start`
- Build: `npm run build`
- Test: `npm test`
