# Kanban frontend

Tento priečinok obsahuje frontendovú časť Kanban nástenky. Zatiaľ používa
ukážkové dáta; úlohy sa ešte nenačítavajú z backendu a zmeny sa neukladajú do
databázy.

## Štruktúra

- `components/BoardColumn.tsx` – vykreslí jeden stĺpec nástenky a jeho úlohy.
- `components/TaskCard.tsx` – vykreslí jednu kartu úlohy a zapojí ju do
  presúvania.
- `data/tasks.ts` – dočasné ukážkové úlohy (`MOCK_TASKS`).
- `types/task.ts` – typ úlohy, možné stavy a definícia stĺpcov.

Stránka, ktorá tieto časti spája, je v `../../pages/BoardPage.tsx`. Jej štýly sú
v `../../pages/BoardPage.css`.

## Ako sa nástenka zobrazí

1. `main.tsx` spustí React aplikáciu.
2. `App.tsx` momentálne zobrazí `BoardPage`.
3. `BoardPage` načíta `MOCK_TASKS` do React state – pamäte stránky počas jej
   otvorenia.
4. Pre každý stav z `COLUMNS` vytvorí `BoardColumn`.
5. Každý stĺpec dostane len úlohy, ktorých `status` zodpovedá stavu daného
   stĺpca. Karty vykreslí `TaskCard`.

## Ako funguje presúvanie

Presúvanie používa knižnicu `@dnd-kit/core`. `BoardPage` nastavuje ovládanie
myšou a dotykom a obaluje stĺpce do `DndContext`.

- `BoardColumn` označí stĺpec ako miesto, na ktoré možno pustiť kartu.
- `TaskCard` označí kartu ako prvok, ktorý možno ťahať.
- Po pustení karty `BoardPage` zistí jej ID a stav cieľového stĺpca.
- `setTasks` zmení stav danej úlohy. React potom prekreslí kartu v novom
  stĺpci.

Aktuálne sa mení iba stav v pamäti prehliadača. Po obnovení stránky sa preto
zobrazia pôvodné ukážkové dáta.

## Stav implementácie

Hotové:

- tri stĺpce `TODO`, `IN_PROGRESS` a `DONE`,
- ukážkové karty úloh,
- presúvanie kariet myšou aj dotykom,
- zmena stavu karty v lokálnom React state.

Zatiaľ chýba:

- načítanie a ukladanie úloh cez backendové API,
- trvalé uloženie zmeny stavu,
- živé aktualizácie cez WebSocket,
- vytváranie a úprava úloh.

## Užitočné príkazy

V priečinku `frontend/`:

```sh
npm run dev
npm run lint
npm run build
```
