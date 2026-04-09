'use client';
import React, { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface Props {
  onPanReady?: (fn: (lat: number, lng: number) => void) => void;
}

export default function MapInner({ onPanReady }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((window as any).google) { initMap(); return; }
    const s = document.createElement('script');
    s.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyA7_zRNFDRW4iNar9OJA-89Om449JheFm0';
    s.async = true;
    s.onload = initMap;
    document.head.appendChild(s);
  }, []);

  async function initMap() {
    if (!ref.current) return;
    const g = (window as any).google.maps;

    const map = new g.Map(ref.current, {
      center: {lat:40.7484, lng:-73.984},
      zoom: 13,
      gestureHandling: 'cooperative',
      mapTypeControl: false,
      streetViewControl: false,
    });

    if (onPanReady) {
      onPanReady((lat: number, lng: number) => {
        map.panTo({lat, lng});
        map.setZoom(14);
      });
    }

    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('id, name, lat, lng, deals(price, special)')
      .eq('is_active', true);

    if (!restaurants) return;

    let openPopup: any = null;

    restaurants.forEach((r: any) => {
      const deal = r.deals?.[0];
      if (!r.lat || !r.lng) return;

      const mk = new g.Marker({
        position: {lat: Number(r.lat), lng: Number(r.lng)},
        map,
        title: r.name,
        label: {text: deal ? `$${deal.price}` : '', color:'white', fontSize:'10px', fontWeight:'bold'},
        icon: {path:g.SymbolPath.CIRCLE, scale:18, fillColor:'#4A9FD5', fillOpacity:1, strokeColor:'white', strokeWeight:2},
        cursor: 'pointer',
      });

      const popup = new g.InfoWindow({
        content: `<div style="padding:10px;min-width:180px;font-family:sans-serif;cursor:pointer" onclick="window.location.href='/restaurants/${r.id}'">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${r.name}</div>
          <div style="color:#4A9FD5;font-weight:700;font-size:15px;margin-bottom:4px">${deal ? '$'+deal.price : ''}</div>
          <div style="color:#666;font-size:12px;margin-bottom:8px">${deal?.special || ''}</div>
          <div style="background:#4A9FD5;color:white;text-align:center;padding:6px;border-radius:8px;font-size:12px;font-weight:600">View deal →</div>
        </div>`
      });

      mk.addListener('click', () => {
        if (openPopup) openPopup.close();
        openPopup = popup;
        popup.open(map, mk);
      });
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const userLatLng = {lat: pos.coords.latitude, lng: pos.coords.longitude};
        new g.Marker({
          position: userLatLng,
          map,
          title: 'You are here',
          icon: {path:g.SymbolPath.CIRCLE, scale:10, fillColor:'#4285F4', fillOpacity:1, strokeColor:'white', strokeWeight:3},
          zIndex: 999,
        });
        map.panTo(userLatLng);
      }, () => {});
    }
  }

  return <div ref={ref} style={{width:'100%', height:'420px'}} />;
}
