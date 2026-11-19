const LEGACY_NODES={'Linen sofa':'Three-seaterSofa03','Oak lounge chair':'SofaChair01','Round coffee table':'TVStand01','Platform bed':'doubleBed01','Arc floor lamp':'lamp01','Walnut sideboard':'SmallCabinet01'};
export function readLayout(storage) {
 const raw=storage.getItem('home-designer-layout');
 if(!raw)return null;
 let saved;try{saved=JSON.parse(raw);}catch{return null;}
 if(!Array.isArray(saved?.objects)||!Number.isInteger(saved?.roomSize?.width)||!Number.isInteger(saved?.roomSize?.depth))return null;
 // A storage quota failure must not turn a valid design into a demo layout.
 try{if(!storage.getItem('home-designer-layout-before-studio'))storage.setItem('home-designer-layout-before-studio',raw);}catch{/* Original layout remains readable. */}
 return {...saved,objects:saved.objects.map((object)=>({...object,node:object.node??LEGACY_NODES[object.name],source:object.source??'/furniture.glb'}))};
}
import { configureInstance, definitionOf } from '../data/FurnitureRegistry.js';

const DESIGN_LIBRARY_KEY = 'home-designer-designs-v1';

function refreshTableDimensions(layout) {
  return {
    ...layout,
    objects: layout.objects.map((object) => {
      const definition = definitionOf(object);
      if (!definition?.correctedTabletop) return object;
      const { w, d, height, mountDepth } = configureInstance(definition, object.sizeId, object);
      return { ...object, w, d, height, mountDepth };
    }),
  };
}

export function createDesign(name, layout) {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return { id, name, layout };
}

export function readDesignLibrary(storage, starterLayout) {
  try {
    const library = JSON.parse(storage.getItem(DESIGN_LIBRARY_KEY));
    if (Array.isArray(library?.designs) && library.designs.some((design) => design.id === library.activeId)) {
      return {
        ...library,
        designs: library.designs.map((design) => ({ ...design, layout: refreshTableDimensions(design.layout) })),
      };
    }
  } catch { /* Try the legacy layout if the library is unavailable. */ }

  let legacy;
  let wallFinishes = {};
  try { legacy = readLayout(storage); } catch { /* Use the starter layout. */ }
  try { wallFinishes = JSON.parse(storage.getItem('home-designer-wall-finishes')) ?? {}; } catch { /* Use default finishes. */ }
  const design = createDesign(legacy ? 'My first design' : 'Starter design',
    legacy ? refreshTableDimensions({ ...legacy, wallFinishes: legacy.wallFinishes ?? wallFinishes }) : starterLayout);
  return { activeId: design.id, designs: [design] };
}

export function writeDesignLibrary(storage, library) {
  storage.setItem(DESIGN_LIBRARY_KEY, JSON.stringify(library));
}
