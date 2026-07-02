import dynamic from 'next/dynamic';
import { useMemo } from 'react';

export default function MapPage() {
  const Map = useMemo(() => dynamic(
    () => import('./Map'),
    { 
      loading: () => <p>A map is loading</p>,
      ssr: false
    }
  ), []);

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <Map />
    </div>
  );
}