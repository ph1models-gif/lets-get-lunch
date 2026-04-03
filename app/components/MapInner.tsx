'use client';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const restaurants = [
  { id: 1, name: "Osteria Morini", lat: 40.7243, lng: -74.0018, price: "$32", emoji: "🍝" },
  { id: 2, name: "Sushi Yasuda", lat: 40.7527, lng: -73.9772, price: "$35", emoji: "🍱" },
  { id: 3, name: "The Smith", lat: 40.7580, lng: -73.9855, price: "$28", emoji: "🍔" },
  { id: 4, name: "Avra Estiatorio", lat: 40.7549, lng: -73.9740, price: "$34", emoji: "🐟" },
  { id: 5, name: "Cafe Boulud", lat: 40.7726, lng: -73.9632, price: "$35", emoji: "🥩" },
  { id: 6, name: "Via Carota", lat: 40.7334, lng: -74.0040, price: "$30", emoji: "🍃" },
  { id: 7, name: "Momofuku Noodle Bar", lat: 40.7289, lng: -73.9845, price: "$26", emoji: "🍜" },
  { id: 8, name: "Le Bernardin", lat: 40.7614, lng: -73.9816, price: "$35", emoji: "🦞" },
];

export default function MapInner() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [40.7549, -73.9840],
      zoom: 13,
      scrollWheelZoom: false,
    });

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    restaurants.forEach(r => {
      const icon = L.divIcon({
        html: `<div style="font-size:24px;text-align:center;line-height:36px;width:36px;height:36px;background:white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${r.emoji}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: '',
      });

      L.marker([r.lat, r.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="padding:4px"><b>${r.name}</b><br/><span style="color:#4A9FD5">${r.price} lunch special</span></div>`
        );
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return <div ref={mapRef} style={{ width: '100%', height: '400px' }} />;
}
