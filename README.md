# Platforma na evidenciu tímov a úloh

**TL;DR:** Webová aplikácia na správu tímov a úloh (Kanban nástenka, real-time aktualizácie, notifikácie na Discord). Celý projekt sa spúšťa jedným príkazom cez Docker Compose.

## Spustenie

```
cp .env.example .env
docker compose up --build
```

Po spustení:

| Služba | Adresa |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (health check) | http://localhost:3000/api/health |
| PostgreSQL | localhost:5432 |

Súbor `.env` obsahuje heslá a nikdy sa nesmie pridať do Gitu. Odkaz na Discord webhook sa dopĺňa do premennej `DISCORD_WEBHOOK_URL`.

Skript `database/init.sql` sa vykoná len pri prvom vytvorení databázy. Po zmene schémy treba databázu zmazať a vytvoriť znova:

```
docker compose down -v
docker compose up --build
```

## Štruktúra

| Priečinok | Obsah |
|---|---|
| `frontend/` | React + TypeScript (Vite), stránky v `src/pages`, komponenty v `src/components` |
| `backend/` | Node.js + NestJS + Socket.IO, každá oblasť má vlastný priečinok v `src/` |
| `database/` | SQL schéma databázy |
| `tests/` | testy |
| `docs/` | dokumentácia a zápisnice zo stretnutí |
| `.github/workflows/` | automatická kontrola (CI) |

## Pravidlá tímu

- Vetvy: `main` (stabilná), `develop` (aktuálna práca), pracovné vetvy `feature/...`, `fix/...`, `docs/...`
- Priamy push do `main` a `develop` nie je povolený, zmeny idú cez pull request s kontrolou (code review)
- Commit správy: `typ: popis` (napr. `feat: add login form`)
