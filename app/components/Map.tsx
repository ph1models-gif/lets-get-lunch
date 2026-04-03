'use client';
import { useEffect } from 'react';

export default function Map() {
  useEffect(() => {
    const loader = document.createElement('script');
    loader.type = 'module';
    loader.src = 'https://ajax.googleapis.com/ajax/libs/@googlemaps/extended-component-library/0.6.11/index.min.js';
    document.head.appendChild(loader);
  }, []);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div style={{ width: '100%', height: '420px' }}>
      <div dangerouslySetInnerHTML={{ __html: `
        <gmpx-api-loader key="${apiKey}" solution-channel="GMP_GE_mapsandplacesautocomplete_v2"></gmpx-api-loader>
        <gmp-map center="40.7484,-73.9840" zoom="13" map-id="DEMO_MAP_ID" style="width:100%;height:420px;">
          <gmp-advanced-marker position="40.7243,-74.0018" title="Osteria Morini $32"></gmp-advanced-marker>
          <gmp-advanced-marker position="40.7527,-73.9772" title="Sushi Yasuda $35"></gmp-advanced-marker>
          <gmp-advanced-marker position="40.7580,-73.9855" title="The Smith $28"></gmp-advanced-marker>
          <gmp-advanced-marker position="40.7549,-73.9740" title="Avra Estiatorio $34"></gmp-advanced-marker>
          <gmp-advanced-marker position="40.7726,-73.9632" title="Cafe Boulud $35"></gmp-advanced-marker>
          <gmp-advanced-marker position="40.7334,-74.0040" title="Via Carota $30"></gmp-advanced-marker>
          <gmp-advanced-marker position="40.7289,-73.9845" title="Momofuku $26"></gmp-advanced-marker>
          <gmp-advanced-marker position="40.7614,-73.9816" title="Le Bernardin $35"></gmp-advanced-marker>
        </gmp-map>
      ` }} />
    </div>
  );
}
