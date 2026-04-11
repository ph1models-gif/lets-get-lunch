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
      .select('id, name, lat, lng, cuisine, bio, photo_url, deals(price, special)')
      .eq('is_active', true);

    if (!restaurants) return;

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

      const content = document.createElement('div');
      content.style.cssText = 'width:220px;cursor:pointer;font-family:sans-serif;border-radius:12px;overflow:hidden';
      content.innerHTML = `
        ${r.photo_url ? `<img src="${r.photo_url}" style="width:100%;height:110px;object-fit:cover;display:block" crossorigin="anonymous" />` : '<div style="width:100%;height:60px;background:#EEF6FC;display:flex;align-items:center;justify-content:center;font-size:24px">🍽️</div>'}
        <div style="padding:10px 12px 12px">
          <div style="font-weight:600;font-size:14px;color:#111;margin-bottom:2px">${r.name}</div>
          <div style="font-size:11px;color:#888;margin-bottom:${r.bio ? '4px' : '6px'}">${r.cuisine || ''}</div>
          ${r.bio ? `<div style="font-size:11px;color:#555;font-style:italic;margin-bottom:6px;line-height:1.4">${r.bio}</div>` : ''}
          <div style="font-size:15px;font-weight:700;color:#4A9FD5">${deal ? '$' + deal.price : ''}</div>
        </div>
      `;
      content.addEventListener('click', () => { window.location.href = `/restaurants/${r.id}`; });

      const popup = new g.InfoWindow({ content, disableAutoPan: true });

      mk.addListener('mouseover', () => {
        if (openPopup) openPopup.close();
        openPopup = popup;
        popup.open(map, mk);
      });

      mk.addListener('mouseout', () => {
        setTimeout(() => {
          if (openPopup === popup) { popup.close(); openPopup = null; }
        }, 400);
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
