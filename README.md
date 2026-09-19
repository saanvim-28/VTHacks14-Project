# VTHacks14 Project

Our project for VTHacks 14!

## Team
- Deetya Vadigepalli
- Kruthi Sudigali
- Saanvi Movva
- Sindhu Gangireddy


## ChatOne website

A clinical decision-support dashboard with a patient queue, patient details, relevant clinical information, and audio briefing views. The interface uses the approved Tidal Contrast design: dark blue patient rows, neutral priority labels, and decorative clinical symbols.

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

The website source is in `src/`, static assets are in `public/`, and `vite.config.ts` configures the TanStack Start application. The frontend currently uses the demo data in `src/data/mock-api.ts`. The separate `vthacks-openemr/` directory contains the existing patient-data export work.

The approved design is implemented directly in the application; there is no separate preview site.
