# Backend API: projekty ako hlavný priestor

Všetky cesty majú prefix `/api`. Endpointy vyžadujú existujúcu cookie
autentifikáciu (`voltask_access`); pri mutáciách musí požiadavka obsahovať
rovnaký `Origin` ako nakonfigurovaný `FRONTEND_URL`. Tokeny sa nevracajú v JSON.

## Projekty

### `GET /api/projects`

Vráti projekty dostupné prihlásenému používateľovi. Osobné projekty vidí iba
vlastník. Tímový projekt vidia jeho priradení členovia tímu a vlastníci tímu.

Response `200`:

```json
[
  {
    "id": "clproject1",
    "ownerId": "cluser1",
    "teamId": null,
    "name": "Osobné úlohy",
    "description": null,
    "createdAt": "2026-11-20T12:00:00.000Z",
    "updatedAt": "2026-11-20T12:00:00.000Z",
    "owner": { "id": "cluser1", "displayName": "Mária" },
    "team": null,
    "members": [
      {
        "userId": "cluser1",
        "joinedAt": "2026-11-20T12:00:00.000Z",
        "user": {
          "id": "cluser1",
          "displayName": "Mária",
          "email": "maria@example.com"
        }
      }
    ],
    "memberCount": 1,
    "taskCount": 0
  }
]
```

### `POST /api/projects`

Vytvorí osobný projekt (bez `teamId`) alebo tímový projekt (s `teamId`).
Tímový projekt môže vytvoriť iba vlastník tímu. Jeho tvorca sa automaticky stane
členom projektu.

Request:

```json
{
  "name": "Plánovanie",
  "description": "Voliteľný opis",
  "teamId": "clteam1"
}
```

`description` a `teamId` sú voliteľné; vynechaný/null `teamId` znamená osobný
projekt. Odpoveď `201` má rovnaký tvar objektu ako položka `GET /api/projects`.

### `GET /api/projects/:id`

Vráti projekt v rovnakom objekte ako zoznam. Pri neexistujúcom alebo
neprístupnom projekte vráti `404`.

### `PATCH /api/projects/:id`

Vlastník osobného projektu alebo vlastník príslušného tímu môže zmeniť názov
a/alebo opis. `teamId` meniť nemožno; prázdny objekt je `400`.

Request:

```json
{ "name": "Nový názov", "description": null }
```

`description: null` vymaže opis. Response `200` je aktualizovaný objekt
projektu rovnakého tvaru ako `GET /api/projects/:id`.

### `DELETE /api/projects/:id`

Rovnaké oprávnenia ako pri PATCH. Odstráni projekt, jeho úlohy a ich závislosti.
Response `200`: `{ "success": true }`.

### `POST /api/projects/:id/members`

Len vlastník tímu môže priradiť člena tímu k tímovému projektu; osobné projekty
sa týmto endpointom nezdieľajú. Člen musí už patriť k tímu projektu.

Request:

```json
{ "userId": "cluser2" }
```

Response `201`:

```json
{
  "userId": "cluser2",
  "joinedAt": "2026-11-20T12:05:00.000Z",
  "user": {
    "id": "cluser2",
    "displayName": "Ján",
    "email": "jan@example.com"
  }
}
```

### `DELETE /api/projects/:id/members/:userId`

Len vlastník tímu môže odobrať člena projektu. Jeho priradenia k úlohám tohto
projektu sa vyčistia (`assigneeId: null`).
Response `200`: `{ "success": true, "projectId": "clproject1", "userId": "cluser2" }`.

## Dashboard

### `GET /api/dashboard/summary`

Response `200`:

```json
{ "teamCount": 0, "projectCount": 1, "taskCount": 3 }
```

Počty projektov a úloh zahŕňajú len projekty dostupné používateľovi; používatelia
bez tímu preto dostanú platný súhrn s `teamCount: 0`.

## Úlohy

Úlohy patria projektu. `teamId` už nie je platný parameter ani pole task
endpointov; volajúci musí používať `projectId`. Neprístupný projekt vracia `404`.
Odpoveď úlohy:

```json
{
  "id": "cltask1",
  "title": "Pripraviť návrh",
  "description": null,
  "status": "TODO",
  "createdAt": "2026-11-20T12:10:00.000Z",
  "updatedAt": "2026-11-20T12:10:00.000Z",
  "projectId": "clproject1",
  "creatorId": "cluser1",
  "assigneeId": null
}
```

### `GET /api/tasks?projectId=clproject1&page=1&limit=50`

`projectId` je voliteľný. Ak chýba, vráti úlohy zo všetkých projektov
dostupných používateľovi. Ak je zadaný, vráti iba úlohy daného dostupného
projektu. Voliteľná paginácia povoľuje `page` od 1 do 1000 a `limit` od 1 do
100; pri zadaní jedného z nich sa druhý predvolí na `1` alebo `50`. Bez
paginácie sa vrátia všetky dostupné úlohy.

Response `200`: pole objektov úloh uvedeného tvaru.

### `POST /api/tasks`

Vytvorí úlohu v dostupnom projekte. Používateľ musí byť členom projektu alebo
vlastníkom tímu daného projektu. Voliteľný riešiteľ musí byť explicitným členom
projektu (samotné členstvo v tíme nestačí).

Request:

```json
{
  "projectId": "clproject1",
  "title": "Pripraviť návrh",
  "description": "Voliteľný opis",
  "status": "TODO",
  "assigneeId": "cluser2"
}
```

`description`, `status` a `assigneeId` sú voliteľné; predvolený stav je `TODO`.
Response `201` je vytvorená úloha uvedeného tvaru.

### `PATCH /api/tasks/:id/status`

Zmení stav úlohy v danom projekte. Požaduje sa kontext `projectId`.

Request:

```json
{ "projectId": "clproject1", "status": "IN_PROGRESS" }
```

Povolené stavy: `TODO`, `IN_PROGRESS`, `DONE`. Response `200` je aktualizovaná
úloha uvedeného tvaru.

### `DELETE /api/tasks/:id?projectId=clproject1`

Zmaže úlohu len v zadanom dostupnom projekte; závislosti od/z tejto úlohy sa
odstránia cez FK cascade. Response `200`: `{ "success": true }`.

## Tímové API a WebSocket

`GET /api/teams/:id` už nevracia tímovú kolekciu `tasks`; namiesto nej vracia
prístupné projekty v poli `projects` (s počtami členov a úloh). Tímové prehľady
počítajú iba úlohy projektov dostupných používateľovi.

WebSocket handshake naďalej vyžaduje platnú prístupovú cookie, platnú serverovú
session a povolený `Origin`. Klient sa pripojí k projektovej miestnosti udalosťou
`joinProject` s payloadom `"clproject1"`. Odpoveď je
`{ "joined": "clproject1" }`; neprihlásený alebo neoprávnený klient sa do
miestnosti nedostane. Existujúca udalosť `joinTeam` zostáva podporovaná.

### WebSocket eventy (server → klient)

Po úspešnom DB zápise server emituje tieto eventy do room-u `project:<projectId>`:

#### `task:created`

Emitovaný po vytvorení úlohy. Payload je kompletný objekt úlohy:

```json
{
  "id": "cltask1",
  "title": "Pripraviť návrh",
  "description": null,
  "status": "TODO",
  "createdAt": "2026-11-20T12:10:00.000Z",
  "updatedAt": "2026-11-20T12:10:00.000Z",
  "projectId": "clproject1",
  "creatorId": "cluser1",
  "assigneeId": null
}
```

#### `task:updated`

Emitovaný po zmene stavu úlohy. Payload je kompletný aktualizovaný objekt úlohy
(rovnaký tvar ako `task:created`).

#### `task:deleted`

Emitovaný po zmazaní úlohy.

```json
{
  "projectId": "clproject1",
  "taskId": "cltask1"
}
```
