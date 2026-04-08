'use client';
import { useState, useRef, useEffect } from 'react';

const HOODS = {"Manhattan": ["Midtown", "Upper East Side", "Upper West Side", "Chelsea", "West Village", "Greenwich Village", "SoHo", "NoHo", "Tribeca", "Financial District", "Lower East Side", "East Village", "Gramercy Park", "Murray Hill", "Kips Bay", "Harlem", "East Harlem", "Washington Heights", "Inwood", "Hamilton Heights", "Morningside Heights", "Hell's Kitchen", "Chinatown", "Little Italy", "Battery Park City", "Union Square", "Lenox Hill", "Yorkville", "Midtown East", "Midtown West", "Turtle Bay", "Sutton Place", "Roosevelt Island", "Stuyvesant Town", "Two Bridges", "Bowery", "City Hall", "Manhattanville", "Manhattan Valley"], "Brooklyn": ["Williamsburg", "Dumbo", "Brooklyn Heights", "Park Slope", "Cobble Hill", "Carroll Gardens", "Boerum Hill", "Fort Greene", "Clinton Hill", "Bedford-Stuyvesant", "Bushwick", "Greenpoint", "Red Hook", "Gowanus", "Sunset Park", "Bay Ridge", "Bensonhurst", "Flatbush", "Crown Heights", "Prospect Heights", "Downtown Brooklyn", "Brownsville", "East New York", "Canarsie", "Sheepshead Bay", "Brighton Beach", "Coney Island", "Dyker Heights", "Borough Park", "Kensington", "Windsor Terrace", "Ditmas Park", "Midwood", "Marine Park", "Mill Basin", "Vinegar Hill", "South Slope", "Prospect Lefferts Gardens", "Ocean Hill", "Cypress Hills"], "Queens": ["Astoria", "Long Island City", "Flushing", "Jackson Heights", "Forest Hills", "Rego Park", "Sunnyside", "Woodside", "Jamaica", "Bayside", "Corona", "Elmhurst", "Maspeth", "Middle Village", "Ridgewood", "Glendale", "Woodhaven", "Ozone Park", "Howard Beach", "Far Rockaway", "Rockaway Park", "Fresh Meadows", "Hillcrest", "Kew Gardens", "Kew Gardens Hills", "Briarwood", "Richmond Hill", "South Ozone Park", "Springfield Gardens", "St. Albans", "Hollis", "Queens Village", "Cambria Heights", "Laurelton", "Rosedale", "College Point", "Whitestone", "Douglaston", "Little Neck", "Oakland Gardens", "Glen Oaks", "Floral Park", "Hunters Point"], "Bronx": ["Fordham", "Riverdale", "Mott Haven", "Tremont", "Pelham Bay", "Co-op City", "Highbridge", "Morris Park", "Allerton", "Baychester", "Bedford Park", "Belmont", "Castle Hill", "City Island", "Claremont", "Clason Point", "Concourse Village", "Country Club", "Crotona Park", "East Tremont", "Eastchester", "Edenwald", "Fieldston", "Hunt's Point", "Jerome Park", "Kingsbridge", "Kingsbridge Heights", "Longwood", "Marble Hill", "Melrose", "Morris Heights", "Morrisania", "Mount Eden", "Mount Hope", "North Riverdale", "Norwood", "Parkchester", "Pelham Gardens", "Pelham Parkway", "Port Morris", "Schuylerville", "Soundview", "Throgs Neck", "University Heights", "Van Nest", "Wakefield", "West Farms", "Williamsbridge", "Woodlawn"], "Staten Island": ["St. George", "Stapleton", "New Brighton", "Tottenville", "Great Kills", "Annadale", "Bloomfield", "Castleton Corners", "Clifton", "Dongan Hills", "Emerson Hill", "Grant City", "Grasmere", "Grymes Hill", "Huguenot", "Lighthouse Hill", "Livingston", "Mariners Harbor", "New Dorp", "New Springville", "Oakwood", "Pleasant Plains", "Port Richmond", "Prince's Bay", "Randall Manor", "Richmond Valley", "Rosebank", "Rossville", "Silver Lake", "South Beach", "Sunnyside", "Todt Hill", "Travis", "West Brighton", "Woodrow"]};
const COORDS = {"Midtown": [40.7549, -73.984], "Upper East Side": [40.7736, -73.9566], "Upper West Side": [40.787, -73.9754], "Chelsea": [40.7465, -74.0014], "West Village": [40.7338, -74.0054], "Greenwich Village": [40.7335, -74.0027], "SoHo": [40.7233, -74.003], "Tribeca": [40.7195, -74.0089], "Financial District": [40.7075, -74.0113], "Lower East Side": [40.7153, -73.9866], "East Village": [40.7265, -73.9815], "Harlem": [40.8116, -73.9465], "Washington Heights": [40.8433, -73.9388], "Hell's Kitchen": [40.7638, -73.9918], "Williamsburg": [40.7081, -73.9571], "Park Slope": [40.671, -73.9814], "Brooklyn Heights": [40.6962, -73.9937], "Dumbo": [40.7033, -73.9881], "Bushwick": [40.6944, -73.9213], "Greenpoint": [40.7242, -73.9473], "Astoria": [40.7721, -73.9301], "Long Island City": [40.7447, -73.9486], "Flushing": [40.7675, -73.833], "Jackson Heights": [40.7557, -73.8831], "Forest Hills": [40.7196, -73.8448], "Fordham": [40.8614, -73.8979], "Riverdale": [40.8936, -73.913], "Mott Haven": [40.8084, -73.9258], "St. George": [40.6437, -74.0764], "Stapleton": [40.6273, -74.0744], "Tottenville": [40.5122, -74.2476], "Woodrow": [40.536, -74.213], "Co-op City": [40.8742, -73.829]};

interface Props {
  onSelect: (neighborhood: string, borough: string, coords?: [number, number]) => void;
  onChange: (val: string) => void;
}

export default function NeighborhoodSearch({ onSelect, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const showDropdown = open && query.length >= 1;

  const filtered = showDropdown ? Object.entries(HOODS).reduce((acc, [borough, hoods]) => {
    const matches = (hoods as string[]).filter((h: string) =>
      h.toLowerCase().includes(query.toLowerCase()) ||
      borough.toLowerCase().includes(query.toLowerCase())
    );
    if (matches.length) acc[borough] = matches;
    return acc;
  }, {} as Record<string, string[]>) : {};

  function select(hood: string, borough: string) {
    setQuery(hood);
    onChange(hood);
    const c = (COORDS as any)[hood];
    onSelect(hood, borough, c ? [c[0], c[1]] : undefined);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{position:'relative',flex:1}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 16px',background:'#f9fafb',borderRadius:'12px',border:'1px solid #e5e7eb'}}>
        <span style={{color:'#9ca3af',fontSize:'16px'}}>📍</span>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Neighborhood — try "Midtown""
          style={{flex:1,padding:'12px 0',background:'transparent',border:'none',outline:'none',fontSize:'14px',color:'#111'}}
        />
        {query && (
          <button onClick={() => { setQuery(''); onChange(''); }} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:'18px',lineHeight:'1'}}>x</button>
        )}
      </div>

      {showDropdown && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'white',border:'1px solid #e5e7eb',borderRadius:'14px',boxShadow:'0 8px 32px rgba(0,0,0,0.12)',zIndex:1000,maxHeight:'300px',overflowY:'auto'}}>
          {Object.entries(filtered).length === 0 ? (
            <div style={{padding:'16px',color:'#9ca3af',fontSize:'13px',textAlign:'center'}}>No neighborhoods found</div>
          ) : Object.entries(filtered).map(([borough, hoods]) => (
            <div key={borough}>
              <div style={{padding:'8px 16px',fontSize:'10px',fontWeight:700,color:'#6b7280',letterSpacing:'0.1em',textTransform:'uppercase',background:'#f9fafb',borderBottom:'1px solid #f3f4f6'}}>
                {borough}
              </div>
              {hoods.map((h: string) => (
                <button key={h} onClick={() => select(h, borough)}
                  style={{width:'100%',textAlign:'left',padding:'10px 16px',fontSize:'13px',color:'#374151',background:'none',border:'none',cursor:'pointer',borderBottom:'1px solid #f9fafb'}}
                  onMouseEnter={e => (e.currentTarget.style.background='#f0f9ff')}
                  onMouseLeave={e => (e.currentTarget.style.background='none')}
                >
                  {h} <span style={{color:'#d1d5db',fontSize:'11px'}}>· {borough}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
