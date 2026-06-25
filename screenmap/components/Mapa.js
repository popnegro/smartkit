import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
// Arreglo para un bug conocido con los íconos de los marcadores en Webpack
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon.src,
    shadowUrl: iconShadow.src,
    iconAnchor: [12, 41], // El punto del ícono que corresponderá a la ubicación del marcador
});

L.Marker.prototype.options.icon = DefaultIcon;


// Este componente recibe la lista de soportes como una prop
const Mapa = ({ soportes }) => {
  // Coordenadas de ejemplo para centrar el mapa inicialmente
  const posicionInicial = [-34.6037, -58.3816]; // Buenos Aires

  return (
    <MapContainer center={posicionInicial} zoom={12} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Itera sobre los soportes y crea un marcador para cada uno */}
      {soportes.map(soporte => (
        // Asegúrate de que tus datos tengan latitud y longitud
        (soporte.latitud && soporte.longitud) && (
          <Marker key={soporte.id} position={[soporte.latitud, soporte.longitud]}>
            <Popup>
              <b>{soporte.nombre}</b><br />
              {soporte.ubicacion}
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
};

export default Mapa;
