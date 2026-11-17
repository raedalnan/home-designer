const BASE_COLORS = [
  ['Chalk','#f2efe9'], ['Ivory','#e8e2d9'], ['Sand','#d9d0c3'], ['Oak','#c9a36b'],
  ['Walnut','#6b4a34'], ['Terracotta','#b77560'], ['Rose','#d8b7b3'], ['Ochre','#c6a04b'],
  ['Sage','#a8b8a0'], ['Forest','#405b4b'], ['Teal','#387b80'], ['Sky','#a9c6d7'],
  ['Slate','#64748b'], ['Navy','#283c55'], ['Lavender','#b9aecb'], ['Charcoal','#303842'],
  ['White','#ffffff'], ['Stone','#b8b2aa'], ['Graphite','#475569'], ['Black','#181c20'],
].map(([name,hex]) => ({name,hex}));
const families = [['Warm neutrals',30,18],['Cool neutrals',215,12],['Reds',0,45],['Oranges',24,48],['Yellows',48,48],['Greens',110,28],['Teals',175,35],['Blues',210,40],['Purples',270,32],['Pinks',330,35]];
function hexFromHsl(h,s,l) {
  s/=100;l/=100;const a=s*Math.min(l,1-l);
  const f=(n)=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0');};
  return `#${f(0)}${f(8)}${f(4)}`;
}
export const COLOR_PALETTE = [...BASE_COLORS.map((color)=>({...color,family:'Essentials'})),...families.flatMap(([family,h,s])=>[95,88,78,68,58,48,38,28,18,10].map((l,index)=>({name:`${family} ${index+1}`,hex:hexFromHsl(h,s,l),family})))];
