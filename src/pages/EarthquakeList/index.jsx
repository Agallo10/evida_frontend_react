import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, Polyline } from 'react-leaflet';
import { Container, Row, Col, Card, Spinner, Alert, Badge, Pagination, Toast, ToastContainer, Form } from 'react-bootstrap';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import useEarthquakeStore from '../../store/earthquakeStore';
import datosLC from '../../docs/datosLC.json';
import * as TileLayers from '../../TileLayers';
import './EarthquakeList.css';

// Fix para los iconos de Leaflet en producción
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Crear icono personalizado para terremotos
const earthquakeIcon = new L.Icon({
    iconUrl: '/Sismo.png',
    shadowUrl: '/shadow.png',
    iconSize: [32, 47],
    iconAnchor: [16, 46],
    popupAnchor: [0, -48],
    shadowSize: [49, 47],
    shadowAnchor: [3, 47]
});
const escenarioIcon = new L.Icon({
    iconUrl: '/Escenario.png',
    shadowUrl: '/shadow.png',
    iconSize: [32, 47],
    iconAnchor: [16, 46],
    popupAnchor: [0, -48],
    shadowSize: [49, 47],
    shadowAnchor: [3, 47]
});

// Componente para centrar el mapa cuando cambia el terremoto
function MapController({ center, zoom }) {
    const map = useMap();

    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, {
                duration: 1.5
            });
        }
    }, [center, zoom, map]);

    return null;
}

function EarthquakeList() {
    // Estado del store de Zustand
    const { earthquakes, loading, error, isConnected, updatedFromSocket, fetchEarthquakes, initializeSocket, disconnectSocket, resetSocketUpdateFlag } = useEarthquakeStore();

    // Estado local para la paginación y el mapa
    const [currentPage, setCurrentPage] = useState(0);
    const [mapCenter, setMapCenter] = useState([4.5709, -74.2973]); // Centro de Colombia por defecto
    const [mapZoom, setMapZoom] = useState(6);
    const [showToast, setShowToast] = useState(false);
    const [showLoadingToast, setShowLoadingToast] = useState(false);
    const [selectedLayer, setSelectedLayer] = useState('Esri_WorldImagery');
    const [escenario, setEscenario] = useState(null); // Estado para almacenar el escenario de simulación
    const [isCardExpanded, setIsCardExpanded] = useState(false); // Estado para controlar la expansión del card
    const [alturaData, setAlturaData] = useState(null); // Estado para almacenar datos de altura

    // Opciones de capas disponibles
    const layerOptions = {
        'Esri_WorldImagery': { name: 'Satélite (Esri)', layer: TileLayers.Esri_WorldImagery },
        'Esri_WorldTopoMap': { name: 'Topográfico (Esri)', layer: TileLayers.Esri_WorldTopoMap },
        'Esri_OceanBasemap': { name: 'Océano (Esri)', layer: TileLayers.Esri_OceanBasemap },
        'Esri_NatGeoWorldMap': { name: 'National Geographic', layer: TileLayers.Esri_NatGeoWorldMap },
        'CartoDB_Voyager': { name: 'CartoDB Voyager', layer: TileLayers.CartoDB_Voyager },
        'Esri_WorldStreetMap': { name: 'Calles (Esri)', layer: TileLayers.Esri_WorldStreetMap }
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

    // Actualizar el centro del mapa cuando se cargan los datos
    useEffect(() => {
        if (earthquakes.length > 0 && currentPage === 0) {
            setMapCenter([earthquakes[0].latitud, earthquakes[0].longitud]);
            setMapZoom(6);
        }
    }, [earthquakes]);

    // Definir el terremoto actual antes de usarlo
    const totalPages = earthquakes.length;
    const currentEarthquake = earthquakes[currentPage];

    // Detectar cuando se actualizan los sismos desde el socket
    useEffect(() => {
        if (updatedFromSocket) {
            // Resetear a la primera página
            setCurrentPage(0);

            // Actualizar el centro del mapa al primer sismo
            if (earthquakes.length > 0) {
                setMapCenter([earthquakes[0].latitud, earthquakes[0].longitud]);
                setMapZoom(6);
            }

            // Mostrar notificación
            setShowToast(true);

            // Ocultar el toast después de 3 segundos
            setTimeout(() => {
                setShowToast(false);
                resetSocketUpdateFlag();
            }, 3000);
        }
    }, [updatedFromSocket, earthquakes, resetSocketUpdateFlag]);

    // Ejecutar simulación cuando cambia el sismo actual
    useEffect(() => {
        const executeSimulation = async () => {
            if (!currentEarthquake) return;

            try {
                const simulationData = {
                    latitud: currentEarthquake.latitud,
                    longitud: currentEarthquake.longitud || currentEarthquake.longitud,
                    mag: currentEarthquake.magnitud,
                    depth: currentEarthquake.profundidad,
                    dip: currentEarthquake.dip || "15", // Valor por defecto si no existe
                    sismoid: currentEarthquake.id,
                    sismoFecha: currentEarthquake.localTime || currentEarthquake.time,
                    sismooceano: currentEarthquake.oceano || "",
                    oceanoregion: currentEarthquake.oceanoRegion || ""
                };

                console.log('🔍 Ejecutando simulación para sismo:', simulationData);

                const response = await fetch('http://localhost:4000/api/findSimulacion', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(simulationData)
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Simulación completada:', result);

                    // Almacenar el escenario de la respuesta
                    if (result && result.idEscenario && result.latitud && result.longitud) {
                        setEscenario(result);

                        // Si hay simulaciones y no es old, hacer fetch de altura para el Pacífico
                        if (!result.old && result.simulaciones && result.simulaciones.length > 0) {
                            const pacificoLocalidad = result.simulaciones[0];
                            fetchAlturaData(pacificoLocalidad, currentEarthquake);
                        } else {
                            setAlturaData(null);
                        }
                    } else {
                        setEscenario(null);
                        setAlturaData(null);
                    }
                } else {
                    console.error('❌ Error en simulación:', response.statusText);
                    setEscenario(null);
                    setAlturaData(null);
                }
            } catch (error) {
                console.error('❌ Error ejecutando simulación:', error);
                setEscenario(null);
                setAlturaData(null);
            }
        };

        executeSimulation();
    }, [currentPage, earthquakes]);

    // Función para obtener datos de altura
    const fetchAlturaData = async (localidad, earthquake) => {
        try {
            // Forzar el parámetro localidad a "Pacifico" según especificación del curl
            const alturaRequestData = {
                localidad: 'Pacifico',
                mag: earthquake.magnitud,
                fecha: earthquake.localTime,
                sismoid: earthquake.id
            };
            // No fijar 'caso'; usar el proveniente de la simulación de Pacífico si existe
            if (localidad) {
                if (localidad.caso) {
                    alturaRequestData.caso = localidad.caso;
                } else if (localidad.origen) {
                    // Fallback razonable: algunos escenarios exponen 'origen' en lugar de 'caso'
                    alturaRequestData.caso = localidad.origen;
                }
            }

            console.log('🔍 Solicitando datos de altura:', alturaRequestData);

            const response = await fetch('http://localhost:4000/api/findAltura', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(alturaRequestData)
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Datos de altura recibidos:', data);
                setAlturaData(data);
            } else {
                console.error('❌ Error al obtener datos de altura:', response.statusText);
                setAlturaData(null);
            }
        } catch (error) {
            console.error('❌ Error en fetchAlturaData:', error);
            setAlturaData(null);
        }
    };

    const getColorByMagnitude = (magnitude) => {
        if (magnitude >= 6) return '#d73027';
        if (magnitude >= 5) return '#fc8d59';
        if (magnitude >= 4) return '#fee08b';
        if (magnitude >= 3) return '#d9ef8b';
        if (magnitude >= 2) return '#91cf60';
        return '#1a9850';
    };

    const getEstadoColor = (estado) => {
        const estadoLower = estado?.toLowerCase() || '';
        if (estadoLower.includes('alerta')) return '#dc3545';
        if (estadoLower.includes('advertencia')) return '#ff9800';
        if (estadoLower.includes('informativo')) return '#28a745';
        if (estadoLower.includes('vigilancia')) return '#ffc107';
        return '#6c757d';
    };

    const toggleCard = () => {
        setIsCardExpanded(!isCardExpanded);
    };

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        const earthquake = earthquakes[pageNumber];
        if (earthquake) {
            // Centrar el mapa en el terremoto seleccionado con zoom
            setMapCenter([earthquake.latitud, earthquake.longitud]);
            setMapZoom(6);
        }
    };

    // Generar items de paginación
    const renderPaginationItems = () => {
        const items = [];
        const maxVisible = 5;
        let startPage = Math.max(0, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);

        // Ajustar si estamos cerca del final
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(0, endPage - maxVisible + 1);
        }

        if (startPage > 0) {
            items.push(
                <Pagination.First key="first" onClick={() => handlePageChange(0)} />
            );
        }

        if (currentPage > 0) {
            items.push(
                <Pagination.Prev key="prev" onClick={() => handlePageChange(currentPage - 1)} />
            );
        }

        for (let i = startPage; i <= endPage; i++) {
            items.push(
                <Pagination.Item
                    key={i}
                    active={i === currentPage}
                    onClick={() => handlePageChange(i)}
                >
                    {i + 1}
                </Pagination.Item>
            );
        }

        if (currentPage < totalPages - 1) {
            items.push(
                <Pagination.Next key="next" onClick={() => handlePageChange(currentPage + 1)} />
            );
        }

        if (endPage < totalPages - 1) {
            items.push(
                <Pagination.Last key="last" onClick={() => handlePageChange(totalPages - 1)} />
            );
        }

        return items;
    };

    return (
        <div className="earthquake-list-container">
            <div className="list-header">
                <div className="d-flex justify-content-between align-items-start flex-wrap">
                    <div>
                        <h1>Lista de Terremotos</h1>
                        <p>Navegación uno por uno con vista en mapa</p>
                    </div>
                    <div className="layer-selector mt-2">
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
                <div className="d-flex align-items-center gap-2 mt-2">
                    <Badge bg="primary">Total: {earthquakes.length} terremotos</Badge>
                    <Badge bg={isConnected ? 'success' : 'secondary'}>
                        {isConnected ? '🟢 Socket Conectado' : '⚫ Socket Desconectado'}
                    </Badge>
                </div>
            </div>

            <Row className="g-0 content-row">
                {/* Panel lateral con información del terremoto */}
                <Col lg={4} className="info-panel">
                    <div className="info-content">
                        {earthquakes.length === 0 ? (
                            <Card className="earthquake-card">
                                <Card.Body className="text-center">
                                    <Alert variant="info" className="mb-0">
                                        No hay terremotos disponibles en este momento.
                                    </Alert>
                                </Card.Body>
                            </Card>
                        ) : currentEarthquake && (
                            <Card className="earthquake-card">
                                <Card.Header className="d-flex justify-content-between align-items-center">
                                    <span>Terremoto {currentPage + 1} de {totalPages}</span>
                                    <Badge
                                        bg={currentEarthquake.magnitud >= 5 ? 'danger' : currentEarthquake.magnitud >= 4 ? 'warning' : 'info'}
                                    >
                                        M {currentEarthquake.magnitud}
                                    </Badge>
                                </Card.Header>
                                <Card.Body>
                                    <h5 className="card-title">{currentEarthquake.place}</h5>

                                    <div className="info-row">
                                        <strong>ID:</strong>
                                        <span>{currentEarthquake.id}</span>
                                    </div>

                                    <div className="info-row">
                                        <strong>Magnitud:</strong>
                                        <span
                                            className="magnitude-badge"
                                            style={{ backgroundColor: getColorByMagnitude(currentEarthquake.magnitud) }}
                                        >
                                            {currentEarthquake.magnitud}
                                        </span>
                                    </div>

                                    <div className="info-row">
                                        <strong>Profundidad:</strong>
                                        <span>{currentEarthquake.profundidad.toFixed(2)} km</span>
                                    </div>

                                    <div className="info-row">
                                        <strong>Fecha Local:</strong>
                                        <span>{currentEarthquake.localTime}</span>
                                    </div>

                                    <div className="info-row">
                                        <strong>Coordenadas:</strong>
                                        <span>{currentEarthquake.latitud.toFixed(4)}, {currentEarthquake.longitud.toFixed(4)}</span>
                                    </div>

                                    {currentEarthquake.closerTowns && (
                                        <div className="info-row">
                                            <strong>Ciudades cercanas:</strong>
                                            <span className="text-muted">{currentEarthquake.closerTowns}</span>
                                        </div>
                                    )}

                                    {currentEarthquake.oceano && (
                                        <div className="info-row">
                                            <strong>Océano:</strong>
                                            <span>
                                                {currentEarthquake.oceano}
                                                <Badge bg="secondary" className="ms-2">{currentEarthquake.oceanoRegion}</Badge>
                                            </span>
                                        </div>
                                    )}

                                    <div className="info-row">
                                        <strong>Fuente:</strong>
                                        <span>{currentEarthquake.fuente || currentEarthquake.fuenteApi}</span>
                                    </div>

                                    {currentEarthquake.mapURL && (
                                        <div className="mt-3">
                                            <a
                                                href={currentEarthquake.mapURL}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-primary w-100"
                                            >
                                                Ver mapa en SGC
                                            </a>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        )}

                        {/* Paginación */}
                        {earthquakes.length > 0 && (
                            <div className="pagination-container mt-3">
                                <Pagination className="justify-content-center flex-wrap">
                                    {renderPaginationItems()}
                                </Pagination>
                            </div>
                        )}
                    </div>
                </Col>

                {/* Mapa */}
                <Col lg={8} className="map-panel">
                    <MapContainer
                        center={mapCenter}
                        zoom={mapZoom}
                        style={{ height: '100%', width: '100%' }}
                        worldCopyJump={true}
                        maxBoundsViscosity={1.0}
                    >
                        <TileLayer
                            key={selectedLayer}
                            url={layerOptions[selectedLayer].layer.url}
                            attribution={layerOptions[selectedLayer].layer.attribution}
                        />

                        <MapController center={mapCenter} zoom={mapZoom} />

                        {/* Polígono Pacífico Local */}
                        <Polygon
                            positions={datosLC.latlonPacificoLocal}
                            pathOptions={{
                                olor: 'red',
                                fillColor: '#EBC2C4',
                                fillOpacity: 0.4,
                                weight: 0.5
                            }}
                        >
                            <Popup>
                                <div>
                                    <strong>Pacífico Local</strong>
                                </div>
                            </Popup>
                        </Polygon>

                        {/* Polígono Pacífico Regional */}
                        <Polygon
                            positions={datosLC.latlonPacificoRegional}
                            pathOptions={{
                                color: 'orange',
                                weight: 1,
                                fillColor: '#FBE2B3',
                                fillOpacity: 0.4
                            }}
                        >
                            <Popup>
                                <div>
                                    <strong>Pacífico Regional</strong>
                                </div>
                            </Popup>
                        </Polygon>

                        {/* Polígono Caribe Local */}
                        <Polygon
                            positions={datosLC.latlonCaribeLocal}
                            pathOptions={{
                                color: 'red',
                                fillColor: '#EBC2C4',
                                fillOpacity: 0.4,
                                weight: 0.5
                            }}
                        >
                            <Popup>
                                <div>
                                    <strong>Caribe Local</strong>
                                </div>
                            </Popup>
                        </Polygon>
                        {/* Polígono Caribe Local Insular */}
                        <Polygon
                            positions={datosLC.latlonCaribeLocalInsular}
                            pathOptions={{
                                color: 'red',
                                fillColor: '#EBC2C4',
                                fillOpacity: 0.4,
                                weight: 0.5
                            }}
                        >
                            <Popup>
                                <div>
                                    <strong>Caribe Local</strong>
                                </div>
                            </Popup>
                        </Polygon>
                        {/* Polígono Caribe Regional */}
                        <Polygon
                            positions={datosLC.latlonCaribeRegional}
                            pathOptions={{
                                color: 'orange',
                                weight: 1,
                                fillColor: '#FBE2B3',
                                fillOpacity: 0.4
                            }}
                        >
                            <Popup>
                                <div>
                                    <strong>Caribe Regional</strong>
                                </div>
                            </Popup>
                        </Polygon>

                        {/* PolyLine Pacifico Local */}
                        <Polyline positions={datosLC.latlonPacificoLineaLocalRegional}
                            pathOptions={{
                                color: 'red',
                                weight: 0.5
                            }}
                        />
                        {/* PolyLine Caribe Local */}
                        <Polyline positions={datosLC.latlonCaribeLineaLocalRegional}
                            pathOptions={{
                                color: 'red',
                                weight: 0.5
                            }}
                        />
                        {/* PolyLine Caribe Local */}
                        <Polyline positions={datosLC.latlonCaribeLocalInsular}
                            pathOptions={{
                                color: 'red',
                                weight: 0.5
                            }}
                        />

                        {currentEarthquake && (
                            <Marker
                                position={[currentEarthquake.latitud, currentEarthquake.longitud]}
                                icon={earthquakeIcon}
                            >
                                <Popup>
                                    <div className="earthquake-popup">
                                        <h6><strong>{currentEarthquake.place}</strong></h6>
                                        <p><strong>Magnitud:</strong> {currentEarthquake.magnitud}</p>
                                        <p><strong>Profundidad:</strong> {currentEarthquake.profundidad.toFixed(2)} km</p>
                                        <p><strong>Fecha:</strong> {currentEarthquake.localTime}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {/* Marcador de escenario de simulación */}
                        {escenario && escenario.latitud && escenario.longitud && (
                            <Marker
                                position={[escenario.latitud, escenario.longitud]}
                                icon={escenarioIcon}
                            >
                                <Popup maxWidth={450}>
                                    <div className="escenario-popup">
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '10px'
                                        }}>
                                            <h6 style={{ margin: 0 }}><strong>Escenario #{escenario.idEscenario}</strong></h6>
                                            {escenario.old && (
                                                <span style={{
                                                    backgroundColor: '#ffc107',
                                                    color: '#000',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    ⚠️ ESTRUCTURA ANTIGUA
                                                </span>
                                            )}
                                            {!escenario.old && escenario.exist && (
                                                <span style={{
                                                    backgroundColor: '#28a745',
                                                    color: 'white',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    ✓ ACTUALIZADO
                                                </span>
                                            )}
                                        </div>

                                        {escenario.old && (
                                            <div style={{
                                                backgroundColor: '#fff3cd',
                                                border: '1px solid #ffc107',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                marginBottom: '10px',
                                                fontSize: '12px'
                                            }}>
                                                <strong>⚠️ Nota:</strong> Simulaciones con estructura de datos antigua.
                                                {escenario.estadoBoletin && (
                                                    <span> Estado del boletín: <strong>{escenario.estadoBoletin}</strong></span>
                                                )}
                                            </div>
                                        )}

                                        <p style={{ margin: '4px 0' }}><strong>Latitud:</strong> {escenario.latitud.toFixed(4)}</p>
                                        <p style={{ margin: '4px 0' }}><strong>Longitud:</strong> {escenario.longitud.toFixed(4)}</p>
                                        <p style={{ margin: '4px 0' }}><strong>Distancia:</strong> {escenario.distancia.toFixed(2)} km</p>
                                        <p style={{ margin: '4px 0' }}><strong>Sismo ID:</strong> {escenario.sismoid}</p>

                                        {escenario.simulaciones && escenario.simulaciones.length > 0 && (
                                            <>
                                                <hr style={{ margin: '10px 0' }} />
                                                <h6><strong>Simulaciones ({escenario.simulaciones.length}):</strong></h6>
                                                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                                    {escenario.simulaciones.map((sim, idx) => {
                                                        // Determinar si es estructura antigua (old) o nueva
                                                        const isOldStructure = escenario.old;

                                                        if (isOldStructure) {
                                                            // Estructura antigua con campos en MAYÚSCULAS
                                                            return (
                                                                <div key={idx} style={{
                                                                    padding: '10px',
                                                                    marginBottom: '8px',
                                                                    backgroundColor: '#fff9e6',
                                                                    border: '1px solid #ffc107',
                                                                    borderRadius: '6px',
                                                                    fontSize: '12px'
                                                                }}>
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        marginBottom: '6px'
                                                                    }}>
                                                                        <strong style={{ fontSize: '13px', color: '#0d6efd' }}>
                                                                            {sim.localidad ? sim.localidad.toUpperCase() : 'N/A'}
                                                                        </strong>
                                                                        {sim.VERIFICADO && (
                                                                            <span style={{
                                                                                backgroundColor: sim.VERIFICADO === 'VERDADERO' ? '#28a745' : '#dc3545',
                                                                                color: 'white',
                                                                                padding: '2px 8px',
                                                                                borderRadius: '3px',
                                                                                fontSize: '10px',
                                                                                fontWeight: 'bold'
                                                                            }}>
                                                                                {sim.VERIFICADO === 'VERDADERO' ? '✓ VERIFICADO' : '✗ NO VERIFICADO'}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <p style={{
                                                                        margin: '4px 0',
                                                                        fontSize: '11px',
                                                                        fontStyle: 'italic',
                                                                        color: '#666'
                                                                    }}>
                                                                        📍 {sim.LUGAR || 'Ubicación no especificada'}
                                                                    </p>

                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px' }}>
                                                                        {sim.MAGNITUD && (
                                                                            <p style={{ margin: '2px 0' }}><strong>Magnitud:</strong> {sim.MAGNITUD}</p>
                                                                        )}
                                                                        {sim.MAREA && (
                                                                            <p style={{ margin: '2px 0' }}><strong>Marea:</strong> {sim.MAREA}</p>
                                                                        )}
                                                                        {sim.PROFUNDIDAD && sim.PROFUNDIDAD !== "0" && (
                                                                            <p style={{ margin: '2px 0' }}><strong>Prof:</strong> {sim.PROFUNDIDAD} km</p>
                                                                        )}
                                                                        {sim.ID_ESCENARIO && (
                                                                            <p style={{ margin: '2px 0' }}><strong>ID Esc:</strong> {sim.ID_ESCENARIO}</p>
                                                                        )}
                                                                    </div>

                                                                    {sim.ALTURA && sim.ALTURA !== "0" && (
                                                                        <p style={{
                                                                            margin: '6px 0 2px 0',
                                                                            padding: '4px',
                                                                            backgroundColor: '#fff',
                                                                            borderRadius: '3px',
                                                                            fontWeight: 'bold',
                                                                            color: '#dc3545'
                                                                        }}>
                                                                            🌊 Altura: {sim.ALTURA} m
                                                                        </p>
                                                                    )}

                                                                    {sim.TIEMPO && sim.TIEMPO !== "NA" && (
                                                                        <p style={{ margin: '2px 0', fontSize: '11px', color: '#666' }}>
                                                                            ⏱️ Tiempo de llegada: {sim.TIEMPO}
                                                                        </p>
                                                                    )}

                                                                    {sim.OBSERVACIÓN && (
                                                                        <p style={{
                                                                            margin: '6px 0 2px 0',
                                                                            padding: '6px',
                                                                            backgroundColor: '#e7f3ff',
                                                                            borderRadius: '3px',
                                                                            fontSize: '11px',
                                                                            color: '#004085'
                                                                        }}>
                                                                            <strong>📝 Observación:</strong><br />{sim.OBSERVACIÓN}
                                                                        </p>
                                                                    )}

                                                                    {sim.IMAGEN && sim.IMAGEN !== "NA.jpg" && (
                                                                        <div style={{ marginTop: '8px' }}>
                                                                            <p style={{ margin: '4px 0', fontSize: '11px', color: '#666', fontWeight: 'bold' }}>
                                                                                📸 Imagen de Simulación:
                                                                            </p>
                                                                            <img
                                                                                src={`http://localhost:4000/img/old/?img=${sim.localidad ? sim.localidad.toUpperCase() : 'CARTAGENA'}/${sim.IMAGEN}`}
                                                                                alt={`Simulación ${sim.localidad}`}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    maxWidth: '400px',
                                                                                    height: 'auto',
                                                                                    borderRadius: '4px',
                                                                                    border: '1px solid #ddd',
                                                                                    marginTop: '4px',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                                onClick={(e) => window.open(e.target.src, '_blank')}
                                                                                onError={(e) => {
                                                                                    e.target.style.display = 'none';
                                                                                    e.target.nextElementSibling.style.display = 'block';
                                                                                }}
                                                                            />
                                                                            <p style={{
                                                                                display: 'none',
                                                                                margin: '4px 0',
                                                                                fontSize: '10px',
                                                                                color: '#dc3545',
                                                                                fontStyle: 'italic'
                                                                            }}>
                                                                                ⚠️ No se pudo cargar la imagen: {sim.IMAGEN}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        } else {
                                                            // Estructura nueva (old: false)
                                                            return (
                                                                <div key={idx} style={{
                                                                    padding: '10px',
                                                                    marginBottom: '8px',
                                                                    backgroundColor: '#f8f9fa',
                                                                    border: '1px solid #dee2e6',
                                                                    borderRadius: '6px',
                                                                    fontSize: '12px'
                                                                }}>
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        marginBottom: '6px'
                                                                    }}>
                                                                        <strong style={{ fontSize: '13px', color: '#0d6efd' }}>
                                                                            {sim.localidad ? sim.localidad.charAt(0).toUpperCase() + sim.localidad.slice(1) : 'N/A'}
                                                                        </strong>
                                                                        {sim.estado && (
                                                                            <span style={{
                                                                                backgroundColor: sim.estadoColor || '#6c757d',
                                                                                color: 'white',
                                                                                padding: '2px 8px',
                                                                                borderRadius: '3px',
                                                                                fontSize: '10px',
                                                                                fontWeight: 'bold'
                                                                            }}>
                                                                                {sim.estado}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                                                        {sim.caso && (
                                                                            <p style={{ margin: '2px 0' }}><strong>Caso:</strong> {sim.caso}</p>
                                                                        )}
                                                                        {sim.magnitud && (
                                                                            <p style={{ margin: '2px 0' }}><strong>Magnitud:</strong> {sim.magnitud}</p>
                                                                        )}
                                                                        {sim.profundidad && sim.profundidad !== "0" && (
                                                                            <p style={{ margin: '2px 0' }}><strong>Prof:</strong> {sim.profundidad} km</p>
                                                                        )}
                                                                        {sim.slip && (
                                                                            <p style={{ margin: '2px 0' }}><strong>Slip:</strong> {sim.slip}</p>
                                                                        )}
                                                                    </div>

                                                                    {sim.altura && sim.altura !== "0" && (
                                                                        <p style={{
                                                                            margin: '4px 0 2px 0',
                                                                            fontSize: '11px',
                                                                            color: '#666'
                                                                        }}>
                                                                            🌊 Altura: {sim.altura} m
                                                                        </p>
                                                                    )}

                                                                    {sim.alturaMax && sim.alturaMax !== "0" && (
                                                                        <p style={{
                                                                            margin: '4px 0 2px 0',
                                                                            padding: '4px',
                                                                            backgroundColor: '#fff',
                                                                            borderRadius: '3px',
                                                                            fontWeight: 'bold',
                                                                            color: '#dc3545'
                                                                        }}>
                                                                            🌊 Altura Máxima: {sim.alturaMax} m
                                                                        </p>
                                                                    )}

                                                                    {sim.tiempo && sim.tiempo !== "0" && (
                                                                        <p style={{ margin: '2px 0', fontSize: '11px', color: '#666' }}>
                                                                            ⏱️ Tiempo de llegada: {sim.tiempo} min
                                                                        </p>
                                                                    )}

                                                                    {sim.tiempoMax && sim.tiempoMax !== "0" && (
                                                                        <p style={{ margin: '2px 0', fontSize: '11px', color: '#666' }}>
                                                                            ⏱️ Tiempo máximo: {sim.tiempoMax} min
                                                                        </p>
                                                                    )}

                                                                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666' }}>
                                                                        <strong>Origen:</strong> {sim.origen}
                                                                    </p>

                                                                    {sim.imagen && (
                                                                        <div style={{ marginTop: '8px' }}>
                                                                            <p style={{ margin: '4px 0', fontSize: '11px', color: '#666', fontWeight: 'bold' }}>
                                                                                📸 Imagen de Simulación:
                                                                            </p>
                                                                            <img
                                                                                src={`http://localhost:4000/img?img=${sim.imagen}`}
                                                                                alt={`Simulación ${sim.localidad}`}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    maxWidth: '400px',
                                                                                    height: 'auto',
                                                                                    borderRadius: '4px',
                                                                                    border: '1px solid #ddd',
                                                                                    marginTop: '4px',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                                onClick={(e) => window.open(e.target.src, '_blank')}
                                                                                onError={(e) => {
                                                                                    e.target.style.display = 'none';
                                                                                    e.target.nextElementSibling.style.display = 'block';
                                                                                }}
                                                                            />
                                                                            <p style={{
                                                                                display: 'none',
                                                                                margin: '4px 0',
                                                                                fontSize: '10px',
                                                                                color: '#dc3545',
                                                                                fontStyle: 'italic'
                                                                            }}>
                                                                                ⚠️ No se pudo cargar la imagen: {sim.imagen}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                    })}
                                                </div>
                                            </>
                                        )}

                                        {(!escenario.simulaciones || escenario.simulaciones.length === 0) && (
                                            <div style={{
                                                marginTop: '10px',
                                                padding: '10px',
                                                backgroundColor: '#f8d7da',
                                                border: '1px solid #f5c6cb',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                color: '#721c24'
                                            }}>
                                                No hay simulaciones disponibles para este escenario.
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        )}
                    </MapContainer>
                </Col>
            </Row>

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

            {/* Card Flotante de Localidades */}
            {escenario && !escenario.old && escenario.simulaciones && escenario.simulaciones.length > 0 && (() => {
                // Obtener la primera localidad (Pacífico)
                const firstLocalidad = escenario.simulaciones[0];

                return (
                    <div style={{
                        position: 'fixed',
                        bottom: isCardExpanded ? '10px' : '80px',
                        right: isCardExpanded ? '10px' : '20px',
                        left: isCardExpanded ? '10px' : 'auto',
                        top: isCardExpanded ? '10px' : 'auto',
                        display: 'flex',
                        gap: '15px',
                        alignItems: isCardExpanded ? 'flex-start' : 'flex-end',
                        zIndex: 1000,
                    }}>
                        {/* Card de Localidades */}
                        <div
                            className={`floating-localidades-card ${isCardExpanded ? 'expanded' : ''}`}
                            onClick={toggleCard}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                padding: isCardExpanded ? '20px' : '15px',
                                cursor: isCardExpanded ? 'default' : 'pointer',
                                transition: 'all 0.3s ease',
                                maxWidth: isCardExpanded ? 'none' : '250px',
                                width: isCardExpanded ? 'auto' : '250px',
                                maxHeight: isCardExpanded ? 'none' : 'auto',
                                overflowY: isCardExpanded ? 'auto' : 'hidden',
                                flex: isCardExpanded ? '1' : '0 0 auto'
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: isCardExpanded ? '15px' : '12px',
                                borderBottom: isCardExpanded ? '2px solid #dee2e6' : 'none',
                                paddingBottom: isCardExpanded ? '12px' : '0'
                            }}>
                                <h6 style={{
                                    margin: 0,
                                    fontWeight: 'bold',
                                    color: '#2c3e50',
                                    fontSize: isCardExpanded ? '18px' : '14px'
                                }}>
                                    <i className="bi bi-geo-alt-fill me-2" style={{ color: '#0d6efd' }}></i>
                                    {isCardExpanded ? 'Localidades Afectadas' : firstLocalidad.localidad ? firstLocalidad.localidad.charAt(0).toUpperCase() + firstLocalidad.localidad.slice(1) : 'Localidad'}
                                </h6>
                                <i
                                    className={`bi bi-${isCardExpanded ? 'x-lg' : 'chevron-up'}`}
                                    style={{
                                        color: '#6c757d',
                                        fontSize: isCardExpanded ? '24px' : '18px',
                                        transition: 'transform 0.3s ease',
                                        cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleCard();
                                    }}
                                ></i>
                            </div>

                            {isCardExpanded && (
                                <div style={{ marginTop: '15px' }} onClick={(e) => e.stopPropagation()}>
                                    {/* 2-Column Grid Layout: [Map ~60%] [Table ~40%] */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '60% 40%',
                                        gap: '14px',
                                        marginBottom: '14px'
                                    }}>
                                        {/* LEFT: Large Map Card for Pacífico */}
                                        <div style={{
                                            backgroundColor: 'white',
                                            borderRadius: '12px',
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                                            border: '1px solid #dee2e6',
                                            padding: '14px',
                                            maxHeight: '480px',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}>
                                            {/* Header with expand button */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '10px',
                                                paddingBottom: '8px',
                                                borderBottom: '2px solid #0d6efd'
                                            }}>
                                                <div>
                                                    <h6 style={{ margin: 0, fontWeight: '700', color: '#1a1a1a', fontSize: '16px' }}>
                                                        <i className="bi bi-map" style={{ color: '#0d6efd', marginRight: '8px' }}></i>
                                                        Pacífico – Altura máx. ola
                                                    </h6>
                                                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#666' }}>
                                                        Simulación de tsunami
                                                    </p>
                                                </div>
                                                <button
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: '#0d6efd',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        cursor: 'pointer',
                                                        fontWeight: '600'
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (firstLocalidad?.imagen) {
                                                            window.open(`http://localhost:4000/img?img=${firstLocalidad.imagen}`, '_blank');
                                                        }
                                                    }}
                                                >
                                                    <i className="bi bi-arrows-fullscreen me-1"></i>
                                                    Ampliar
                                                </button>
                                            </div>

                                            {/* Scrollable map image */}
                                            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                                                {firstLocalidad?.imagen && (
                                                    <img
                                                        src={`http://localhost:4000/img?img=${firstLocalidad.imagen}`}
                                                        alt={`Mapa Pacífico`}
                                                        style={{
                                                            width: '100%',
                                                            height: 'auto',
                                                            maxWidth: '100%',
                                                            objectFit: 'contain',
                                                            borderRadius: '8px',
                                                            border: '1px solid #e0e0e0'
                                                        }}
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* RIGHT: Wide Table Panel */}
                                        {alturaData && (
                                            <div style={{
                                                backgroundColor: 'white',
                                                borderRadius: '12px',
                                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                                                padding: '14px',
                                                border: '1px solid #e0e0e0',
                                                maxHeight: '480px',
                                                display: 'flex',
                                                flexDirection: 'column'
                                            }}>
                                                {/* Header */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    marginBottom: '12px',
                                                    paddingBottom: '10px',
                                                    borderBottom: '2px solid #0d6efd'
                                                }}>
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        backgroundColor: '#e7f3ff',
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <i className="bi bi-water" style={{ color: '#0d6efd', fontSize: '20px' }}></i>
                                                    </div>
                                                    <div>
                                                        <h6 style={{ margin: 0, fontWeight: '700', color: '#1a1a1a', fontSize: '15px' }}>
                                                            Datos de Simulación
                                                        </h6>
                                                        <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                                                            {firstLocalidad.localidad?.charAt(0).toUpperCase() + firstLocalidad.localidad?.slice(1)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Scrollable table */}
                                                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                                                    {(() => {
                                                        let data = alturaData;
                                                        if (typeof data === 'string') {
                                                            try {
                                                                data = JSON.parse(data);
                                                            } catch (e) {
                                                                console.error('Error parsing alturaData:', e);
                                                                return null;
                                                            }
                                                        }

                                                        const rows = Array.isArray(data) ? data : (data && typeof data === 'object' ? [data] : []);

                                                        if (!rows || rows.length === 0) {
                                                            return (
                                                                <div style={{
                                                                    padding: '16px',
                                                                    backgroundColor: '#fff3cd',
                                                                    borderRadius: '8px',
                                                                    color: '#856404',
                                                                    fontSize: '12px',
                                                                    textAlign: 'center',
                                                                    border: '1px dashed #ffc107'
                                                                }}>
                                                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                                                    No hay datos disponibles
                                                                </div>
                                                            );
                                                        }

                                                        const columns = [
                                                            { key: 'localidad', label: 'Localidad', align: 'left' },
                                                            { key: 'altura', label: 'Altura', align: 'right' },
                                                            { key: 'tiempo', label: 'Tiempo', align: 'right' },
                                                            { key: 'estado', label: 'Estado', align: 'left' },
                                                            { key: 'fecha', label: 'Fecha', align: 'left' }
                                                        ];

                                                        return (
                                                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                                                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px' }}>
                                                                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5ff', zIndex: 1 }}>
                                                                        <tr>
                                                                            {columns.map(col => (
                                                                                <th key={col.key} style={{
                                                                                    textAlign: col.align,
                                                                                    padding: '10px 12px',
                                                                                    fontWeight: 700,
                                                                                    color: '#0d47a1',
                                                                                    borderBottom: '2px solid #0d6efd',
                                                                                    fontSize: '11px',
                                                                                    textTransform: 'uppercase',
                                                                                    letterSpacing: '0.5px'
                                                                                }}>
                                                                                    {col.label}
                                                                                </th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {rows.map((row, rIdx) => (
                                                                            <tr key={rIdx} style={{
                                                                                background: rIdx % 2 === 0 ? '#ffffff' : '#fafbfc',
                                                                                height: '38px'
                                                                            }}>
                                                                                {columns.map(col => {
                                                                                    const value = row?.[col.key];
                                                                                    if (col.key === 'estado') {
                                                                                        const hex = row?.estadoColor;
                                                                                        return (
                                                                                            <td key={col.key} style={{ padding: '8px 12px', borderBottom: '1px solid #eeeeee', textAlign: col.align }}>
                                                                                                {hex ? (
                                                                                                    <span style={{
                                                                                                        backgroundColor: hex,
                                                                                                        color: '#fff',
                                                                                                        padding: '3px 8px',
                                                                                                        borderRadius: '999px',
                                                                                                        fontSize: '11px',
                                                                                                        fontWeight: 600,
                                                                                                        whiteSpace: 'nowrap'
                                                                                                    }}>
                                                                                                        {String(value ?? '')}
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    String(value ?? '')
                                                                                                )}
                                                                                            </td>
                                                                                        );
                                                                                    }
                                                                                    return (
                                                                                        <td key={col.key} style={{
                                                                                            padding: '8px 12px',
                                                                                            borderBottom: '1px solid #eeeeee',
                                                                                            textAlign: col.align,
                                                                                            fontWeight: (col.align === 'right' ? 600 : 400)
                                                                                        }}>
                                                                                            {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
                                                                                        </td>
                                                                                    );
                                                                                })}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* BOTTOM: Stacked Horizontal Locality Cards */}
                                    {escenario.simulaciones.length > 1 && (
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
                                            gap: '14px',
                                            marginTop: '14px'
                                        }}>
                                            {escenario.simulaciones.slice(1).map((sim, idx) => (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '200px 1fr auto',
                                                        gap: '12px',
                                                        padding: '12px',
                                                        backgroundColor: '#fff',
                                                        borderRadius: '10px',
                                                        border: '1px solid #dee2e6',
                                                        alignItems: 'center',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                                        e.currentTarget.style.borderColor = '#0d6efd';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.boxShadow = 'none';
                                                        e.currentTarget.style.borderColor = '#dee2e6';
                                                    }}
                                                >
                                                    {/* Image Section (larger) */}
                                                    {sim.imagen && (
                                                        <div>
                                                            <img
                                                                src={`http://localhost:4000/img?img=${sim.imagen}`}
                                                                alt={`Simulación ${sim.localidad}`}
                                                                style={{
                                                                    width: '100%',
                                                                    height: '200px',
                                                                    objectFit: 'cover',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid #e0e0e0',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.open(`http://localhost:4000/img?img=${sim.imagen}`, '_blank');
                                                                }}
                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Data Section (compact rows) */}
                                                    <div>
                                                        <div style={{ marginBottom: '10px' }}>
                                                            <strong style={{ fontSize: 15, color: '#0d6efd', display: 'block', marginBottom: '4px' }}>
                                                                <i className="bi bi-geo-alt-fill me-1"></i>
                                                                {sim.localidad ? sim.localidad.charAt(0).toUpperCase() + sim.localidad.slice(1) : 'N/A'}
                                                            </strong>
                                                            {sim.origen && (
                                                                <span style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: '2px' }}>
                                                                    <i className="bi bi-compass me-1"></i>
                                                                    {sim.origen}
                                                                </span>
                                                            )}
                                                            {sim.caso && (
                                                                <span style={{ fontSize: 11, color: '#666', display: 'block' }}>
                                                                    <i className="bi bi-folder me-1"></i>
                                                                    Caso: {sim.caso}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: '10px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <i className="bi bi-water" style={{ color: '#17a2b8', fontSize: 16 }}></i>
                                                                <div>
                                                                    <strong style={{ color: '#dc3545', fontSize: 14 }}>{sim.altura ?? '—'}m</strong>
                                                                    <div style={{ fontSize: 10, color: '#6c757d' }}>Altura</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <i className="bi bi-clock" style={{ color: '#ff9800', fontSize: 16 }}></i>
                                                                <div>
                                                                    <strong style={{ color: '#ff9800', fontSize: 14 }}>{sim.tiempo ?? '—'}min</strong>
                                                                    <div style={{ fontSize: 10, color: '#6c757d' }}>Tiempo</div>
                                                                </div>
                                                            </div>
                                                            {sim.alturaMax && sim.alturaMax !== '0' && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <i className="bi bi-water" style={{ color: '#dc3545', fontSize: 16 }}></i>
                                                                    <div>
                                                                        <strong style={{ color: '#dc3545', fontSize: 14 }}>{sim.alturaMax}m</strong>
                                                                        <div style={{ fontSize: 10, color: '#6c757d' }}>Alt. Máx</div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {sim.tiempoMax && sim.tiempoMax !== '0' && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <i className="bi bi-clock-fill" style={{ color: '#ff9800', fontSize: 16 }}></i>
                                                                    <div>
                                                                        <strong style={{ color: '#ff9800', fontSize: 14 }}>{sim.tiempoMax}min</strong>
                                                                        <div style={{ fontSize: 10, color: '#6c757d' }}>T. Máx</div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Additional metadata */}
                                                        {(sim.fecha || sim.magnitud || sim.profundidad) && (
                                                            <div style={{
                                                                padding: '8px',
                                                                backgroundColor: '#f8f9fa',
                                                                borderRadius: '6px',
                                                                fontSize: 11,
                                                                color: '#495057'
                                                            }}>
                                                                {sim.fecha && (
                                                                    <div style={{ marginBottom: '4px' }}>
                                                                        <i className="bi bi-calendar-event me-1"></i>
                                                                        <strong>Fecha:</strong> {sim.fecha}
                                                                    </div>
                                                                )}
                                                                {sim.magnitud && (
                                                                    <div style={{ marginBottom: '4px' }}>
                                                                        <i className="bi bi-activity me-1"></i>
                                                                        <strong>Magnitud:</strong> {sim.magnitud}
                                                                    </div>
                                                                )}
                                                                {sim.profundidad && (
                                                                    <div>
                                                                        <i className="bi bi-arrow-down me-1"></i>
                                                                        <strong>Profundidad:</strong> {sim.profundidad} km
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Status Badge Section */}
                                                    {sim.estado && (
                                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                                            <span style={{
                                                                backgroundColor: getEstadoColor(sim.estado),
                                                                color: '#fff',
                                                                padding: '8px 14px',
                                                                borderRadius: 8,
                                                                fontSize: 12,
                                                                fontWeight: 700,
                                                                whiteSpace: 'nowrap',
                                                                textAlign: 'center',
                                                                minWidth: '90px'
                                                            }}>
                                                                {sim.estado}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isCardExpanded && (
                                <div>
                                    {/* Información compacta de la primera localidad */}
                                    {firstLocalidad.estado && (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            marginBottom: '10px'
                                        }}>
                                            <span style={{
                                                backgroundColor: getEstadoColor(firstLocalidad.estado),
                                                color: 'white',
                                                padding: '4px 12px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 'bold'
                                            }}>
                                                {firstLocalidad.estado}
                                            </span>
                                        </div>
                                    )}

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '8px',
                                        fontSize: '12px',
                                        color: '#495057',
                                        marginBottom: '12px'
                                    }}>
                                        {firstLocalidad.origen && (
                                            <div style={{ textAlign: 'center' }}>
                                                <i className="bi bi-geo-alt" style={{ color: '#17a2b8', display: 'block', fontSize: '16px', marginBottom: '4px' }}></i>
                                                <strong style={{ display: 'block', fontSize: '11px', color: '#495057' }}>{firstLocalidad.origen}</strong>
                                                <span style={{ fontSize: '10px', color: '#6c757d' }}>Origen</span>
                                            </div>
                                        )}
                                        {firstLocalidad.tiempo && firstLocalidad.tiempo !== "0" && (
                                            <div style={{ textAlign: 'center' }}>
                                                <i className="bi bi-clock" style={{ color: '#ffc107', display: 'block', fontSize: '16px', marginBottom: '4px' }}></i>
                                                <strong style={{ display: 'block', fontSize: '14px', color: '#ff9800' }}>{firstLocalidad.tiempo}min</strong>
                                                <span style={{ fontSize: '10px', color: '#6c757d' }}>Tiempo</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Imagen de la simulación */}
                                    {firstLocalidad.imagen && (
                                        <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                                            <img
                                                src={`http://localhost:4000/img?img=${firstLocalidad.imagen}`}
                                                alt={`Simulación ${firstLocalidad.localidad}`}
                                                style={{
                                                    width: '100%',
                                                    height: 'auto',
                                                    borderRadius: '8px',
                                                    border: '1px solid #dee2e6',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(e.target.src, '_blank');
                                                }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div style={{
                                        marginTop: '10px',
                                        fontSize: '11px',
                                        color: '#6c757d',
                                        textAlign: 'center',
                                        fontStyle: 'italic'
                                    }}>
                                        Clic para ver {escenario.simulaciones.length} localidades
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tabla de Altura movida dentro del bloque expandido junto a Pacífico */}
                    </div>
                );
            })()}
        </div>
    );
}

export default EarthquakeList;
