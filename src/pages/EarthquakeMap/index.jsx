import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import { Container, Spinner, Alert, Badge, Toast, ToastContainer, Form } from 'react-bootstrap';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import useEarthquakeStore from '../../store/earthquakeStore';
import * as TileLayers from '../../TileLayers';
import './EarthquakeMap.css';

// Fix para los iconos de Leaflet en producción
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function EarthquakeMap() {
    // Obtener datos del store de Zustand
    const { earthquakes, loading, error, isConnected, updatedFromSocket, fetchEarthquakes, initializeSocket, disconnectSocket, resetSocketUpdateFlag } = useEarthquakeStore();
    const [showToast, setShowToast] = useState(false);
    const [showLoadingToast, setShowLoadingToast] = useState(false);
    const [selectedLayer, setSelectedLayer] = useState('Esri_WorldImagery');

    // Opciones de capas disponibles
    const layerOptions = {
        'Esri_WorldImagery': { name: 'Satélite (Esri)', layer: TileLayers.Esri_WorldImagery },
        'Esri_WorldTopoMap': { name: 'Topográfico (Esri)', layer: TileLayers.Esri_WorldTopoMap },
        'Esri_OceanBasemap': { name: 'Océano (Esri)', layer: TileLayers.Esri_OceanBasemap },
        'Esri_NatGeoWorldMap': { name: 'National Geographic', layer: TileLayers.Esri_NatGeoWorldMap },
        'CartoDB_Voyager': { name: 'CartoDB Voyager', layer: TileLayers.CartoDB_Voyager },
        'Esri_WorldStreetMap': { name: 'Calles (Esri)', layer: TileLayers.Esri_WorldStreetMap },
        'OpenStreetMap': { name: 'OpenStreetMap', layer: TileLayers.OpenStreetMap }
    };

    useEffect(() => {
        // Inicializar socket y cargar datos al montar el componente
        initializeSocket();

        // Mostrar toast de carga
        setShowLoadingToast(true);

        fetchEarthquakes();

        // Cleanup al desmontar
        return () => {
            disconnectSocket();
        };
    }, [initializeSocket, fetchEarthquakes, disconnectSocket]);

    // Ocultar toast de carga cuando termina de cargar
    useEffect(() => {
        if (!loading && showLoadingToast) {
            setShowLoadingToast(false);
        }
    }, [loading, showLoadingToast]);

    // Detectar cuando se actualizan los sismos desde el socket
    useEffect(() => {
        if (updatedFromSocket) {
            // Mostrar notificación
            setShowToast(true);

            // Ocultar el toast después de 3 segundos
            setTimeout(() => {
                setShowToast(false);
                resetSocketUpdateFlag();
            }, 3000);
        }
    }, [updatedFromSocket, resetSocketUpdateFlag]);

    const getColorByMagnitude = (magnitude) => {
        if (magnitude >= 6) return '#d73027';
        if (magnitude >= 5) return '#fc8d59';
        if (magnitude >= 4) return '#fee08b';
        if (magnitude >= 3) return '#d9ef8b';
        if (magnitude >= 2) return '#91cf60';
        return '#1a9850';
    };

    const getRadiusByMagnitude = (magnitude) => {
        return magnitude * 20000; // Radio en metros
    };

    return (
        <div className="earthquake-map-container">
            <div className="map-header">
                <div className="d-flex justify-content-between align-items-start flex-wrap">
                    <div>
                        <h1>Mapa de Terremotos en Tiempo Real</h1>
                        <p>Datos de la API Local - http://localhost:4000/api/temblor</p>
                    </div>
                    <div className="layer-selector">
                        <Form.Select
                            value={selectedLayer}
                            onChange={(e) => setSelectedLayer(e.target.value)}
                            size="sm"
                            style={{ width: '250px' }}
                        >
                            {Object.entries(layerOptions).map(([key, { name }]) => (
                                <option key={key} value={key}>{name}</option>
                            ))}
                        </Form.Select>
                    </div>
                </div>
                <div className="stats mt-2">
                    <Badge bg="primary" className="me-2">Total: {earthquakes.length} terremotos</Badge>
                    <Badge bg={isConnected ? 'success' : 'secondary'}>
                        {isConnected ? '🟢 Socket Conectado' : '⚫ Socket Desconectado'}
                    </Badge>
                </div>
            </div>

            <div className="legend">
                <h6>Magnitud</h6>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#1a9850' }}></span>
                    <span>&lt; 2.0</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#91cf60' }}></span>
                    <span>2.0 - 3.0</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#d9ef8b' }}></span>
                    <span>3.0 - 4.0</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#fee08b' }}></span>
                    <span>4.0 - 5.0</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#fc8d59' }}></span>
                    <span>5.0 - 6.0</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#d73027' }}></span>
                    <span>&gt; 6.0</span>
                </div>
            </div>

            <MapContainer
                center={[20, -100]}
                zoom={3}
                style={{ height: 'calc(100vh - 200px)', width: '100%' }}
                worldCopyJump={true}  // Permitir copias múltiples sin saltar
            // maxBounds={null}       // Sin límites
            // maxBoundsViscosity={0}
            >
                <TileLayer
                    key={selectedLayer}
                    url={layerOptions[selectedLayer].layer.url}
                    attribution={layerOptions[selectedLayer].layer.attribution}
                />

                {earthquakes.map((quake, index) => {
                    // Extraer datos del formato de la API local
                    const lat = quake.latitud;
                    const lng = quake.longitud;
                    const mag = quake.magnitud;
                    const depth = quake.profundidad;
                    const place = quake.place || 'Ubicación desconocida';
                    const time = quake.time;
                    const localTime = quake.localTime;
                    const closerTowns = quake.closerTowns;
                    const fuente = quake.fuente || quake.fuenteApi;
                    const mapURL = quake.mapURL;
                    const oceano = quake.oceano;
                    const oceanoRegion = quake.oceanoRegion;

                    const date = new Date(time);

                    return (
                        <Circle
                            key={quake.id || index}
                            center={[lat, lng]}
                            radius={getRadiusByMagnitude(mag)}
                            pathOptions={{
                                color: getColorByMagnitude(mag),
                                fillColor: getColorByMagnitude(mag),
                                fillOpacity: 0.5,
                                weight: 1
                            }}
                        >
                            <Popup>
                                <div className="earthquake-popup">
                                    <h6><strong>{place}</strong></h6>
                                    <p><strong>Magnitud:</strong> {mag}</p>
                                    <p><strong>Profundidad:</strong> {depth.toFixed(2)} km</p>
                                    <p><strong>Fecha Local:</strong> {localTime}</p>
                                    <p><strong>Coordenadas:</strong> {lat.toFixed(3)}, {lng.toFixed(3)}</p>
                                    {closerTowns && <p><strong>Ciudades cercanas:</strong> {closerTowns}</p>}
                                    {oceano && (
                                        <p><strong>Océano:</strong> {oceano} ({oceanoRegion})</p>
                                    )}
                                    {fuente && <p><strong>Fuente:</strong> {fuente}</p>}
                                    {mapURL && (
                                        <a
                                            href={mapURL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-sm btn-primary mt-2"
                                        >
                                            Ver mapa SGC
                                        </a>
                                    )}
                                </div>
                            </Popup>
                        </Circle>
                    );
                })}
            </MapContainer>

            {/* Notificaciones Toast */}
            <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 9999 }}>
                {/* Toast de carga */}
                <Toast
                    show={showLoadingToast}
                    bg="info"
                >
                    <Toast.Header closeButton={false}>
                        <Spinner animation="border" size="sm" className="me-2" />
                        <strong className="me-auto">Cargando terremotos...</strong>
                    </Toast.Header>
                    <Toast.Body className="text-white">
                        Obteniendo datos del servidor...
                    </Toast.Body>
                </Toast>

                {/* Toast de actualización */}
                <Toast
                    show={showToast}
                    onClose={() => setShowToast(false)}
                    bg="success"
                    autohide
                    delay={3000}
                >
                    <Toast.Header>
                        <strong className="me-auto">✅ Sismos Actualizados</strong>
                    </Toast.Header>
                    <Toast.Body className="text-white">
                        Los datos de terremotos se han actualizado correctamente.
                    </Toast.Body>
                </Toast>

                {/* Toast de error */}
                {error && (
                    <Toast
                        show={true}
                        bg="danger"
                    >
                        <Toast.Header>
                            <strong className="me-auto">❌ Error</strong>
                        </Toast.Header>
                        <Toast.Body className="text-white">
                            {error}
                        </Toast.Body>
                    </Toast>
                )}
            </ToastContainer>
        </div>
    );
}

export default EarthquakeMap;
