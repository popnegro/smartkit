'use client';

import { useMapEvents } from 'react-leaflet';

export default function MapEvents() {
  useMapEvents({
    click(e) {
      console.log('Map clicked at:', e.latlng);
    },
  });

  return null;
}