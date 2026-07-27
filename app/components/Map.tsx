'use client';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { Restaurant } from '../types';

type MapProps = {
  onPanReady?: (fn: (lat: number, lng: number) => void) => void;
  activeIds?: string[];
  onBoundsChange?: (bounds: {north: number, south: number, east: number, west: number}) => void;
  restaurants: Restaurant[];
};

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => <MapPlaceholder />
}) as React.ComponentType<MapProps>;

// Same default center/zoom MapInner.tsx passes to google.maps.Map, so the
// static-to-interactive swap is visually seamless (no pan/zoom jump).
// No scale=2: this is a ~1s placeholder, not worth doubling the payload for
// retina sharpness (133KB vs 57KB measured).
const STATIC_MAP_URL =
  'https://maps.googleapis.com/maps/api/staticmap' +
  '?center=40.7425,-73.9879&zoom=16&size=640x420&maptype=roadmap' +
  '&key=AIzaSyA7_zRNFDRW4iNar9OJA-89Om449JheFm0';

function MapPlaceholder() {
  // Container dimensions must match MapInner's returned wrapper exactly
  // (same width/height/maxHeight/minHeight) so swapping this out for the
  // interactive map never shifts layout (CLS).
  // fetchPriority="high" re-added on the now-57KB (non-retina) image as an
  // isolated test: dropping payload alone (46-baseline ->33 ->44 without
  // priority) didn't recover the ~58 pre-facade score, so next single
  // variable is priority back on at the smaller size. If this doesn't
  // recover it either, see NOTES.md 2026-07-27 entry for the revert plan.
  return (
    <div style={{position:'relative', width:'100%', height:'50vh', maxHeight:'420px', minHeight:'280px'}}>
      <img
        src={STATIC_MAP_URL}
        alt=""
        fetchPriority="high"
        loading="eager"
        decoding="async"
        style={{position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover'}}
      />
    </div>
  );
}

export default function Map({ onPanReady, activeIds, onBoundsChange, restaurants }: MapProps) {
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
          <MapInner onPanReady={onPanReady} activeIds={activeIds} onBoundsChange={onBoundsChange} restaurants={restaurants} />
        </>
      ) : (
        <MapPlaceholder />
      )}
    </div>
  );
}
