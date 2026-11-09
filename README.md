# Voltask

Voltask je tímový projekt pre predmet Tímový projekt na UCM: platforma na
evidenciu tímov a úloh, Kanban nástenka, real-time aktualizácie a prehľad progresu.

## Spustenie cez Docker

Požiadavky: Docker Desktop s Docker Compose.

1. Skopíruj `.env.example` do `.env`.
2. Vygeneruj `JWT_SECRET` (minimálne 32 náhodných bajtov), napríklad v PowerShelli:

   ```powershell
   $bytes = New-Object byte[] 32
   $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   $rng.GetBytes($bytes)
   [Convert]::ToBase64String($bytes)
   $rng.Dispose()
   ```

   Vlož výsledok do `.env` ako `JWT_SECRET`. Každý člen tímu používa vlastný
   lokálny secret; `.env` sa necommitne.
3. Spusti projekt:

   ```sh
   docker compose up --build
   ```

4. Otvor aplikácie:

   | Služba | Adresa |
   |---|---|
   | Voltask React aplikácia | http://localhost:5173 |
   | Node.js/NestJS API health check | http://localhost:3000/api/health |
   | PostgreSQL | localhost:5432 |

Každý člen tímu klonuje repozitár a vytvorí si vlastný `.env` z `.env.example`.
Potom spustí rovnaké `docker compose up --build`; netreba samostatne inštalovať
Node.js, NestJS ani PostgreSQL. Docker vytvorí oddelenú lokálnu databázu pre
každý počítač. Prvé spustenie backendu aplikuje verzované Prisma migrácie.

Discord webhook je voliteľný. Jeho URL nastav v `.env` ako
`DISCORD_WEBHOOK_URL`; webhook neposielaj do Gitu ani tímového chatu. Súbor `.env`
obsahuje lokálne nastavenia a tajomstvá a nesmie sa commitnúť.

Užitočné Docker príkazy z koreňa repozitára:

```sh
docker compose up --build       # spustí alebo prestavia všetky služby
docker compose logs -f api      # Node.js/NestJS logy
docker compose logs -f postgres # PostgreSQL logy
docker compose down             # zastaví kontajnery, dáta databázy ponechá
```

`docker compose down -v` navyše vymaže lokálnu databázu. Použi ho iba vtedy,
keď chceš zahodiť všetky lokálne dáta.

## Štruktúra projektu

| Cesta | Obsah |
|---|---|
| `frontend/src/` | React + TypeScript aplikácia (Vite) |
| `backend/src/` | NestJS API, WebSocket gateway a moduly podľa oblastí |
| `backend/test/` | API testovacie požiadavky a výsledky |
| `backend/prisma/` | Prisma schéma a verzované databázové migrácie |
| `docker-compose.yml` | PostgreSQL, Node.js/NestJS API a React/Vite služby, porty a volume |
| `.github/workflows/` | Automatický build a lint pri pushi a pull requeste |
| `AGENTS.md` | Pokyny pre prácu s projektom a tímové konvencie |

PostgreSQL je databázový server; Prisma je ORM a nástroj na schému/migrácie.
Obe technológie používame spolu.

### Teams API (prototyp)

Prihlasovacie endpointy vytvárajú JWT. Registrácia vytvorí používateľa aj jeho
predvolený tím `Môj tím`; pri prihlásení sa predvolený tím doplní aj starším
účtom, ktorý ešte nie je členom žiadneho tímu. Vytvorenie ďalšieho tímu vyžaduje
JWT a jeho tvorca sa stane vlastníkom.

| Metóda a cesta | Čo robí |
|---|---|
| `POST /api/auth/register` | Zaregistruje používateľa, vytvorí mu predvolený tím a vráti JWT |
| `POST /api/auth/login` | Overí prihlasovacie údaje, prípadne doplní predvolený tím a vráti JWT s platnosťou 1 hodina |

Registrácia prijíma `email`, `displayName` a `password`. Prihlásenie prijíma
`email` a `password`. Úspešná odpoveď obsahuje `user` a `accessToken`; hash hesla
sa v odpovedi nevracia. Duplicitný email vráti `409`, neplatné údaje `400` a
nesprávne prihlasovacie údaje `401`.

Príklad:

```sh
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"student@example.test\",\"displayName\":\"Student\",\"password\":\"StrongPass123\"}"
```

| Metóda a cesta | Čo robí |
|---|---|
| `GET /api/teams` | Vráti tímy, počet členov a počet úloh v každom Kanban stave |
| `POST /api/teams` | Vytvorí tím a pridá tvorcu ako vlastníka; vyžaduje JWT, `name` (1–80 znakov), voliteľné `description` (najviac 500 znakov) |
| `GET /api/teams/:id` | Vráti detail tímu, členov, úlohy a súhrn progresu |

Príklad vytvorenia tímu:

```sh
curl -X POST http://localhost:3000/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d "{\"name\":\"Tím A\",\"description\":\"Ukážkový tím\"}"
```

Odpoveď so súhrnom progresu obsahuje počty `total`, `todo`, `inProgress` a
`done`. Pri neplatnom vstupe API vráti `400`, pri neexistujúcom tíme `404`.

## Ktoré konfiguračné súbory riešiť

Nemusíš poznať všetky konfigurácie naraz. Pri bežnej práci najčastejšie upravíš
zdrojové súbory v `frontend/src/` alebo `backend/src/`.

| Súbor | Na čo slúži | Bežné pravidlo |
|---|---|---|
| `frontend/package.json` | Frontendové knižnice a príkazy `build`, `lint`, `dev` | Príkaz spustíš cez `npm run <názov>` |
| `frontend/package-lock.json` | Presné verzie frontendových knižníc | Udržiava ho npm; ručne ho neupravuj |
| `backend/package.json` | Backendové knižnice a príkazy vrátane Prisma | Nové balíky pridávaj cez `npm install` |
| `backend/package-lock.json` | Presné verzie backendových knižníc | Commituje sa spolu s `package.json` |
| `docker-compose.yml` | Ako sa spolu spúšťajú PostgreSQL, Node.js/NestJS API a React/Vite | Zmena portov alebo služieb patrí sem |
| `.env.example` | Vzor lokálnych nastavení pre Docker Compose | Bez reálnych hesiel a webhookov |
| `.env` | Tvoje lokálne nastavenia | Je ignorovaný Gitom; neposielaj ho spolužiakom |
| `backend/prisma/schema.prisma` | Tabuľky, polia a vzťahy databázy | Zmenu schémy sprevádza nová migrácia |
| `backend/prisma/migrations/` | História prenosných databázových zmien | Migrácie commituj; nemaž ani neupravuj už zdieľané |
| `backend/prisma.config.ts` | Nastavenie Prisma schémy a ciest migrácií | Zvyčajne netreba meniť |
| `backend/tsconfig.json`, `frontend/tsconfig*.json` | Pravidlá TypeScript kompilátora | Menia sa len pri zámere zmeniť type-check |
| `frontend/vite.config.ts` | Vývojový frontend server a API/WebSocket proxy | Vďaka proxy frontend volá backend cez rovnaký origin |
| `Dockerfile`, `.dockerignore` | Ako sa zostaví image danej služby a čo do nej nekopírovať | Uprav pri zmene Docker buildu |
| `.github/workflows/ci.yml` | Automatické kontroly na GitHube pri PR | CI musí prejsť pred zlúčením |
| `.gitignore` | Súbory, ktoré Git nemá commitovať | `.env`, `node_modules` a build výstupy ignorujeme |

Názov projektu v Compose je `voltask`. Služby sú pomenované podľa toho, čo v
nich beží: `api` je Node.js/NestJS, `postgres` je PostgreSQL a `frontend` je
React/Vite. Docker kontajnery majú názvy `voltask-api-1`, `voltask-postgres-1`
a `voltask-frontend-1`. Tento interný názov
nemení adresu GitHub repozitára.

## Branch stratégia a pull requesty

- `main` — stabilná verzia; chráňte ju pravidlami GitHubu, bez priameho pushu.
- `develop` — integračná vetva pre aktuálnu prácu tímu; tiež bez priameho pushu.
- Pracovné vetvy zakladajte z `develop`:
  - `feature/<číslo-úlohy>-<stručný-názov>` — nová funkcionalita, napr. `feature/12-team-api`
  - `fix/<číslo-úlohy>-<stručný-názov>` — oprava chyby
  - `docs/<stručný-názov>` — dokumentácia
  - `chore/<stručný-názov>` — údržba, konfigurácia alebo tooling
- Otvorte PR do `develop`, priraďte reviewera a počkajte na CI. PR do `main`
  vytvárajte z `develop`, keď je verzia pripravená na odovzdanie/prezentáciu.
- Jedna vetva má riešiť jednu dohodnutú úlohu. Pred prácou si s tímom
  zosúlaďte API a Prisma modely, ak sa zmena dotýka frontendu aj backendu.
- Commit správy píšte stručne v štýle `feat: add team endpoint`,
  `fix: handle missing assignee`, `docs: clarify local setup`.

Na GitHube nastavte branch protection pre `main` a `develop`: zakázať priamy
push a vyžadovať aspoň jedno schválenie PR a úspešný CI workflow. Toto nastavenie
sa robí v GitHub repozitári, nie v lokálnom Gite.

### Vrátenie commitu

Ak už commit pushneš alebo ho mohli stiahnuť spolužiaci, vytvor opačný commit:

```sh
git log -1 --oneline
git revert <hash-commitu>
git push
```

`git revert` zachová históriu a je bezpečný pre zdieľanú vetvu. Ak commit ešte
nebol pushnutý a je posledný, môžeš ho zrušiť a ponechať zmeny pripravené na
úpravu:

```sh
git reset --soft HEAD~1
```

Na zdieľanej vetve nepoužívaj `git reset` ani `git push --force`; prepísali by
históriu, ktorú môžu mať spolužiaci už stiahnutú.

## Kontroly pred PR

```sh
cd backend
npm run db:generate
npm run build
```

```sh
cd frontend
npm run lint
npm run build
```
