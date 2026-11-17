import { useState } from 'react';
import { COLOR_PALETTE } from '../data/ColorPalette.js';
export function Palette({value,onChange}) {
  const [family,setFamily]=useState('Essentials');
  const [search,setSearch]=useState('');
  const colors=COLOR_PALETTE.filter((color)=>(search || color.family===family) && `${color.name} ${color.hex}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="finish-browser">
    <input aria-label="Search colors" placeholder="Search color or hex…" value={search} onChange={(event)=>setSearch(event.target.value)} />
    <select aria-label="Color family" value={family} onChange={(event)=>{setFamily(event.target.value);setSearch('');}}>{[...new Set(COLOR_PALETTE.map((color)=>color.family))].map((name)=><option key={name}>{name}</option>)}</select>
    <div className="finish-swatches">{colors.map(({name,hex})=><button key={hex} title={`${name} · ${hex}`} aria-label={name} aria-pressed={value===hex} style={{background:hex}} onClick={()=>onChange(hex)} />)}</div><p>{colors.length} colors · {value}</p>
  </div>;
}
export default function ColorPicker({value,onChange}) {
  const [open,setOpen]=useState(false);
  return <div className="arc-color"><button className="arc-color-trigger" title="Change finish" aria-label="Change opening color" aria-expanded={open} onClick={()=>setOpen(!open)}><i style={{background:value}} /></button>
    {open && <div className="arc-palette"><button className="palette-close" aria-label="Close colors" onClick={()=>setOpen(false)}>×</button><Palette value={value} onChange={onChange}/></div>}
  </div>;
}
