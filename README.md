# San Martino — Web User Panel

Applicazione Web SPA (ottimizzata anche per utilizzo touch su tablet in cantina) per l'amministrazione dell'evento **"Le Cantine di San Martino"** (Arce, FR).

## Funzionalità Principali

- **Autenticazione & Ruoli OAuth2 / JWT (Keycloak)**: gestione granulare per `ROLE_ADMIN`, `ROLE_STAND_OWNER` e staff operativo cantina (`CASHIER`, `KITCHEN`, `DELIVERY`, `ORDER_VIEWER`).
- **Gestione Eventi & Saghe Distribuite (`ROLE_ADMIN`)**: creazione e modifica edizioni della festa (`UPCOMING` / `PAST`) e avvio/monitoraggio saghe distribuite (`create-event-with-stands`).
- **Gestione Cantine Multi-Edizione, Menu & Google Maps**:
  - Selettore edizione (`2014`–`2026`), iscrizione cantina a più edizioni e posizionamento GPS interattivo su Google Maps (API key fornita dal backend via Vault).
  - Gestione piatti (`FOOD`), vini (`DRINK`), scorte in tempo reale, parole chiave di ricerca e **riutilizzo 1-click dal catalogo storico della cantina** con continuità automatica delle recensioni tra edizioni.
- **Pulsantiera Touch & Coda Ordini Live (Web + Hardware ESP32)**:
  - Interfaccia touch per **Postazione Cassa**, **Postazione Cucina**, **Postazione Consegna (Bancone)** e **Tabellone Ordini**, sincronizzata in tempo reale con le 3 schede fisiche ESP32 (5 display 7-segmenti TM1637 + 10 slot LED/pulsanti).
  - Configurazione dei 10 slot piatti, token dispositivo ESP32 e permessi staff della cantina.
- **Moderazione Recensioni, Analytics & Audit Log (`ROLE_ADMIN`)**:
  - Coda di approvazione/rifiuto recensioni su cantine, piatti e vini.
  - Dashboard statistiche ricerche utenti (query popolari, zero-results, click su cantine e piatti).
  - Consultazione dell'audit trail di business centralizzato.

## Tech Stack

- **Framework**: Angular 21 (Signals, Standalone Components, SSR/Prerender)
- **Linguaggio**: TypeScript
- **Mappe**: `@angular/google-maps`
- **Container**: Multi-stage Docker (`node:22-alpine` → `nginxinc/nginx-unprivileged:1.29-alpine-slim`, porta `8080`, UID `101`, compatibile Kubernetes PSA `restricted`)
- **CI/CD**: GitHub Actions (Build AOT, GHCR Image Deploy, Smart Versioning & Release Automation)

## Comandi Principali

```bash
npm install                                    # Installazione dipendenze
npm start                                      # Server di sviluppo locale (http://localhost:4200)
npm run build                                  # Build di produzione Angular
npm test                                       # Esecuzione unit test
docker build -t san-martino-user-panel:local . # Build immagine container NGINX unprivileged
```

## Documentazione

- [Guida ai Rilasci e Versionamento](docs/RELEASE_GUIDE.md)
- [Dettagli Pipeline CI/CD](docs/ci-cd.md)
