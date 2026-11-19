import { useState } from 'react';
import { COLOR_PALETTE } from '../data/ColorPalette.js';

const families = [...new Set(COLOR_PALETTE.map((color) => color.family))];

export function Palette({ value, onChange, presets, label }) {
  const presetColors = presets?.map(([name, hex]) => ({ name, hex, family: 'Material finishes' })) ?? [];
  const allColors = [...presetColors, ...COLOR_PALETTE];
  const [family, setFamily] = useState(() => allColors.find((color) => color.hex === value)?.family
    ?? (presetColors.length ? 'Material finishes' : 'Essentials'));
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const colors = allColors.filter((color) => query
    ? `${color.name} ${color.hex}`.toLowerCase().includes(query)
    : color.family === family);
  const accessibleLabel = (name) => label ? `${label}: ${name}` : name;

  return <div className="finish-browser">
    <select aria-label={accessibleLabel('Color category')} value={family} onChange={(event) => {
      setFamily(event.target.value);
      setSearch('');
    }}>
      {presetColors.length > 0 && <option>Material finishes</option>}
      {families.map((name) => <option key={name}>{name}</option>)}
    </select>
    <input type="search" aria-label={accessibleLabel('Search colors')} placeholder="Search colors or hex…"
      value={search} onChange={(event) => setSearch(event.target.value)} />
    <div className="finish-swatches">
      {colors.map(({ name, hex, family: colorFamily }) => (
        <button type="button" key={`${colorFamily}:${name}`} title={`${name} · ${hex}`} aria-label={accessibleLabel(name)}
          aria-pressed={value === hex} style={{ backgroundColor: hex }} onClick={() => onChange(hex)} />
      ))}
    </div>
    <p>{colors.length} colors{value && ` · ${value}`}</p>
  </div>;
}
