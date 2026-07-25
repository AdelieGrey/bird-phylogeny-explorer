# Bird Phylogeny Explorer

Bird Phylogeny Explorer / 鸟类谱系速查器 is a static web prototype for browsing bird taxonomy and high-level phylogenetic relationships with Chinese, English, and scientific names.

The first version focuses on:

- searching bird species, genera, families, orders, and selected higher clades
- showing lineage paths from Aves down to species
- prioritizing China checklist species names from 中国观鸟年报
- displaying reviewed Chinese genus and family names where available
- highlighting manually curated higher clades such as Strisores, Elementaves, Gruae, Phaethoquornithes, Telluraves, Afroaves, and Australaves

## Website

The web app lives in `app/`.

To preview locally:

```bash
python3 -m http.server 8787 --directory app
```

Then open:

```text
http://127.0.0.1:8787/
```

## Project Layout

```text
app/                  Static website files
app/bird-data.js      Generated data used by the browser
scripts/              Data build scripts
data/raw/             Local-only source files, not committed
data/processed/       Reviewed tables and generated review reports
docs/                 Notes about sources and modeling decisions
```

## Rebuild Data

The generated browser data is built from local raw files plus reviewed processed tables.

From the project root:

```bash
python3 scripts/build_bird_data.py
```

This rewrites:

```text
app/bird-data.js
```

It also refreshes review reports in:

```text
data/processed/
```

## Raw Data

Large third-party source files are intentionally not committed to this repository. Put them in `data/raw/` locally before rebuilding.

Expected local files:

- `AviList-v2025b-10Jun2026-extended.xlsx`
- `eBird-Clements_v2025-integrated-checklist-October-2025.csv`
- `birdMapV2.js`
- `中国观鸟年报-中国鸟类名录_v12.0.xls`

See `docs/sources.md` for source notes.

## Deployment

This repository includes a GitHub Pages workflow that publishes the `app/` directory.

After pushing to GitHub, enable Pages in the repository settings:

```text
Settings -> Pages -> Build and deployment -> Source: GitHub Actions
```

Then future pushes to `main` will publish the latest static site.

## License

No open-source license has been selected yet. Treat the code, curated data, and generated data as not licensed for reuse until a license and data-publication policy are chosen.
