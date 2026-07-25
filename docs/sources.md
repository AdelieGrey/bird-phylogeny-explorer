# Sources And Data Notes

This project combines a local source-data pipeline with a generated static website. The raw third-party datasets are kept outside Git tracking unless their publication terms are reviewed.

## Primary Taxonomy

- AviList Core Team. 2026. AviList: The Global Avian Checklist, v2025b. https://doi.org/10.2173/avilist.v2025b

AviList is the current primary taxonomy backbone for order, family, genus, and species records. AviList sequence values are used to order imported nodes.

## Comparison And Name Sources

- eBird/Clements v2025 integrated checklist, October 2025. Used as a comparison and matching source where relevant.
- 中国观鸟年报-中国鸟类名录 12.0 (2024). Used for China checklist tags, Chinese species names, and Chinese family-name matching when aligned to AviList.
- `birdMapV2.js` by wzy0421. Used as a prototype Chinese species-name mapping source.

## Reviewed Local Tables

Reviewed and generated tables are stored in `data/processed/`.

Important current table:

- `cbr-genera-official-chinese-names-final-reviewed.csv`: reviewed Chinese genus-name overrides for genera represented in the China checklist.

Generated reports include:

- `china-checklist-avilist-match-report.csv`
- `china-family-name-avilist-match-report.csv`
- `cbr-genera-needing-official-chinese-names.csv`

## Manual Phylogeny Layer

The app includes manually curated higher clades for learning and navigation, including:

- Neoaves
- Strisores
- Elementaves
- Gruae
- Cursorimorphae
- Phaethoquornithes
- Phaethontimorphae
- Telluraves
- Afroaves
- Australaves

This layer is intended as a reviewed learning scaffold, not a replacement for a full published phylogenetic tree.

## Logo

- `app/assets/wagtail-logo.png`
- `app/assets/wagtail-icon.png`

These are user-provided White Wagtail logo assets processed for transparent-background web use.

## Publication Caution

Before making the repository public, review the redistribution terms for all raw and generated data. The current `.gitignore` excludes raw third-party source files from Git tracking.
