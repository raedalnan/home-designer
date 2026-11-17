# Furniture system

Checkpoint before implementation: `4d5f441`.

## Architecture

`ReplacementCatalog.js` is generated from Blender manifests and contains all 480 requested entries across 18 categories. `FurnitureRegistry.js` exposes the collection for browsing while retaining lookup compatibility for earlier Studio families. Legacy GLB instances use their existing renderer. New rooms start with the new Double bed; existing rooms retain their original objects.

`BlenderFurniture.jsx` loads individual Draco GLBs through Drei's cached loader. Instance materials are cloned before applying finish overrides; geometry remains shared. Content versions invalidate stale model caches. Glass uses physical transmission and bulbs use emissive materials without additional shadow-casting lights.

The catalog uses colored PNG renders, search, category filtering and batches of 24 cards. Thumbnails do not mount live 3D scenes. Source scenes remain outside production assets. See `assets-source/furniture/README.md` for generation steps.

## Instances and persistence

Definitions describe sizes, placement type, finishes, source and thumbnail. Instances store `definitionId`, `sizeId`, finishes, transforms and attachment anchors. Sofa and bed variants use authored meshes rather than stretching details. Most other entries have one size.

`LayoutPersistence.js` preserves unknown metadata and attempts a once-only backup under `home-designer-layout-before-studio`. Backup quota failures do not discard valid layouts. The existing storage key remains compatible. Legacy objects are not automatically converted.

`FurnitureCommands.js` validates size changes against rotated bounds, room limits, objects, walls and attached decorations. Failed changes preserve the previous object.

## Placement and limitations

Floor movement and occupancy use three subdivisions per original 0.5 m cell (approximately 16.7 cm steps); rugs allow furniture overlap. Persisted room dimensions, object footprints and wall coordinates remain in their original units, so saved rooms and model sizes stay unchanged. `Attachments.js` resolves wall, ceiling, window-treatment and parent-surface anchors. Decorations follow parent transforms. Wall items expose mounting-height controls; treatments select an existing opening. Deleting or invalidating supports also removes dependents.

Support placement uses measured bounds and compatible furniture, not arbitrary mesh surface analysis. General height-aware collision solving between every mounted decoration is not implemented. Architectural and appliance models are decorative; stairs do not introduce multiple floors. Animated doors and wall cuts remain in the existing opening system.

## Verification and performance

Run `node --test tests/*.test.js` and `npm run build`. Tests cover the 480-item inventory, assets/thumbnails, instance definitions, independent finishes, blocked resizing, saved metadata and attachment transforms.

Asset totals: 480 GLBs, 8,520,104 bytes; 480 thumbnails, 11,953,871 bytes. Meshes load only when placed. Catalog metadata remains in the application bundle.

Pre-change build: JS 1,271,146 bytes raw / 361,471 gzip; CSS 32,096 / 6,857 gzip. Legacy furniture pack: 2,099,476 bytes. Replacement build: approximately 1.51 MB raw / 388 kB gzip JS and 33 kB CSS. Compressed JS increases about 7.4%; a new room no longer requires the legacy furniture pack.

Desktop production samples: default new bed approximately 60 FPS, 31 calls, 1,438 triangles, 24 geometries, 3 textures, 18 MB browser heap and 985 kB reported transfer. Bed plus resized/recolored sofa approximately 60 FPS, 37 calls, 6,466 triangles, 35 geometries, 3 textures and 16 MB heap. These short samples are not controlled device benchmarks or dense-scene guarantees.

Append `?benchmark` for sampled FPS, renderer calls/triangles, cached geometry/textures, supported browser heap and reported resource transfer. Heap is not GPU memory; transfers depend on caching and resource-timing permissions. Compare production builds at fixed viewport and DPR.

Controlled dense-room, physical mobile-device, GPU memory and throttled cold-network comparisons remain outstanding. The old app has no measured runtime baseline, so an exact FPS or loading-time regression comparison cannot be claimed.
