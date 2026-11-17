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
