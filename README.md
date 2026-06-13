# AI Jasa Konsultan Rumah

Konsultan pra-desain rumah untuk calon pemilik rumah awam di Indonesia. Ubah input
sederhana (ukuran tanah, jumlah kamar, budget, gaya) menjadi paket diskusi yang bisa
dibawa ke tukang, kontraktor, atau arsitek.

A pre-design home consultant for first-time homebuilders in Indonesia. It turns a simple
brief (lot size, rooms, budget, style) into a feasibility report, two conceptual floor
plans, AI-generated exterior concepts, and a downloadable PDF brief.

> **Bukan gambar kerja.** Output adalah konsep awal untuk diskusi, bukan DED / gambar
> siap bangun. Wajib direview arsitek, insinyur sipil, atau kontraktor sebelum dibangun.

## What it does

1. **Requirement form** → a validated `DesignBrief`.
2. **Feasibility check** (pure, deterministic) → budget sanity + warnings/tradeoffs
   (building-too-big, budget-below-minimum, rooms-too-dense, wet-area grouping, tight
   circulation).
3. **Two conceptual floor plans** → template-based band packing, guaranteed non-overlapping
   and in-bounds, rendered as SVG.
4. **AI visuals** (optional) → front elevation + 3D exterior via OpenAI `gpt-image-2`,
   behind hard spend caps.
5. **PDF brief** → 5 pages with a disclaimer on every page, plus questions to ask a tukang.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · Zod · Drizzle +
better-sqlite3 · @react-pdf/renderer · OpenAI SDK.

The thin MVP (form → feasibility → plans → PDF) uses **zero AI** and is fully deterministic.
AI enters only for the optional exterior visuals.

## Getting started

```bash
npm install
cp .env.example .env          # then add your OPENAI_API_KEY
npm run dev                    # http://localhost:3000
```

Floor plans and the PDF work without any API key. Image generation needs `OPENAI_API_KEY`.

## Environment

See `.env.example`. Key variables:

| Var | Default | Purpose |
|-----|---------|---------|
| `OPENAI_API_KEY` | — | Required for image generation (server-side only). |
| `GIL_IMAGE_MODEL` | `gpt-image-2` | OpenAI image model. |
| `GIL_IMAGE_QUALITY` | `low` | `low` / `medium` / `high`. |
| `GIL_IMAGE_COST_IDR` | `1500` | Per-image cost estimate — **validate against real pricing**. |
| `GIL_MAX_IMAGES_PER_PROJECT` | `6` | Per-project image cap. |
| `GIL_MAX_REGEN_PER_VIEW` | `3` | Regenerations per view type. |
| `GIL_DAILY_SPEND_CAP_IDR` | `100000` | Hard daily spend ceiling across all projects. |

The OpenAI key is read only in server route handlers and never reaches the browser.

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build (typechecks)
npm test         # vitest suite (feasibility, layout invariants, cost guard, image, pdf)
```

## Architecture

```
brief ─► feasibility (pure) ─► 2 layouts (pure) ─► SVG / PDF
                                                      └─► optional gpt-image-2 visual (cost-guarded)
```

- `lib/` — deterministic core (schemas, feasibility, layout, render, pdf) + the visual
  pipeline (prompt, cost-guard, image, image-store).
- `app/` — form, review screen, and API routes.
- SQLite is the source of truth; every paid image generation is logged to a ledger that
  the cost guard reads before allowing the next call.

## Status

- ✅ Thin MVP (form → feasibility → plans → PDF)
- ✅ Visual MVP (gpt-image-2 elevations + cost controls)
- ⏳ Stage 4 (natural-language revisions, regenerate history)
- ⏳ Access control for deployment

Before building further, the plan is to validate the brief output with real first-time
homebuilders.
