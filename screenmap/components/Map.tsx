'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MapEvents from './MapEvents';
import 'leaflet/dist/leaflet.css';
import '../styles/custom-map.css'; // Import custom styles
import L from 'leaflet';

// Fix for default icon issue with webpack
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// It's a good practice to delete the default icon options before merging new ones
// to avoid potential conflicts.
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
}

L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl.src,
    iconUrl: iconUrl.src,
    shadowUrl: shadowUrl.src,
  });

// Example of a custom icon
const customIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Example icon
    iconSize: [35, 35], // size of the icon
    iconAnchor: [17, 35], // point of the icon which will correspond to marker's location
    popupAnchor: [0, -35] // point from which the popup should open relative to the iconAnchor
  });

export default function Map() {
  const position: [number, number] = [51.505, -0.09]; // Default position [lat, lng]

  return (
    <MapContainer center={position} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapEvents />
      <Marker position={position} icon={customIcon}>
        <Popup className="custom-popup">A pretty CSS3 popup. <br /> Easily customizable.</Popup>
      </Marker>
    </MapContainer>
  );
}