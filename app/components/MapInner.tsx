'use client';
import React, { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Restaurant } from '../types';

// Web: open in a new tab (keeps the map/list in place). Native app: the
// whole site runs in one webview, so window.open('_blank') would otherwise
// hand off to Safari - navigate in place instead.
function navigateToRestaurant(slug: string) {
  const url = `/restaurants/${slug}`;
  if (Capacitor.isNativePlatform()) {
    window.location.href = url;
  } else {
    window.open(url, '_blank');
  }
}

interface Props {
  onPanReady?: (fn: (lat: number, lng: number) => void) => void;
  onBoundsChange?: (bounds: {north: number, south: number, east: number, west: number}) => void;
  onGeolocationResolved?: () => void;
  activeIds?: string[];
  restaurants: Restaurant[];
}

export default function MapInner({ onPanReady, activeIds, onBoundsChange, onGeolocationResolved, restaurants }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const activeIdsRef = useRef<string[] | undefined>(activeIds);

  // Keep the ref synced with the latest prop so initMap (async) sees current value
  useEffect(() => {
    activeIdsRef.current = activeIds;
  }, [activeIds]);

  useEffect(() => {
    if (markersRef.current.size === 0) return;
    markersRef.current.forEach((mk, id) => {
      // If activeIds is undefined (component used without filtering), show all.
      // If activeIds is provided (even if empty), only show those — empty array means hide all.
      if (activeIds === undefined) {
        mk.setVisible(true);
      } else {
        mk.setVisible(activeIds.includes(id));
      }
    });
  }, [activeIds]);

  useEffect(() => {
    if (mapsReady()) { safeInitMap(); return; }
    const interval = setInterval(() => {
      if (mapsReady()) { clearInterval(interval); safeInitMap(); }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // `window.google` can exist as a bare object before the actual maps.Map/
  // Marker/InfoWindow/SymbolPath/event classes it exposes are populated —
  // checking only the top-level object was racy and, on a slower
  // connection, could let initMap() run against half-initialized classes
  // and throw. Check for the exact symbols initMap() actually uses.
  function mapsReady() {
    const g = (window as any).google;
    return !!(g && g.maps && g.maps.Map && g.maps.Marker && g.maps.InfoWindow && g.maps.SymbolPath && g.maps.event);
  }

  // Belt-and-suspenders: initMap() touches a lot of Google Maps surface
  // area and third-party data (restaurant lat/lng). If anything in there
  // still throws despite the readiness check above, don't let it become an
  // uncaught exception that blanks the whole page — log it and retry a
  // few times instead of crashing.
  function safeInitMap(attempt = 0) {
    try {
      initMap();
    } catch (err) {
      console.error('Map init failed:', err);
      if (attempt < 3) setTimeout(() => safeInitMap(attempt + 1), 300);
    }
  }

  function initMap() {
    if (!ref.current) return;
    const g = (window as any).google.maps;

    const map = new g.Map(ref.current, {
      center: {lat:40.7425, lng:-73.9879},
      zoom: 16,
      gestureHandling: 'cooperative',
      mapTypeControl: false,
      streetViewControl: false,
      clickableIcons: false,
    });

    g.event.addListenerOnce(map, 'tilesloaded', () => {
      const ph = document.getElementById('map-placeholder');
      if (ph) { ph.style.opacity = '0'; setTimeout(() => ph.remove(), 400); }
    });

    // Debounced bounds emitter — fires 300ms after pan/zoom stops
    let boundsTimer: any = null;
    const emitBounds = () => {
      if (!onBoundsChange) return;
      if (boundsTimer) clearTimeout(boundsTimer);
      boundsTimer = setTimeout(() => {
        const b = map.getBounds();
        if (!b) return;
        const ne = b.getNorthEast();
        const sw = b.getSouthWest();
        onBoundsChange({ north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() });
      }, 300);
    };
    g.event.addListener(map, 'idle', emitBounds);

    if (onPanReady) {
      onPanReady((lat: number, lng: number) => {
        map.panTo({lat, lng});
        map.setZoom(16);
      });
    }

    // Inject CSS to hide Google Maps close button and arrow
    const style = document.createElement('style');
    style.textContent = `
      .gm-style-iw-chr { display: none !important; }
      .gm-style-iw-tc { display: none !important; }
      .gm-style-iw { padding: 0 !important; border-radius: 12px !important; overflow: hidden !important; }
      .gm-style-iw-d { overflow: hidden !important; }
      .gm-style-iw-c { padding: 0 !important; border-radius: 12px !important; box-shadow: 0 4px 20px rgba(0,0,0,0.18) !important; }
    `;
    document.head.appendChild(style);

    let openPopup: any = null;

    // Tap map (anywhere not on a pin) closes the open restaurant popup
    map.addListener('click', () => {
      if (openPopup) { openPopup.close(); openPopup = null; }
    });

    restaurants.forEach((r) => {
      const deal = r.deals?.[0];
      if (!r.lat || !r.lng) return;

      const mk = new g.Marker({
        position: {lat: Number(r.lat), lng: Number(r.lng)},
        map,
        title: r.name,
        label: {text: deal ? `$${deal.price}` : '', color:'white', fontSize:'10px', fontWeight:'bold'},
        icon: {path:g.SymbolPath.CIRCLE, scale: deal?.is_exclusive ? 21.6 : 18, fillColor:'#4A9FD5', fillOpacity:1, strokeColor:'white', strokeWeight:2},
        cursor: 'pointer',
      });
      // Apply initial visibility based on current activeIds (avoids race with useEffect)
      const cur = activeIdsRef.current;
      if (cur !== undefined) {
        mk.setVisible(cur.includes(r.id));
      }
      markersRef.current.set(r.id, mk);

      const dealHtml = deal?.special
        ? `<div style="color:#555;font-size:11px;margin-bottom:6px;line-height:1.4">${deal.special}</div>`
        : '';

      const content = document.createElement('div');
      content.style.cssText = 'width:220px;cursor:pointer;font-family:sans-serif;border-radius:12px;overflow:hidden';

      const photoUrl = r.photo_url || '';
      const photoBlock = photoUrl
        ? `<div style="width:100%;height:110px;background:#EEF6FC;background-image:url('${photoUrl}');background-size:cover;background-position:center"></div>`
        : `<div style="width:100%;height:60px;background:#EEF6FC;display:flex;align-items:center;justify-content:center;font-size:24px">🍽️</div>`;

      const exclusiveBadge = deal?.is_exclusive
        ? `<span style="flex-shrink:0;background:#4A9FD5;color:white;font-size:9px;font-weight:600;padding:2px 6px;border-radius:9999px;white-space:nowrap">✦ Exclusive</span>`
        : '';

      content.innerHTML = `
        ${photoBlock}
        <div style="padding:10px 12px 12px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:2px">
            <div style="font-weight:600;font-size:14px;color:#111">${r.name}</div>
            ${exclusiveBadge}
          </div>
          <div style="font-size:11px;color:#888;margin-bottom:4px">${r.cuisine || ''}</div>
          ${dealHtml}
          <div style="font-size:15px;font-weight:700;color:#4A9FD5">${deal ? '$' + deal.price : ''}</div>
        </div>
      `;
      content.addEventListener('click', () => { navigateToRestaurant(r.slug); });

      const popup = new g.InfoWindow({ content, disableAutoPan: false });

      let pinHovered = false;
      let cardHovered = false;

      function maybeClose() {
        setTimeout(() => {
          if (!pinHovered && !cardHovered) {
            popup.close();
            openPopup = null;
          }
        }, 200);
      }

      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      if (isTouchDevice) {
        // Mobile: tap pin to open popup, tap popup to navigate
        mk.addListener('click', () => {
          if (openPopup && openPopup !== popup) openPopup.close();
          openPopup = popup;
          popup.open(map, mk);
        });

        popup.addListener('domready', () => {
          const iwOuter = document.querySelector('.gm-style-iw');
          if (iwOuter) {
            (iwOuter as HTMLElement).addEventListener('click', () => {
              navigateToRestaurant(r.slug);
            });
          }
        });
      } else {
        // Desktop: click pin to navigate directly
        mk.addListener('click', () => { navigateToRestaurant(r.slug); });

        // Desktop: hover pin to open, hover card to keep open, click to navigate
        mk.addListener('mouseover', () => {
          pinHovered = true;
          if (openPopup && openPopup !== popup) openPopup.close();
          openPopup = popup;
          popup.open(map, mk);
        });

        mk.addListener('mouseout', () => {
          pinHovered = false;
          maybeClose();
        });

        popup.addListener('domready', () => {
          const iwOuter = document.querySelector('.gm-style-iw');
          if (iwOuter) {
            iwOuter.addEventListener('mouseover', () => { cardHovered = true; });
            iwOuter.addEventListener('mouseout', () => { cardHovered = false; maybeClose(); });
            iwOuter.addEventListener('click', () => { navigateToRestaurant(r.slug); });
          }
        });
      }
    });

    // Fires onGeolocationResolved as soon as the user has responded to the
    // browser's location prompt — Allow or Don't Allow — independent of
    // whatever the map does with that answer.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const userLatLng = {lat: pos.coords.latitude, lng: pos.coords.longitude};
        // NYC bounding box (rough): lat 40.49-40.92, lng -74.27 to -73.68
        const inNYC = userLatLng.lat >= 40.49 && userLatLng.lat <= 40.92 &&
                      userLatLng.lng >= -74.27 && userLatLng.lng <= -73.68;
        new g.Marker({
          position: userLatLng,
          map,
          title: 'You are here',
          icon: {path:g.SymbolPath.CIRCLE, scale:10, fillColor:'#4285F4', fillOpacity:1, strokeColor:'white', strokeWeight:3},
          zIndex: 999,
        });
        if (inNYC) {
          map.panTo(userLatLng);
          map.setZoom(15);
        }
        // If outside NYC, stay at Madison Square Park default (already set)
        if (onGeolocationResolved) onGeolocationResolved();
      }, () => {
        // Permission denied or position unavailable — map stays at default.
        if (onGeolocationResolved) onGeolocationResolved();
      });
    } else if (onGeolocationResolved) {
      onGeolocationResolved();
    }
  }

  return (
    <div style={{position:'relative', width:'100%', height:'50vh', maxHeight:'420px', minHeight:'280px'}}>
      <style>{`
        @keyframes shimmer-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .map-skeleton {
          overflow: hidden;
          background: #e8eaed;
        }
        .map-skeleton::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, #f0f2f5, transparent);
          animation: shimmer-sweep 1.5s infinite;
          will-change: transform;
        }
      `}</style>
      <div className="map-skeleton" style={{position:'absolute', inset:0, zIndex:0}} />
      <div ref={ref} style={{width:'100%', height:'100%', position:'relative', zIndex:1, background:'transparent'}} />
    </div>
  );
}
