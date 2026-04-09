'use client';
import { useState, useRef, useEffect } from 'react';

const NEIGHBORHOODS: Record<string, string[]> = {
  "Manhattan": ["Midtown","Upper East Side","Upper West Side","Chelsea","West Village","Greenwich Village","SoHo","NoHo","Tribeca","Financial District","Lower East Side","East Village","Gramercy Park","Murray Hill","Kips Bay","Harlem","East Harlem","Washington Heights","Hell's Kitchen","Chinatown","Little Italy","Battery Park City","Union Square","Lenox Hill","Yorkville","Midtown East","Midtown West","Inwood","Morningside Heights"],
  "Brooklyn": ["Williamsburg","Dumbo","Brooklyn Heights","Park Slope","Cobble Hill","Carroll Gardens","Boerum Hill","Fort Greene","Clinton Hill","Bedford-Stuyvesant","Bushwick","Greenpoint","Red Hook","Gowanus","Sunset Park","Bay Ridge","Flatbush","Crown Heights","Prospect Heights","Downtown Brooklyn","Cobble Hill","Vinegar Hill","South Slope","Ditmas Park"],
  "Queens": ["Astoria","Long Island City","Flushing","Jackson Heights","Forest Hills","Rego Park","Sunnyside","Woodside","Jamaica","Bayside","Corona","Elmhurst","Ridgewood","Hunters Point","Kew Gardens"],
  "Bronx": ["Fordham","Riverdale","Mott Haven","Tremont","Pelham Bay","Co-op City","Belmont","City Island","Kingsbridge","Norwood","Parkchester"],
  "Staten Island": ["St. George","Stapleton","Tottenville","Woodrow","New Dorp","Great Kills"]
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
    ? Object.entries(NEIGHBORHOODS).flatMap(([borough, hoods]) =>
        hoods
          .filter(h => h.toLowerCase().includes(query.toLowerCase()))
          .map(h => ({ hood: h, borough }))
      ).slice(0, 8)
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
          {results.map(({hood, borough}) => (
            <button
              key={hood}
              onMouseDown={() => { setQuery(hood); setOpen(false); onChange(hood); onSelect(hood, borough, null); }}
              style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'10px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontSize:'14px',color:'#111'}}
              onMouseEnter={e => (e.currentTarget.style.background='#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.background='none')}
            >
              <span>{hood}</span>
              <span style={{fontSize:'11px',color:'#9ca3af'}}>{borough}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
