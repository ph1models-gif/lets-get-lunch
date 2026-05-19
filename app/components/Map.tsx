'use client';
import dynamic from 'next/dynamic';

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => <div style={{width:'100%',height:'50vh',maxHeight:'420px',minHeight:'280px',background:'#EEF2F7',display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:'#888'}}>Loading map...</p></div>
}) as React.ComponentType<{ onPanReady?: (fn: (lat: number, lng: number) => void) => void; activeIds?: string[]; onBoundsChange?: (bounds: {north: number, south: number, east: number, west: number}) => void }>;

export default function Map({ onPanReady, activeIds, onBoundsChange }: { onPanReady?: (fn: (lat: number, lng: number) => void) => void; activeIds?: string[]; onBoundsChange?: (bounds: {north: number, south: number, east: number, west: number}) => void }) {
  return <MapInner onPanReady={onPanReady} activeIds={activeIds} onBoundsChange={onBoundsChange} />;
}
