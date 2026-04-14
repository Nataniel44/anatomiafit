# AGENTS.md

## Project

Astro + React + Tailwind CSS v4 web app for interactive muscle/fitness guidance with PocketBase backend.

## Commands

- `npm run dev` - Start dev server at http://localhost:4321
- `npm run build` - Build to `./dist/`
- `npm run preview` - Preview built site locally

## Setup

- Node >=22.12.0 required (check `engines` in package.json)
- Run `npm install` after pulling

## Architecture

- **Pages**: `src/pages/*.astro` - Routes defined by filename (Astro convention)
- **Components**: `src/components/` - Mixed Astro (`.astro`) and React (`.tsx`)
- **Data**: `src/data/` - JSON files + TypeScript exports
- **Lib**: `src/lib/pb.ts` - PocketBase client instance
- **Layout**: `src/layouts/Layout.astro` - Base HTML wrapper with BottomNav

## Data Scripts

- `node check_order.cjs` - Validate exercise data ordering
- `node merge_names.cjs` - Merge English names from `inglesdata.json` into `exercises_raw.json`

## TypeScript

Uses Astro's strict TS config. JSX configured for React with `jsxImportSource: "react"`.