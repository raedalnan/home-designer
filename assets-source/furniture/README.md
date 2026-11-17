# Original Blender replacement collection

Style: stylized Sims-like realism. All 480 names in `requested-items.json` now have individual Draco GLBs and colored thumbnails rendered from their geometry. See `coverage.json` for generated coverage and byte counts.

Models use original scripted modular geometry, including panels, piping, cushions, hardware and frames. Related designs share construction methods. These are optimized stylized assets, not photorealistic product replicas. No EA/The Sims meshes, downloaded textures or product photographs are included.

## Regeneration

Run these scripts in order in Blender's Python console. Each saves its own source scene here:

1. `scripts/build_seating_collection.py` — entries 1–27.
2. `scripts/build_household_collection.py` — entries 28–83.
3. `scripts/build_storage_decor.py` — entries 84–156.
4. `scripts/build_lighting_nature.py` — entries 157–261.
5. `scripts/build_equipment_collection.py` — entries 262–380.
6. `scripts/build_outdoor_architecture.py` — entries 381–480.
7. `scripts/finish_catalog_assets.py` — final skylight orientation and 192 px thumbnails.

Example:

```python
exec(compile(open(r'C:\Users\alnan\Desktop\projects\home designer\scripts\build_seating_collection.py').read(), 'build_seating_collection.py', 'exec'))
```

Then run from the repository root:

```bash
node scripts/assemble_catalog.mjs
node --test tests/*.test.js
npm run build
```

Assembly checks names, exports, thumbnails and transformed model bounds, then writes the runtime registry. Production exports live in `public/furniture-v2`; thumbnails live in `public/thumbnails`. Source scenes stay outside `public`. Scripts use the local project path; adjust it if moving the checkout.

## Runtime and scope

Only the new collection appears in the furniture browser. Legacy renderers remain for saved designs. Models load on demand; thumbnails use lazy image loading and batches of 24 cards. Finish overrides belong to individual instances. Sofa and bed size presets use authored variants; most other entries have one measured size.

Floor, wall, ceiling, window-treatment and parent-surface placements use separate anchors. Doors/windows route through the existing wall-opening system; animated door rigs are retained for working open/close controls. Architectural and appliance entries are visual models, not building simulation or appliance gameplay.

## Design references

General proportions and furniture types were informed by these references; brand meshes were not copied:

- [IKEA sectionals](https://www.ikea.com/us/en/cat/fabric-sectionals-10671/)
- [IKEA armchairs](https://www.ikea.com/us/en/cat/armchairs-chaises-fu006/)
- [Herman Miller Aeron specifications](https://www.hermanmiller.com/products/seating/office-chairs/aeron-chair/specs/)

GLBs total 8,520,104 bytes; 480 rendered thumbnails total 11,953,871 bytes. The full collection is not downloaded on initial load.
