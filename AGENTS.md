# Pokyny pre prácu na projekte

## Cieľ a rozloženie

Voltask je tímový projekt pre predmet Tímový projekt na UCM. Riešením je React
aplikácia a NestJS API na evidenciu tímov a úloh.

- `frontend/src/` — React + TypeScript aplikácia.
- `frontend/web/` — samostatná povinná projektová stránka pre školu. Nie je to
  súčasť React aplikácie ani Docker Compose stacku; zachovaj ju a upravuj ju iba
  v rámci príslušnej úlohy.
- `backend/src/` — NestJS API, gateway a backendové oblasti.
- `backend/prisma/schema.prisma` — databázový model.
- `backend/prisma/migrations/` — verzované Prisma migrácie.

## Tímová práca

- Pracuj vo vlastnej `feature/...`, `fix/...`, `docs/...` alebo `chore/...`
  vetve založenej z `develop`; zmeny posielaj PR do `develop`.
- Nevkladaj priamo do `main` ani `develop`. Pred zlúčením má PR prejsť CI a
  review spolužiakom.
- Jedna vetva/PR má riešiť jednu dohodnutú úlohu. Ak úloha mení API alebo
  databázový model, dohodni kontrakt s kolegami pracujúcimi na druhej časti.
- Používaj stručné commit správy, napr. `feat: add team endpoint`.

## Konvencie implementácie

- Píš TypeScript striktne a používaj existujúce vzory v príslušnej časti
  aplikácie. Novú backendovú oblasť drž v jej vlastnom NestJS module.
- PostgreSQL je databáza a Prisma je ORM. Zmeny modelu rob v
  `backend/prisma/schema.prisma` a vytvor novú pomenovanú migráciu; neupravuj
  staré migrácie, ktoré už mohli byť použité spoluhráčmi.
- Zmeny API a používateľského rozhrania drž konzistentné s pomenovaním endpointov,
  DTO a dátových typov. Nepridávaj tajomstvá, reálne webhooky ani lokálne `.env`
  súbory do Gitu.
- Úlohy môžu byť navzájom závislé (node-based tasks). Pri implementácii
  závislostí over, že úloha nemôže závisieť sama od seba ani vytvoriť cyklus.
- Neodstraňuj ani nepresúvaj školskú stránku v `frontend/web/` bez dohody.

## Lokálna kontrola

Backend (z `backend/`):

```sh
npm run db:generate
npm run build
```

Frontend (z `frontend/`):

```sh
npm run lint
npm run build
```

Celý vývojový stack možno spustiť z koreňa repozitára príkazom
`docker compose up --build`; Prisma migrácie sa pri štarte backendu aplikujú
príkazmi `prisma generate` a `prisma migrate deploy`. Prisma client sa generuje
pri štarte API kontajnera až po pripojení `backend/src` volume, aby bind mount
neprekryl vygenerované súbory.
