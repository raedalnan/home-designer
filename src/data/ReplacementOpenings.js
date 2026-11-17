// Catalog openings route through the existing wall-cutting and animated fixture system.
export function makeOpening(definition){
 const size=definition.sizes[0];const door=/door/i.test(definition.name);const archway=definition.name==='Archway';
 const existing={
  'Single door':['door-single',1,2.1], 'Double door':['door-double',1.8,2.1],
  'Sliding door':['door-sliding',1.8,2.1], 'French door':['door-french',1.8,2.1], 'Glass door':['door-glazed',1,2.1],
 }[definition.name];
 return {id:definition.id,name:definition.name,type:archway?'archway':door?'door':'window',width:existing?.[1]??size.width,height:existing?.[2]??size.height,sillHeight:door||archway?0:.75,color:definition.defaultFinishes.legs??'#b58b62',modelSource:existing?`/openings/${existing[0]}.glb?v=3`:definition.modelSource,thumbnail:existing?`/thumbnails/${existing[0]}.png`:definition.thumbnail};
}
