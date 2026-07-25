# Local Raw Data

Put local source files here before rebuilding `app/bird-data.js`.

These files are not committed because they are third-party datasets or large working sources:

- `AviList-v2025b-10Jun2026-extended.xlsx`
- `eBird-Clements_v2025-integrated-checklist-October-2025.csv`
- `birdMapV2.js`
- `中国观鸟年报-中国鸟类名录_v12.0.xls`

Run this from the project root after placing the files:

```bash
python3 scripts/build_bird_data.py
```
