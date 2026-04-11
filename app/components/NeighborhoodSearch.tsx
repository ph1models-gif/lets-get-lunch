'use client';
import { useState, useRef, useEffect } from 'react';

const NEIGHBORHOODS: Record<string, {borough: string, lat: number, lng: number}> = {
  "Midtown": {borough:"Manhattan",lat:40.7549,lng:-73.9840},
  "Upper East Side": {borough:"Manhattan",lat:40.7736,lng:-73.9566},
  "Upper West Side": {borough:"Manhattan",lat:40.7870,lng:-73.9754},
  "Chelsea": {borough:"Manhattan",lat:40.7465,lng:-74.0014},
  "West Village": {borough:"Manhattan",lat:40.7334,lng:-74.0027},
  "Greenwich Village": {borough:"Manhattan",lat:40.7335,lng:-73.9990},
  "SoHo": {borough:"Manhattan",lat:40.7233,lng:-74.0030},
  "NoHo": {borough:"Manhattan",lat:40.7277,lng:-73.9925},
  "Tribeca": {borough:"Manhattan",lat:40.7163,lng:-74.0086},
  "Financial District": {borough:"Manhattan",lat:40.7074,lng:-74.0113},
  "Lower East Side": {borough:"Manhattan",lat:40.7153,lng:-73.9840},
  "East Village": {borough:"Manhattan",lat:40.7265,lng:-73.9815},
  "Gramercy Park": {borough:"Manhattan",lat:40.7382,lng:-73.9822},
  "Murray Hill": {borough:"Manhattan",lat:40.7484,lng:-73.9767},
  "Harlem": {borough:"Manhattan",lat:40.8116,lng:-73.9465},
  "Hell's Kitchen": {borough:"Manhattan",lat:40.7638,lng:-73.9918},
  "Chinatown": {borough:"Manhattan",lat:40.7157,lng:-73.9970},
  "Battery Park City": {borough:"Manhattan",lat:40.7115,lng:-74.0155},
  "Union Square": {borough:"Manhattan",lat:40.7359,lng:-73.9906},
  "Midtown East": {borough:"Manhattan",lat:40.7527,lng:-73.9772},
  "Midtown West": {borough:"Manhattan",lat:40.7614,lng:-73.9816},
  "Lenox Hill": {borough:"Manhattan",lat:40.7677,lng:-73.9592},
  "Yorkville": {borough:"Manhattan",lat:40.7762,lng:-73.9493},
  "Washington Heights": {borough:"Manhattan",lat:40.8417,lng:-73.9394},
  "Inwood": {borough:"Manhattan",lat:40.8676,lng:-73.9212},
  "Morningside Heights": {borough:"Manhattan",lat:40.8099,lng:-73.9601},
  "Williamsburg": {borough:"Brooklyn",lat:40.7081,lng:-73.9571},
  "Dumbo": {borough:"Brooklyn",lat:40.7033,lng:-73.9894},
  "Brooklyn Heights": {borough:"Brooklyn",lat:40.6960,lng:-73.9937},
  "Park Slope": {borough:"Brooklyn",lat:40.6681,lng:-73.9800},
  "Cobble Hill": {borough:"Brooklyn",lat:40.6862,lng:-73.9954},
  "Carroll Gardens": {borough:"Brooklyn",lat:40.6801,lng:-73.9997},
  "Boerum Hill": {borough:"Brooklyn",lat:40.6882,lng:-73.9835},
  "Fort Greene": {borough:"Brooklyn",lat:40.6920,lng:-73.9745},
  "Clinton Hill": {borough:"Brooklyn",lat:40.6950,lng:-73.9621},
  "Bushwick": {borough:"Brooklyn",lat:40.6944,lng:-73.9213},
  "Greenpoint": {borough:"Brooklyn",lat:40.7299,lng:-73.9508},
  "Red Hook": {borough:"Brooklyn",lat:40.6752,lng:-74.0098},
  "Gowanus": {borough:"Brooklyn",lat:40.6740,lng:-73.9897},
  "Crown Heights": {borough:"Brooklyn",lat:40.6694,lng:-73.9448},
  "Downtown Brooklyn": {borough:"Brooklyn",lat:40.6943,lng:-73.9903},
  "Astoria": {borough:"Queens",lat:40.7721,lng:-73.9302},
  "Long Island City": {borough:"Queens",lat:40.7448,lng:-73.9484},
  "Flushing": {borough:"Queens",lat:40.7675,lng:-73.8330},
  "Jackson Heights": {borough:"Queens",lat:40.7557,lng:-73.8831},
  "Forest Hills": {borough:"Queens",lat:40.7196,lng:-73.8449},
  "Sunnyside": {borough:"Queens",lat:40.7435,lng:-73.9196},
  "Woodside": {borough:"Queens",lat:40.7451,lng:-73.9029},
  "Ridgewood": {borough:"Queens",lat:40.7008,lng:-73.9054},
  "Fordham": {borough:"Bronx",lat:40.8610,lng:-73.8910},
  "Riverdale": {borough:"Bronx",lat:40.9001,lng:-73.9120},
  "Mott Haven": {borough:"Bronx",lat:40.8087,lng:-73.9240},
  "St. George": {borough:"Staten Island",lat:40.6437,lng:-74.0739},
  "Stapleton": {borough:"Staten Island",lat:40.6279,lng:-74.0760},
};

interface Props {
  onChange: (val: string) => void;
  onSelect: (hood: string, borough: string, coords: {lat: number, lng: number} | null) => void;
}

export default function NeighborhoodSearch({ onChange, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const results = query.length >= 1
    ? Object.entries(NEIGHBORHOODS)
        .filter(([name]) => name.toLowerCase().includes(query.toLowerCase()))
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{position:'relative',flex:1}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 16px',background:'#f9fafb',borderRadius:'12px',border:'1px solid #e5e7eb'}}>
        <span style={{color:'#9ca3af',fontSize:'16px'}}>📍</span>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); onChange(e.target.value); }}
          onFocus={() => setOpen(true)}
          placeholder='Neighborhood — try "Midtown"'
          style={{flex:1,padding:'12px 0',background:'transparent',border:'none',outline:'none',fontSize:'14px',color:'#111'}}
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); onChange(''); }} style={{color:'#9ca3af',fontSize:'18px',background:'none',border:'none',cursor:'pointer'}}>×</button>
        )}
      </div>
      {open && results.length > 0 && (
        <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,background:'white',borderRadius:'12px',border:'1px solid #e5e7eb',boxShadow:'0 8px 24px rgba(0,0,0,0.1)',zIndex:100,overflow:'hidden'}}>
          {results.map(([name, data]) => (
            <button
              key={name}
              onMouseDown={() => {
                setQuery(name);
                setOpen(false);
                onChange(name);
                onSelect(name, data.borough, {lat: data.lat, lng: data.lng});
              }}
              style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'10px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontSize:'14px',color:'#111'}}
              onMouseEnter={e => (e.currentTarget.style.background='#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.background='none')}
            >
              <span>{name}</span>
              <span style={{fontSize:'11px',color:'#9ca3af'}}>{data.borough}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
