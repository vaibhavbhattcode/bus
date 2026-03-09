import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navigation } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Fix for default leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Bus Icon
const busIcon = new L.DivIcon({
  className: 'custom-bus-icon',
  html: `<div style="background-color: #4f46e5; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.34-.1-.66-.31-.91-.12-.15-.25-.29-.4-.41-.36-.32-.9-.55-1.46-.55H4.17c-.56 0-1.1.23-1.46.55-.15.12-.28.26-.4.41-.21.25-.31.57-.31.91 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/><path d="M15 18H9"/><path d="M16.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/><path d="M7.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Custom Location Icon
const locationIcon = new L.DivIcon({
  className: 'custom-location-icon',
  html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface BusTrackingMapProps {
  fromLocation: { lat: number; lng: number; name: string };
  toLocation: { lat: number; lng: number; name: string };
  routeId?: string;
  currentLocation?: { lat: number; lng: number; speed?: number; heading?: number };
}

function MapAdjuster({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

interface BusPosition {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  name?: string;
}

export default function BusTrackingMap({ fromLocation, toLocation, routeId, currentLocation: initialLocation }: BusTrackingMapProps) {
  const [busPos, setBusPos] = useState<BusPosition>(initialLocation || fromLocation);
  const [history, setHistory] = useState<[number, number][]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!routeId) return;

    // Connect to tracking namespace
    const socket = io(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/tracking`, {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to tracking gateway');
      socket.emit('join_route', { routeId });
    });

    socket.on('location_update', (data) => {
      const newPos = { lat: data.latitude, lng: data.longitude, speed: data.speed, heading: data.heading };
      setBusPos(newPos);
      setHistory(prev => [...prev.slice(-20), [data.latitude, data.longitude]]);
    });

    return () => {
      socket.disconnect();
    };
  }, [routeId]);

  // Fallback simulation if no routeId or no real updates (for demo)
  useEffect(() => {
    if (routeId || initialLocation) return;

    const interval = setInterval(() => {
      setBusPos(prev => {
        const latDiff = toLocation.lat - fromLocation.lat;
        const lngDiff = toLocation.lng - fromLocation.lng;
        const step = 0.005;
        const newLat = prev.lat + latDiff * step;
        const newLng = prev.lng + lngDiff * step;

        if (Math.abs(newLat - toLocation.lat) < 0.001) return fromLocation;
        
        const newPos = { lat: newLat, lng: newLng };
        setHistory(h => [...h.slice(-20), [newLat, newLng]]);
        return newPos;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [fromLocation, toLocation, routeId, initialLocation]);

  const bounds: L.LatLngBoundsExpression = [
    [fromLocation.lat, fromLocation.lng],
    [toLocation.lat, toLocation.lng]
  ];

  return (
    <div className="relative h-full w-full z-0">
      <MapContainer 
        bounds={bounds}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <MapAdjuster bounds={bounds} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Route Path */}
        <Polyline 
          positions={[[fromLocation.lat, fromLocation.lng], [toLocation.lat, toLocation.lng]]} 
          color="#94a3b8" 
          weight={3} 
          dashArray="10, 10" 
          opacity={0.5}
        />

        {/* Breadcrumbs/History */}
        {history.length > 0 && (
          <Polyline positions={history} color="#4f46e5" weight={4} opacity={0.8} />
        )}

        {/* Start & End Markers */}
        <Marker position={[fromLocation.lat, fromLocation.lng]} icon={locationIcon}>
          <Popup className="font-bold">{fromLocation.name} (Start)</Popup>
        </Marker>
        
        <Marker position={[toLocation.lat, toLocation.lng]} icon={locationIcon}>
          <Popup className="font-bold">{toLocation.name} (Destination)</Popup>
        </Marker>

        {/* The Bus! */}
        <Marker position={[busPos.lat, busPos.lng]} icon={busIcon}>
          <Popup>
            <div className="p-1">
              <p className="font-bold text-primary-600 flex items-center gap-1">
                <Navigation className="h-3 w-3" style={{ transform: `rotate(${busPos.heading || 0}deg)` }} />
                Live Bus Location
              </p>
              {busPos.speed && <p className="text-xs text-gray-500">Speed: {busPos.speed} km/h</p>}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      
      {/* Overlay Stats */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50 space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          Live Status
        </div>
        <div className="text-sm font-black text-gray-900">
          {busPos.speed ? `${busPos.speed} km/h` : 'Moving'}
        </div>
      </div>
    </div>
  );
}
