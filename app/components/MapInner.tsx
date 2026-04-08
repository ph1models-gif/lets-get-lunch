'use client';
import { useEffect, useRef } from 'react';
const R = [
  {name:'Osteria Morini',lat:40.7243,lng:-74.0018,price:'$32',emoji:'🍝'},
  {name:'Sushi Yasuda',lat:40.7527,lng:-73.9772,price:'$35',emoji:'🍱'},
  {name:'The Smith',lat:40.7580,lng:-73.9855,price:'$28',emoji:'🍔'},
  {name:'Avra Estiatorio',lat:40.7549,lng:-73.9740,price:'$34',emoji:'🐟'},
  {name:'Cafe Boulud',lat:40.7726,lng:-73.9632,price:'$35',emoji:'🥩'},
  {name:'Via Carota',lat:40.7334,lng:-74.0040,price:'$30',emoji:'🍃'},
  {name:'Momofuku',lat:40.7289,lng:-73.9845,price:'$26',emoji:'🍜'},
  {name:'Le Bernardin',lat:40.7614,lng:-73.9816,price:'$35',emoji:'🦞'},
];
export default function MapInner() {
  const ref = useRef(null);
  useEffect(() => {
    const s = document.createElement('script');
    s.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyA7_zRNFDRW4iNar9OJA-89Om449JheFm0';
    s.async = true;
    s.onload = () => {
      if (!ref.current) return;
      const g = window.google.maps;
      const map = new g.Map(ref.current, {center:{lat:40.7484,lng:-73.984},zoom:13,scrollwheel:false,gestureHandling:'cooperative',mapTypeControl:false,streetViewControl:false,fullscreenControl:false});
      R.forEach(r => {
        const mk = new g.Marker({position:{lat:r.lat,lng:r.lng},map,title:r.name,label:{text:r.price,color:'white',fontSize:'10px',fontWeight:'bold'},icon:{path:g.SymbolPath.CIRCLE,scale:18,fillColor:'#4A9FD5',fillOpacity:1,strokeColor:'white',strokeWeight:2}});
        const iw = new g.InfoWindow({content:'<div style="padding:8px"><b>'+r.name+'</b><br/><span style="color:#4A9FD5">'+r.price+'</span></div>'});
        mk.addListener('click',()=>iw.open(map,mk));
      });
    };
    document.head.appendChild(s);
  },[]);
  return React.createElement('div', {ref, style:{width:'100%',height:'420px'}});
}
