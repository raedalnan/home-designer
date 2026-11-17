import {REPLACEMENT_CATALOG} from './ReplacementCatalog.js';
const size=(id,label,width,depth,height)=>({id,label,width,depth,height});
export const FINISHES={
 fabric:[['Ivory','#e8e2d9'],['Sand','#c6b49e'],['Charcoal','#41464b'],['Olive','#72795b'],['Navy','#33445e'],['Terracotta','#af705a'],['Rose','#c79898']],
 wood:[['Oak','#c9a36b'],['Walnut','#765137'],['Dark walnut','#483527'],['Whitewashed','#ded6c5'],['Black wood','#292a28']],
 metal:[['Black','#25282b'],['Steel','#a4adb3'],['Brass','#b49a55'],['Bronze','#7e6045'],['White','#eeece5']],
 ceramic:[['White','#f4f0e7'],['Stone','#a6a49e'],['Terracotta','#b7765d'],['Sage','#9da98f']],
};
const LEGACY_STUDIO_DEFINITIONS=[
 {id:'studio-sofa',name:'Studio Sofa',category:'Living',family:'sofa',parts:{fabric:'fabric',legs:'wood'},sizes:[size('compact','Compact · 160 cm',1.6,.85,.85),size('standard','Standard · 200 cm',2,.9,.85),size('large','Large · 240 cm',2.4,.95,.85)]},
 {id:'studio-bed',name:'Studio Bed',category:'Bedroom',family:'bed',parts:{frame:'wood',bedding:'fabric'},sizes:[size('single','Single · 90 × 200 cm',.9,2,.95),size('double','Double · 140 × 200 cm',1.4,2,.95),size('queen','Queen · 160 × 200 cm',1.6,2,.95),size('king','King · 180 × 200 cm',1.8,2,.95)]},
 {id:'studio-table',name:'Studio Dining Table',category:'Dining',family:'table',parts:{top:'wood',legs:'metal'},sizes:[size('two','2 people',.8,.8,.75),size('four','4 people',1.2,.8,.75),size('six','6 people',1.8,.9,.75)]},
 {id:'studio-cabinet',name:'Studio Cabinet',category:'Storage',family:'cabinet',parts:{body:'wood',handles:'metal'},sizes:[size('compact','Compact',.8,.45,.9),size('wide','Wide',1.2,.45,.9)]},
 {id:'studio-lamp',name:'Studio Floor Lamp',category:'Lighting',family:'lamp',parts:{shade:'fabric',stand:'metal'},sizes:[size('standard','Standard · 150 cm',.4,.4,1.5),size('tall','Tall · 180 cm',.45,.45,1.8)]},
 {id:'studio-plant',name:'Studio Indoor Plant',category:'Plants',family:'plant',parts:{pot:'ceramic'},sizes:[size('small','Small',.35,.35,.6),size('medium','Medium',.5,.5,1),size('tall','Tall',.7,.7,1.5)]},
].map((definition)=>({...definition,placementType:'floor',defaultSizeId:definition.sizes[0].id,modelSource:'procedural:studio'}));
export const FURNITURE_REGISTRY=REPLACEMENT_CATALOG;
const definitions=new Map([...LEGACY_STUDIO_DEFINITIONS,...FURNITURE_REGISTRY].map((definition)=>[definition.id,definition]));
export const definitionOf=(instance)=>definitions.get(instance.definitionId??instance.id);
export function configureInstance(definition,sizeId,base={}) {
 const preset=definition.sizes.find((entry)=>entry.id===sizeId)??definition.sizes[0];
 return {...base,definitionId:definition.id,name:definition.name,sizeId:preset.id,w:Math.ceil(preset.width/.5),d:Math.ceil(preset.depth/.5),height:preset.height,mountDepth:preset.depth/2,placementType:definition.placementType,collisionLayer:definition.collisionLayer??'solid',finishes:base.finishes??{...Object.fromEntries(Object.entries(definition.parts).map(([part,group])=>[part,FINISHES[group][0][1]])),...definition.defaultFinishes},source:preset.modelSource??definition.modelSource};
}
