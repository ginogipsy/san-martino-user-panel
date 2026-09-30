# CI/CD — GitHub Actions (san-martino-user-panel)

> [!IMPORTANT]
> **Configurazione Obbligatoria per il Deploy Manuale**
> Per abilitare il pulsante di approvazione (il "terzo pallino") sui branch feature, devi configurare l'ambiente su GitHub:
> 1. Vai in **Settings** -> **Environments**.
> 2. Clicca su **New environment** e chiamalo esattamente **`san-martino-registry`**.
> 3. Sotto **Deployment protection rules**, attiva **Required reviewers**.
> 4. Aggiungi il tuo account GitHub come revisore.
> 5. Clicca su **Save protection rules**.

## Workflow

| File | Scopo | Trigger |
|---|---|---|
| `ci-cd.yml` | Build & Test | Push su branch/tag, PR |
| `release.yml` | Tag & GitHub Release | Push su `master` |
| `deploy.yml` | Pubblicazione Docker Image | Chiamato da `ci-cd.yml` |
| `qodana_code_quality.yml` | Analisi statica della qualità del codice | Push su branch/tag, PR |

## Allineamento a git flow

| Evento | build & test | Docker Build | Deploy OCI | Release/Tag |
|---|---|---|---|---|
| PR → `develop` / `master` | ✅ | ✅ | ❌ | ❌ |
| push su `develop` / `feature/*` | ✅ | ✅ | ✋ **Manuale** (Approve) | ❌ |
| push su `master` | ✅ | ✅ | 🚀 **Automatico** | **Smart Versioning** |
| push tag `v*` | ✅ | ✅ | 🚀 **Automatico** | ❌ |
