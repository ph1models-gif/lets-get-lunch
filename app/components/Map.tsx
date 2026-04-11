'use client';
import dynamic from 'next/dynamic';

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => <div style={{width:'100%',height:'420px',background:'#EEF2F7',display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:'#888'}}>Loading map...</p></div>
}) as React.ComponentType<{ onPanReady?: (fn: (lat: number, lng: number) => void) => void; activeIds?: string[] }>;

export default function Map({ onPanReady, activeIds }: { onPanReady?: (fn: (lat: number, lng: number) => void) => void; activeIds?: string[] }) {
  return <MapInner onPanReady={onPanReady} activeIds={activeIds} />;
}
