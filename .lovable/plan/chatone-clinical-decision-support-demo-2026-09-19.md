# ChatOne clinical decision-support demo

## Goal
Build a polished desktop-first clinical dashboard called **ChatOne** for the “Less Doctor Work” concept, with realistic API-shaped mock data and a fast four-screen review flow.

## Build sequence
1. **Mock data layer**
   - Define the exact patient, observation, encounter, change, pharma match, and briefing data shapes.
   - Seed exactly three patients: HIGH, MEDIUM, and LOW priority.
   - Expose asynchronous `getPatients`, `getPatientById`, `getMatchesForPatient`, and `getBriefingForPatient` functions with a short simulated delay.
   - Keep all route components free of inline domain data so a backend can replace only this layer later.

2. **Shared clinical shell and design system**
   - Create a calm blue/teal clinical palette with status-only red, amber, and green.
   - Add a persistent sidebar for the Priority Queue and Saved items, tablet-friendly navigation, consistent typography, cards, tags, tables, timeline, skeletons, empty states, and error states.
   - Add route-specific metadata for every screen.

3. **Dashboard**
   - Show the AI Priority Queue ordered HIGH → MEDIUM → LOW with all requested patient context.
   - Add a clearly labeled demo control that simulates incoming patient data.
   - Animate the affected card smoothly as it rises through the queue, with a visible updated priority and timestamp.

4. **Patient detail**
   - Add patient header and priority badge, conditions, medications, observation comparison, event timeline, and the prominent “WHAT CHANGED?” summary.
   - Link directly to relevant information for the selected patient.

5. **Relevant information**
   - Show 3–5 realistic matches per patient with distinct relevance styling, expandable reasons, save toggles, and briefing navigation.
   - Keep saved state available across navigation during the demo session.

6. **Briefing**
   - Build a focused 60-second briefing page with a polished disabled/demo audio player when the URL is null, progress and time display, accessible transcript, save, and source actions.

7. **Validation**
   - Verify the full Dashboard → Patient → Relevant Information → Briefing flow on desktop and tablet widths.
   - Confirm loading, empty/error handling, priority consistency, saved-state behavior, and reorder animation.

## Technical details
- Use TanStack Start file routes and route loaders backed by TanStack Query for realistic asynchronous loading and cache-warmed navigation.
- Use Motion for the queue layout transition if already available; otherwise use a lightweight CSS/FLIP-style transition without adding unnecessary infrastructure.
- Use React context for demo-only saved items and simulated queue state; no backend, authentication, or SMS functionality.
- Use semantic design tokens in the global stylesheet and existing button conventions.
