# Goel Brothers OrderFlow

Production-style full-stack implementation of the Goel Brothers dealer ordering and Head Office approval portal described in the March 2026 developer brief.

## Stack

- `React + TypeScript + Vite`
- `React Router DOM`
- `Axios`
- `Zod`
- `MUI`
- `react-hot-toast`
- `Express + TypeScript`
- `JSON file persistence with seeded data`

## What is included

- Dealer login, mobile-first SKU catalogue, cart flow, order submission, and order history
- Separate Head Office login, dashboard, approval queue, rejection flow, and instant CSV export
- Dealer master and SKU master management
- Role-based authentication and protected routes
- Seeded local data for realistic demo use
- ERP CSV generation based on the field structure available in the brief

## Local run

```bash
npm install --legacy-peer-deps --cache /tmp/gb-orderflow-npm-cache
npm run dev
```

Frontend: `http://localhost:5173`

API: `http://localhost:4000`

## Production build

```bash
npm run build
npm start
```

The production server serves the built frontend from `dist/` and the API from the same Express process.

## Demo credentials

Head Office:

- Username: `admin`
- Password: `GB@2026!`

Dealers:

- Dealer code: `GB-D001`
- Dealer code: `GB-D014`
- Dealer code: `GB-D032`
- Password for active dealers: `dealer123`

## Data storage

- Runtime data is stored in `server/storage/db.json`
- The file is auto-seeded on first run
- Delete that file if you want to reset the local environment back to the seed state

## Important implementation note

The exact PantherTech ERP Import Sales Bill column specification was not included in the PDF itself. The current CSV export uses the fields explicitly listed in the brief:

- `PARTY_CODE`
- `ORDER_DATE`
- `SERIES`
- `ITEM_CODE`
- `QTY`
- `RATE`
- `DISC_PCT`
- `NET_AMOUNT`

When the final ERP import layout is provided, update the exporter in `server/csv.ts` and, if needed, the order payload mapping in `server/routes.ts`.

