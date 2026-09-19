# VTHacks14 Project

Our project for VTHacks 14!

## Team

- Deetya Vadigepalli
- Kruthi Sudigali
- Saanvi Movva
- Sindhu Gangireddy

## ChatOne website

A patient dashboard displaying demographics, conditions, and medications from the OpenEMR export. The interface uses the approved Tidal Contrast design: dark blue patient rows, neutral record labels, and decorative clinical symbols.

### Run locally

```sh
npm install
npm run dev
```

### Validate and build

```sh
npx tsc --noEmit
npm run build
```

The website source is in `src/`, static assets are in `public/`, and `vite.config.ts` configures the TanStack Start application. The frontend reads `vthacks-openemr/patients.json` directly through `src/data/patient-api.ts`. It validates the export and displays only the supplied demographics, conditions, and medications. The queue retains the order in the export because no clinical priority is supplied. The patient detail page also offers a clearly labeled illustrative workspace with fictional observations and encounters from `src/data/illustrative-patient-data.ts`. These fixtures are separate from OpenEMR records and can be hidden with the demo-data toggle. The charts do not provide clinical interpretations; the local checklist does not update OpenEMR. Clinical matches and audio briefings remain unavailable.

### Update the patient data

Run `python vthacks-openemr/fetch_from_db.py` with the configured local OpenEMR database available and its Python dependencies installed. The exporter writes `patients.json` next to the script regardless of your working directory. The app reads this JSON snapshot; it does not connect to the database or poll for live changes. The development server picks up file changes; rebuild and redeploy to update a production build. Dates of birth are displayed exactly as supplied rather than replaced with invented ages.

### Data tests

With Node.js 22.18+ or 24+, run `node --test tests/patient-api.test.ts`.

The approved design is implemented directly in the application; there is no separate preview site.
