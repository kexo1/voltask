# Auth API – Testovacia matica

| ID | Testovací scenár | Endpoint | Očakávaný výsledok | Skutočný výsledok | Stav |
|---|---|---|---|---|---|
| AUTH-01 | Úspešná registrácia | POST /api/auth/register | 201 + používateľ + JWT | 201 + používateľ + JWT | PASS |
| AUTH-02 | Duplicitný email | POST /api/auth/register | 4xx chyba | 409 Conflict | PASS |
| AUTH-03 | Úspešné prihlásenie | POST /api/auth/login | Úspešné prihlásenie + JWT | 201 + používateľ + JWT | PASS |
| AUTH-04 | Zlé heslo | POST /api/auth/login | 4xx chyba | 401 Unauthorized | PASS |
| AUTH-05 | Neplatný email | POST /api/auth/register | 4xx chyba | 400 Bad Request | PASS |
| AUTH-06 | Registrácia bez hesla | POST /api/auth/register | 4xx chyba | 400 Bad Request | PASS |

## Zhrnutie

- Celkový počet testov: **6**
- PASS: **6**
- FAIL: **0**
- BLOCKED: **0**

Všetky testované scenáre Auth API prešli úspešne.