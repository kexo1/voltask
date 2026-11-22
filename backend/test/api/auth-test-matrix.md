# Auth API – Testovacia matica

| ID | Testovací scenár | Endpoint | Očakávaný výsledok | Skutočný výsledok | Stav |
|---|---|---|---|---|---|
| AUTH-01 | Úspešná registrácia | POST /api/auth/register | 201 + používateľ + JWT | 201 + používateľ + JWT | PASS |
| AUTH-02 | Duplicitný email | POST /api/auth/register | 4xx chyba | 409 Conflict | PASS |
| AUTH-03 | Úspešné prihlásenie | POST /api/auth/login | Úspešné prihlásenie + JWT | 201 + používateľ + JWT | PASS |
| AUTH-04 | Zlé heslo | POST /api/auth/login | 4xx chyba | 401 Unauthorized | PASS |
| AUTH-05 | Neplatný email | POST /api/auth/register | 4xx chyba | 400 Bad Request | PASS |
| AUTH-06 | Registrácia bez hesla | POST /api/auth/register | 4xx chyba | 400 Bad Request | PASS |
| AUTH-07 | Účet bez tímov po registrácii a prihlásení | POST /api/auth/register, POST /api/auth/login | 201 + GET /api/teams vráti prázdne pole | Registrácia, logout, login 201 + GET /api/teams 200 a `[]` | PASS |
| AUTH-08 | Prázdny zoznam tímov pre používateľa bez tímov | GET /api/teams | 200 + `[]` | 200 + `[]` | PASS |
| AUTH-09 | Anonymný prístup k chráneným endpointom | GET /api/auth/me, GET /api/teams | 401 Unauthorized | Oba endpointy vrátili 401 | PASS |
| AUTH-10 | OWNER a MEMBER prístup k tímu | GET /api/teams/:id, POST /api/teams/:id/members | OWNER aj MEMBER získajú svoj tím; MEMBER nemôže meniť rolu | OWNER 200, MEMBER 200, zmena roly MEMBER 403 | PASS |
| AUTH-11 | Pokus o prístup k cudziemu tímu | GET /api/teams/:id | 404 Not Found | 404 Not Found | PASS |
| AUTH-12 | Zmena profilového mena | PATCH /api/auth/profile, GET /api/auth/me | 200 + aktualizované `displayName` | PATCH 200 + GET vrátil aktualizované meno | PASS |
| AUTH-13 | Obnovenie stránky a stayLoggedIn | GET /api/auth/me po prihlásení s `stayLoggedIn: true` | 200 + používateľ zostane prihlásený | GET /api/auth/me vrátil 200 | PASS |
| AUTH-14 | Obnovenie refresh cookie | POST /api/auth/refresh | 201 + nová autentifikačná cookie | POST 201 + následný GET /api/auth/me 200 | PASS |
| AUTH-15 | Vytvorenie a zmazanie tímu | POST /api/teams, DELETE /api/teams/:id | 201, potom 200 a následný GET 404 | POST 201, DELETE 200, následný GET 404 | PASS |
| AUTH-16 | Logout | POST /api/auth/logout, GET /api/auth/me | logout 201, následný GET 401 | logout 201, následný GET 401 | PASS |

## Zhrnutie

- Celkový počet testov: **16**
- PASS: **16**
- FAIL: **0**
- NOT RUN: **0**
- BLOCKED: **0**

Všetkých šestnásť scenárov prešlo na lokálnom Docker API stacku s dočasnými testovacími účtami.