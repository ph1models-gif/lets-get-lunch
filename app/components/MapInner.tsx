'use client';
import React, { useEffect, useRef } from 'react';

const R = [
  {name:'Osteria Morini',lat:40.7243,lng:-74.0018,price:'$32',special:'Tagliatelle + salad + tiramisu'},
  {name:'Sushi Yasuda',lat:40.7527,lng:-73.9772,price:'$35',special:'8-piece omakase + miso soup'},
  {name:'The Smith',lat:40.7580,lng:-73.9855,price:'$28',special:'Burger + fries + soft drink'},
  {name:'Avra Estiatorio',lat:40.7549,lng:-73.9740,price:'$34',special:'Branzino + Greek salad + baklava'},
  {name:'Cafe Boulud',lat:40.7726,lng:-73.9632,price:'$35',special:'Soupe du jour + steak frites'},
  {name:'Via Carota',lat:40.7334,lng:-74.0040,price:'$30',special:'Cacio e pepe + insalata + panna cotta'},
  {name:'Momofuku',lat:40.7289,lng:-73.9845,price:'$26',special:'Ramen + bao + soft drink'},
  {name:'Le Bernardin',lat:40.7614,lng:-73.9816,price:'$35',special:'Salmon + lobster bisque + dessert'},
];

interface Props {
  onPanReady?: (fn: (lat: number, lng: number) => void) => void;
}

export default function MapInner({ onPanReady }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if ((window as any).google) { initMap(); return; }
    const s = document.createElement('script');
    s.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyA7_zRNFDRW4iNar9OJA-89Om449JheFm0";
    s.async = true;
    s.onload = initMap;
    document.head.appendChild(s);
  }, []);

  function initMap() {
    if (!ref.current) return;
    const g = (window as any).google.maps;

    const map = new g.Map(ref.current, {
      center: {lat:40.7484, lng:-73.984},
      zoom: 13,
      gestureHandling: 'cooperative',
      mapTypeControl: false,
      streetViewControl: false,
    });
    mapRef.current = map;

    if (onPanReady) {
      onPanReady((lat: number, lng: number) => {
        map.panTo({lat, lng});
        map.setZoom(14);
      });
    }

    // Restaurant pins
    R.forEach(r => {
      const mk = new g.Marker({
        position: {lat:r.lat, lng:r.lng},
        map,
        title: r.name,
        label: {text:r.price, color:'white', fontSize:'10px', fontWeight:'bold'},
        icon: {path:g.SymbolPath.CIRCLE, scale:18, fillColor:'#4A9FD5', fillOpacity:1, strokeColor:'white', strokeWeight:2},
      });
      const popup = new g.InfoWindow({
        content: `<div style="padding:10px;min-width:180px;font-family:sans-serif">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${r.name}</div>
          <div style="color:#4A9FD5;font-weight:700;font-size:15px;margin-bottom:4px">${r.price}</div>
          <div style="color:#666;font-size:12px">${r.special}</div>
        </div>`
      });
      mk.addListener('click', () => popup.open(map, mk));
    });

    // Blue dot — user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const userLatLng = {lat: pos.coords.latitude, lng: pos.coords.longitude};
        new g.Marker({
          position: userLatLng,
          map,
          title: 'You are here',
          icon: {
            path: g.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 3,
          },
          zIndex: 999,
        });
        map.panTo(userLatLng);
      }, () => {});
    }
  }

  return <div ref={ref} style={{width:'100%', height:'420px'}} />;
}
