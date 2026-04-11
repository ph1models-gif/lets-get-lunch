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

    // Custom popup card — no X button, fully clickable, photo support
    let activeCard: HTMLDivElement | null = null;

    const overlay = new g.OverlayView();
    overlay.onAdd = function() {};
    overlay.draw = function() {};
    overlay.onRemove = function() {};
    overlay.setMap(map);

    function showCard(r: any, deal: any, pixel: {x: number, y: number}) {
      if (activeCard) { activeCard.remove(); activeCard = null; }

      const card = document.createElement('div');
      card.style.cssText = `
        position:absolute;
        background:white;
        border-radius:12px;
        box-shadow:0 4px 20px rgba(0,0,0,0.18);
        width:220px;
        cursor:pointer;
        overflow:hidden;
        z-index:9999;
        left:${pixel.x - 110}px;
        top:${pixel.y - 200}px;
        font-family:sans-serif;
      `;

      card.innerHTML = `
        ${r.photo_url ? `<img src="${r.photo_url}" style="width:100%;height:110px;object-fit:cover;display:block" />` : ''}
        <div style="padding:10px 12px 12px">
          <div style="font-weight:600;font-size:14px;color:#111;margin-bottom:2px">${r.name}</div>
          <div style="font-size:11px;color:#888;margin-bottom:4px">${r.cuisine || ''}</div>
          ${r.bio ? `<div style="font-size:11px;color:#555;font-style:italic;margin-bottom:6px;line-height:1.4">${r.bio}</div>` : ''}
          <div style="font-size:15px;font-weight:700;color:#4A9FD5">${deal ? '$'+deal.price : ''}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        window.location.href = `/restaurants/${r.id}`;
      });

      card.addEventListener('mouseleave', () => {
        card.remove();
        if (activeCard === card) activeCard = null;
      });

      map.getDiv().appendChild(card);
      activeCard = card;
    }

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

      mk.addListener('mouseover', () => {
        const proj = overlay.getProjection();
        if (!proj) return;
        const pixel = proj.fromLatLngToContainerPixel(mk.getPosition()!);
        if (pixel) showCard(r, deal, {x: pixel.x, y: pixel.y});
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
