'use client';
import dynamic from 'next/dynamic';
const MapInner = dynamic(() => import('./MapInner'), {ssr: false, loading: () => <div style={{width:'100%',height:'420px',background:'#EEF2F7',display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:'#888'}}>Loading map...</p></div>});
export default function Map() { return <MapInner />; }
