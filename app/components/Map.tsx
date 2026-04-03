'use client';
import { useEffect, useRef } from 'react';

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

export default function Map() {
  const mapRef = useRef(null);
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.onload = () => {
      if (!mapRef.current) return;
      const map = new (window as any).google.maps.Map(mapRef.current, {
        center: { lat: 40.7549, lng: -73.9840 },
        zoom: 13,
        mapTypeControl: false,
        scrollwheel: false,
        gestureHandling: "cooperative",
        streetViewControl: false,
      });
      restaurants.forEach(r => {
        const marker = new (window as any).google.maps.Marker({
          position: { lat: r.lat, lng: r.lng },
          map,
          title: r.name,
        });
        const info = new (window as any).google.maps.InfoWindow({
          content: `<div style="padding:8px"><div style="font-size:20px">${r.emoji}</div><b>${r.name}</b><br/><span style="color:#4A9FD5">${r.price} lunch special</span></div>`,
        });
        marker.addListener('click', () => info.open(map, marker));
      });
    };
    document.head.appendChild(script);
  }, []);
  return <div ref={mapRef} style={{ width: '100%', height: '400px' }} />;
}
