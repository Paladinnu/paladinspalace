# Standardized Error Responses

To ensure consistent client handling, all API errors now return the shape:

```
{
	"error": "Human readable short message",
	"code": "MACHINE_CODE",
	"details": { ... optional extra info ... },
	"requestId": "<if available from middleware>"
}
```

Helper available in `lib/errors.ts` exporting `ERR` shortcuts: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_INPUT`, `RATE_LIMIT`, `SERVER_ERROR`.

Client code should branch on `code` rather than the human message.

## Login Auditing & Rate Limiting

Credential logins are rate limited per (email + IP) with a sliding window (10 attempts / 15 min). Events are written to `AuditEvent`:

- `LOGIN_FAIL` (reasons: USER_NOT_FOUND, BAD_PASSWORD)
- `LOGIN_SUCCESS`
- `LOGIN_RATE_LIMIT`

Each includes IP, userAgent and (where applicable) userId.

## Audit Dashboard

Prototype UI at `/admin/audit` (requires MODERATOR or ADMIN) with filters (action, userId, entityType), cursor pagination and auto-refresh every 30s.

## Audit Cleanup Script

`scripts/cleanupAudit.ts` deletes audit events older than a set number of days (default 90).

Usage examples:

```
ts-node scripts/cleanupAudit.ts --dry-run
ts-node scripts/cleanupAudit.ts --days 120
```

Integrate into a cron job / scheduler as needed.

# Paladins Palace Marketplace

Marketplace moderat pentru iteme virtuale / bunuri din joc pentru server RAGE:MP. Nu exista plati reale integrate pe site – toate tranzactiile efective se fac in joc / pe serverul RAGE:MP. Inregistrarea este deschisă, dar conturile trebuie aprobate de un moderator înainte de a putea posta / vizualiza anumite date sensibile.

## Functionalitati actuale
- Autentificare & Înregistrare (fără cod invitație)
- Workflow aprobare utilizatori (pending -> approved)
- Roluri: user, moderator, admin
- Dashboard moderator: aprobare / suspendare utilizatori
- Postare anunțuri (titlu, descriere, imagini, categorie, preț opțional)
- Listare anunțuri tip card + pagină detaliu cu expunere condițională telefon (doar pentru utilizatori APPROVED)
- Editare / ștergere anunț (proprietar sau moderator/admin)
- Profil utilizator cu avatar (upload + rate limiting, curățare avatar vechi)
- Upload imagini anunț cu generare thumbnail (WebP 400px) + validare MIME prin magic numbers
- Rate limiting persistent (Redis, fallback memorie) pentru upload-uri
- Headere securitate: CSP, Referrer-Policy, X-Content-Type-Options, etc.

## Functionalitati planificate
- Filtrare / căutare avansată
- Paginare & sortare
- Procesare imagini suplimentară (blurhash / placeholder)
- Logare audit & monitorizare
- Persistență fișiere în obiect storage extern

## Tehnologii
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + SQLite (dev) – ulterior Postgres/MySQL
- NextAuth (Credentials + JWT) pentru sesiuni
- Zod pentru validări (parțial – se poate extinde)
- Sharp pentru thumbnails
- Redis (ioredis) pentru rate limiting (opțional)

## Setup initial
1. Copiaza `.env.example` in `.env` si ajusteaza variabilele
2. Instaleaza dependintele:
```bash
npm install
```
3. Genereaza clientul Prisma & ruleaza migratii:
```bash
npx prisma migrate dev --name init
```
4. Ruleaza seed (creeaza un moderator):
```bash
npm run seed
```
5. Porneste serverul de dezvoltare:
```bash
npm run dev
```

Moderator default: email `moderator@local.test`, parola `moderat0r!`

## Upload imagini
- Avatar max 2MB, tipuri: PNG / JPEG / WebP
- Anunț imagine originală max 3MB (PNG / JPEG / WebP)
- Thumbnail WebP (max width 400px) generat automat
- Validare magic number (nu doar extensia)
- Rate limit: avatar 5 / 10min, anunț imagini 15 / 10min / user
- Model imagini: `imagesJson` = `[ { original, thumb, mime?, width?, height? } ]`

## Paginare & căutare
Endpoint: `GET /api/listings` parametri:
- `limit` (1-50, default 20)
- `cursor` (id anunt pentru pagina următoare)
- `q` (search în titlu+descriere, case-insensitive)
- `category` (filtru exact)
Răspuns: `{ items: ListingCard[], nextCursor }`

## Securitate
- CSP (opțional strict) & headere defensive
- Referrer-Policy: strict-origin-when-cross-origin
- X-Content-Type-Options: nosniff
- Permissions-Policy minimă
- Curățare avatar vechi la upload nou
- Mod CSP strict: `CSP_STRICT=1`

## Audit logging
Model: `AuditEvent` (userId?, action, entityType?, entityId?, ip?, userAgent?, metadata, createdAt)
- Acțiuni curente: `LISTING_CREATE`, `LISTING_UPDATE`, `LISTING_DELETE`, `PROFILE_UPDATE`
- Endpoint: `GET /api/audit` (numai MODERATOR/ADMIN)
	- Parametri: `limit` (1-100), `cursor`, `action`, `userId`, `entityType`
	- Răspuns: `{ items: AuditEvent[], nextCursor }`
- Stocare metadata limitată (~4KB) JSON serializat
- Extensibil: poți adăuga login success/fail, moderation actions

## Variabile de mediu
Vezi `.env.example` – include opțional `REDIS_URL`.

`CSP_STRICT=1` (opțional) – activează CSP fără `unsafe-inline`.

### Discord OAuth
Pentru a permite legarea conturilor Discord (obligatorie pentru a posta anunțuri):
- Creează o aplicație pe https://discord.com/developers și obține `Client ID` și `Client Secret`.
- Setează în `.env` variabilele `DISCORD_CLIENT_ID` și `DISCORD_CLIENT_SECRET`.
- URL de redirect implicit: `http://localhost:3000/api/auth/callback/discord` (adaptează portul dacă folosești 3002).
- Utilizatorii se loghează normal (email/parolă), apoi merg la pagina Profil și apasă „Leaga Discord” pentru a asocia contul.
- După asociere, câmpul `discordTag` se setează automat. Endpoint-ul de creare anunț refuză dacă contul nu are Discord legat.

## Roadmap scurt (actualizat)
- Dashboard audit UI (filtre + export)
- Mutare fișiere în storage extern (S3 / R2)
- Login audit (succes/eșec) + rate limit autentificare
- CSP non-inline (eliminare unsafe-inline definitiv)
- Validări Zod complete și răspunsuri de eroare standardizate

## Mentenață imagini
Curățare imagini orfane (dry-run implicit):
```bash
npm run images:cleanup
```
Ștergere efectivă:
```bash
npm run images:cleanup -- --apply
```

## Licenta
Proiect intern – defineste ulterior licenta dorita.

## Unelte Moderator
- Aprobări în așteptare: `/dashboard`
- Lista completă utilizatori cu ultimile 3 luni de anunțuri: `/dashboard/users` (fără email/parolă; include stare cont, rol, Discord legat, profil IC, anunțuri recente)
