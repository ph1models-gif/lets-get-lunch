'use client';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { Restaurant } from '../types';

type MapProps = {
  onPanReady?: (fn: (lat: number, lng: number) => void) => void;
  activeIds?: string[];
  onBoundsChange?: (bounds: {north: number, south: number, east: number, west: number}) => void;
  onGeolocationResolved?: () => void;
  restaurants: Restaurant[];
};

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => <MapPlaceholder />
}) as React.ComponentType<MapProps>;

function MapPlaceholder() {
  return <div style={{width:'100%',height:'50vh',maxHeight:'420px',minHeight:'280px',background:'#EEF2F7',display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:'#888'}}>Loading map...</p></div>;
}

export default function Map({ onPanReady, activeIds, onBoundsChange, onGeolocationResolved, restaurants }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    if (shouldMount) return;
    const el = containerRef.current;
    if (!el) return;

    if (!('IntersectionObserver' in window)) {
      setShouldMount(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setShouldMount(true);
        observer.disconnect();
      }
    }, { rootMargin: '300px' });

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldMount]);

  return (
    <div ref={containerRef}>
      {shouldMount ? (
        <>
          <Script
            src="https://maps.googleapis.com/maps/api/js?key=AIzaSyA7_zRNFDRW4iNar9OJA-89Om449JheFm0&v=weekly&loading=async"
            strategy="lazyOnload"
          />
          <MapInner onPanReady={onPanReady} activeIds={activeIds} onBoundsChange={onBoundsChange} onGeolocationResolved={onGeolocationResolved} restaurants={restaurants} />
        </>
      ) : (
        <MapPlaceholder />
      )}
    </div>
  );
}
