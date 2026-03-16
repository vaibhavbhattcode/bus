import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { MapPin } from 'lucide-react';

interface AccessLog {
    id: string;
    ip: string;
    userAgent: string;
    createdAt: string;
    latitude?: number;
    longitude?: number;
    country?: string;
    city?: string;
}

export default function AccessLogMap() {
    const { data: logs, isLoading } = useQuery({
        queryKey: ['admin-access-logs-map'],
        queryFn: async () => {
            const res = await api.get('/admin/access-logs?limit=200').catch(() => []);
            return res as any;
        },
        staleTime: 60000,
    });

    const validLogs = useMemo(() => {
        // In a real app the IP is geocoded on the backend and saved to the DB
        // We filter logs that successfully have lat/long for map rendering
        const safeLogs = Array.isArray(logs) ? logs : (logs?.data || []);
        return safeLogs.filter((log: AccessLog) => log.latitude !== undefined && log.longitude !== undefined);
    }, [logs]);

    if (isLoading) {
        return (
            <div className="bg-gray-100 rounded-2xl h-80 w-full animate-pulse flex items-center justify-center">
                <MapPin className="h-8 w-8 text-gray-400 animate-bounce" />
            </div>
        );
    }

    if (validLogs.length === 0) {
        return (
            <div className="bg-gray-50 rounded-2xl h-80 w-full border border-gray-100 flex flex-col items-center justify-center text-center p-6">
                <MapPin className="h-10 w-10 text-gray-300 mb-2" />
                <p className="font-bold text-gray-500">No Geospatial Data Available</p>
                <p className="text-sm text-gray-400 mt-1">Access logs require IP geolocation resolution to be displayed on the map.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-80 relative">
            <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-gray-700">Live Access Geo-Heatmap</span>
            </div>
            <MapContainer
                center={[20.5937, 78.9629]} // Center on India Default
                zoom={4}
                scrollWheelZoom={false}
                className="h-full w-full z-10"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {validLogs.map((log: AccessLog) => (
                    <CircleMarker
                        key={log.id}
                        center={[log.latitude!, log.longitude!]}
                        radius={6}
                        pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.6 }}
                    >
                        <Popup>
                            <div className="text-xs font-sans">
                                <p className="font-bold text-gray-900 mb-1">{log.ip}</p>
                                <p className="text-gray-600">{log.city || 'Unknown City'}, {log.country || 'Unknown Country'}</p>
                                <p className="text-gray-400 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    );
}
