import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, Polyline } from 'react-leaflet';
import { Container, Row, Col, Card, Spinner, Alert, Badge, Pagination, Toast, ToastContainer, Form, Modal, Button } from 'react-bootstrap';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import useEarthquakeStore from '../../store/earthquakeStore';
import datosLC from '../../docs/datosLC.json';
import * as TileLayers from '../../TileLayers';
import dimarLogo from '../../assets/logo.png';
import './EarthquakeList.css';

// Configuración de la API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

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
    const [alturaData, setAlturaData] = useState(null); // Estado para almacenar datos de altura
    const [showSimulationModal, setShowSimulationModal] = useState(false);
    const [faultData, setFaultData] = useState({
        slip: 3.1,
        length: 180000,
        width: 90000,
        str: 325,
        dip: 18,
        rake: 63
    });
    const [isExecutingSimulation, setIsExecutingSimulation] = useState(false);
    const [existingRegionalSimulation, setExistingRegionalSimulation] = useState(null);
    const [simulationProgress, setSimulationProgress] = useState(null); // { localidad, porcentaje }
    const [simulationToast, setSimulationToast] = useState({ show: false, type: '', message: '' });
    const [showLocalidadesModal, setShowLocalidadesModal] = useState(false);

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
            setMapCenter([earthquakes[0].latitud, earthquakes[0].longitudOperativa]);
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
                setMapCenter([earthquakes[0].latitud, earthquakes[0].longitudOperativa]);
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

                const response = await axios.post(`${API_URL}/api/findSimulacion`, simulationData);
                const result = response.data;
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
            } catch (error) {
                console.error('❌ Error ejecutando simulación:', error);
                setEscenario(null);
                setAlturaData(null);
            }
        };

        executeSimulation();
    }, [currentPage, earthquakes]);

    // Verificar si existe simulación regional cuando cambia el sismo
    useEffect(() => {
        const checkExistingRegionalSimulation = async () => {
            if (!currentEarthquake) {
                setExistingRegionalSimulation(null);
                return;
            }

            // Solo verificar si es regional o lejano
            const isRegionalOrLejano = currentEarthquake.oceanoRegion &&
                (currentEarthquake.oceanoRegion.toLowerCase() === 'regional' ||
                    currentEarthquake.oceanoRegion.toLowerCase() === 'lejano');

            if (!isRegionalOrLejano) {
                setExistingRegionalSimulation(null);
                return;
            }

            try {
                console.log('🔍 Verificando simulación regional existente para:', currentEarthquake.id);
                const response = await axios.get(`${API_URL}/api/new-simulaciones-regionales/${currentEarthquake.id}`);
                const data = response.data;
                console.log('✅ Simulación regional encontrada:', data);
                setExistingRegionalSimulation(data);
            } catch (error) {
                // Si no existe (404) o cualquier otro error, simplemente no hay simulación
                console.log('ℹ️ No hay simulación regional existente para este sismo',error);
                setExistingRegionalSimulation(null);
            }
        };

        checkExistingRegionalSimulation();
    }, [currentPage, earthquakes]);

    // Listeners de socket para simulación regional
    useEffect(() => {
        const { socket } = useEarthquakeStore.getState();
        if (!socket) {
            console.log('⚠️ Socket aún no está disponible');
            return;
        }

        console.log('🔌 Configurando listeners de socket para simulación regional');

        // Cuando empieza la simulación
        const handleEmpezoSimulacion = (data) => {
            console.log('🚀 Simulación iniciada:', data);
            setSimulationToast({
                show: true,
                type: 'info',
                message: `Simulación iniciada para ${data.localidad}`
            });
            setSimulationProgress({ localidad: data.localidad, porcentaje: 0 });
        };

        // Progreso de la simulación
        const handleProgresoSimulacion = (data) => {
            console.log('📊 Progreso simulación:', data);
            setSimulationProgress({
                localidad: data.localidad,
                porcentaje: data.porcentaje,
                idSismo: data.idSismo
            });
        };

        // Simulación finalizada exitosamente
        const handleFinalizoSimulacion = async (data) => {
            console.log('✅ Simulación finalizada:', data);
            setSimulationToast({
                show: true,
                type: 'success',
                message: `Simulación completada exitosamente para ${data.localidad}`
            });
            setSimulationProgress(null);
            setIsExecutingSimulation(false);

            // Recargar la simulación regional existente
            if (currentEarthquake) {
                try {
                    const response = await axios.get(`${API_URL}/api/new-simulaciones-regionales/${currentEarthquake.id}`);
                    setExistingRegionalSimulation(response.data);
                    console.log('🔄 Simulación regional actualizada');
                } catch (error) {
                    console.log('ℹ️ No se pudo actualizar la simulación regional', error);
                }
            }

            // Auto-ocultar después de 5 segundos
            setTimeout(() => {
                setSimulationToast({ show: false, type: '', message: '' });
            }, 5000);
        };

        // Error en la simulación
        const handleErrorSimulacion = (data) => {
            console.error('❌ Error en simulación:', data);
            setSimulationToast({
                show: true,
                type: 'danger',
                message: `Error en simulación ${data.localidad}: ${data.error}`
            });
            setSimulationProgress(null);
            setIsExecutingSimulation(false);

            // Auto-ocultar después de 7 segundos
            setTimeout(() => {
                setSimulationToast({ show: false, type: '', message: '' });
            }, 7000);
        };

        socket.on('empezoSimulacion', handleEmpezoSimulacion);
        socket.on('progresoSimulacion', handleProgresoSimulacion);
        socket.on('finalizoSimulacion', handleFinalizoSimulacion);
        socket.on('errorSimulacion', handleErrorSimulacion);

        return () => {
            socket.off('empezoSimulacion', handleEmpezoSimulacion);
            socket.off('progresoSimulacion', handleProgresoSimulacion);
            socket.off('finalizoSimulacion', handleFinalizoSimulacion);
            socket.off('errorSimulacion', handleErrorSimulacion);
        };
    }, [currentEarthquake]);

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

            const response = await axios.post(`${API_URL}/api/findAltura`, alturaRequestData);
            const data = response.data;
            console.log('✅ Datos de altura recibidos:', data);
            setAlturaData(data);
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

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        const earthquake = earthquakes[pageNumber];
        if (earthquake) {
            // Centrar el mapa en el terremoto seleccionado con zoom
            setMapCenter([earthquake.latitud, earthquake.longitudOperativa]);
            setMapZoom(6);
        }
    };

    // Función para manejar cambios en el formulario fault
    const handleFaultChange = (field, value) => {
        setFaultData(prev => ({
            ...prev,
            [field]: parseFloat(value) || 0
        }));
    };

    // Función para ejecutar simulación personalizada
    const executeCustomSimulation = async () => {
        if (!currentEarthquake) return;

        setIsExecutingSimulation(true);
        try {
            const simulationPayload = {
                sismo: {
                    id: currentEarthquake.id,
                    oceano: currentEarthquake.oceano || "",
                    oceanoRegion: currentEarthquake.oceanoRegion || "",
                    closerTowns: currentEarthquake.closerTowns || "",
                    longitud: currentEarthquake.longitud || currentEarthquake.longitudOperativa,
                    latitud: currentEarthquake.latitud,
                    magnitud: currentEarthquake.magnitud,
                    profundidad: currentEarthquake.profundidad
                },
                fault: {
                    ...faultData,
                    longitud: currentEarthquake.longitudOperativa,
                    latitud: currentEarthquake.latitud,
                    depth: currentEarthquake.profundidad * 1000
                }
            };

            console.log('🚀 Ejecutando simulación personalizada:', simulationPayload);

            const response = await axios.post(`${API_URL}/api/temblor/simulacion-f1`, simulationPayload);
            const result = response.data;
            console.log('✅ Simulación personalizada completada:', result);

            // Cerrar modal
            setShowSimulationModal(false);

            // Mostrar notificación de éxito
            alert('Simulación ejecutada exitosamente');

            // Opcional: Recargar la simulación automática
            // Puedes agregar lógica adicional aquí si necesitas actualizar algo

        } catch (error) {
            console.error('❌ Error ejecutando simulación personalizada:', error);
            alert('Error al ejecutar la simulación: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsExecutingSimulation(false);
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
                <Col lg={3} className="info-panel">
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

                                    {currentEarthquake.url && (
                                        <div className="mt-3">
                                            <a
                                                href={currentEarthquake.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-warning w-100 mb-2"
                                            >
                                                <i className="bi bi-link-45deg me-2"></i>
                                                Ver detalles del sismo
                                            </a>
                                        </div>
                                    )}

                                    {currentEarthquake.oceanoRegion &&
                                        (currentEarthquake.oceanoRegion.toLowerCase() === 'regional' ||
                                            currentEarthquake.oceanoRegion.toLowerCase() === 'lejano') && (
                                            <div className="mt-2">
                                                <button
                                                    onClick={() => setShowSimulationModal(true)}
                                                    className="btn btn-warning w-100 mb-2"
                                                >
                                                    <i className="bi bi-cpu me-2"></i>
                                                    Ejecutar simulación
                                                </button>
                                            </div>
                                        )}

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
                <Col lg={6} className="map-panel">
                    <MapContainer
                        center={mapCenter}
                        zoom={mapZoom}
                        style={{ height: '100%', width: '100%' }}
                    // worldCopyJump={true}
                    // maxBoundsViscosity={1.0}
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

                        {/* Polilíneas de localidades coloreadas por estado de simulación */}
                        {escenario && !escenario.old && escenario.simulaciones && escenario.simulaciones.length > 0 && (() => {
                            // Buscar las localidades específicas y obtener su color de estado
                            const getLocalidadColor = (localidadNombre) => {
                                const localidad = escenario.simulaciones.find(
                                    sim => sim.localidad && sim.localidad.toLowerCase() === localidadNombre.toLowerCase()
                                );
                                // Retornar el estadoColor o un color por defecto
                                return localidad?.estadoColor || '#6c757d';
                            };

                            return (
                                <>
                                    {/* Polilínea Tumaco */}
                                    {datosLC.latlonTumaco && datosLC.latlonTumaco.length > 0 && (
                                        <Polyline
                                            positions={datosLC.latlonTumaco}
                                            pathOptions={{
                                                color: getLocalidadColor('tumaco'),
                                                weight: 3,
                                                opacity: 0.8
                                            }}
                                        >
                                            <Popup>
                                                <div>
                                                    <strong>Tumaco</strong>
                                                    {(() => {
                                                        const loc = escenario.simulaciones.find(
                                                            sim => sim.localidad && sim.localidad.toLowerCase() === 'tumaco'
                                                        );
                                                        return loc ? (
                                                            <>
                                                                <p style={{ margin: '4px 0' }}><strong>Estado:</strong> {loc.estado}</p>
                                                                {loc.altura && <p style={{ margin: '4px 0' }}><strong>Altura:</strong> {loc.altura}m</p>}
                                                                {loc.tiempo && <p style={{ margin: '4px 0' }}><strong>Tiempo:</strong> {loc.tiempo}min</p>}
                                                            </>
                                                        ) : null;
                                                    })()}
                                                </div>
                                            </Popup>
                                        </Polyline>
                                    )}

                                    {/* Polilínea Buenaventura */}
                                    {datosLC.latlonBuenaventura && datosLC.latlonBuenaventura.length > 0 && (
                                        <Polyline
                                            positions={datosLC.latlonBuenaventura}
                                            pathOptions={{
                                                color: getLocalidadColor('buenaventura'),
                                                weight: 3,
                                                opacity: 0.8
                                            }}
                                        >
                                            <Popup>
                                                <div>
                                                    <strong>Buenaventura</strong>
                                                    {(() => {
                                                        const loc = escenario.simulaciones.find(
                                                            sim => sim.localidad && sim.localidad.toLowerCase() === 'buenaventura'
                                                        );
                                                        return loc ? (
                                                            <>
                                                                <p style={{ margin: '4px 0' }}><strong>Estado:</strong> {loc.estado}</p>
                                                                {loc.altura && <p style={{ margin: '4px 0' }}><strong>Altura:</strong> {loc.altura}m</p>}
                                                                {loc.tiempo && <p style={{ margin: '4px 0' }}><strong>Tiempo:</strong> {loc.tiempo}min</p>}
                                                            </>
                                                        ) : null;
                                                    })()}
                                                </div>
                                            </Popup>
                                        </Polyline>
                                    )}

                                    {/* Polilínea Juanchaco */}
                                    {datosLC.latlonJuanchaco && datosLC.latlonJuanchaco.length > 0 && (
                                        <Polyline
                                            positions={datosLC.latlonJuanchaco}
                                            pathOptions={{
                                                color: getLocalidadColor('juanchaco'),
                                                weight: 3,
                                                opacity: 0.8
                                            }}
                                        >
                                            <Popup>
                                                <div>
                                                    <strong>Juanchaco</strong>
                                                    {(() => {
                                                        const loc = escenario.simulaciones.find(
                                                            sim => sim.localidad && sim.localidad.toLowerCase() === 'juanchaco'
                                                        );
                                                        return loc ? (
                                                            <>
                                                                <p style={{ margin: '4px 0' }}><strong>Estado:</strong> {loc.estado}</p>
                                                                {loc.altura && <p style={{ margin: '4px 0' }}><strong>Altura:</strong> {loc.altura}m</p>}
                                                                {loc.tiempo && <p style={{ margin: '4px 0' }}><strong>Tiempo:</strong> {loc.tiempo}min</p>}
                                                            </>
                                                        ) : null;
                                                    })()}
                                                </div>
                                            </Popup>
                                        </Polyline>
                                    )}
                                </>
                            );
                        })()}


                        {currentEarthquake && (
                            <Marker
                                position={[currentEarthquake.latitud, currentEarthquake.longitudOperativa]}
                                icon={earthquakeIcon}
                            >
                                <Popup>
                                    <div className="earthquake-popup">
                                        <h6><strong>{currentEarthquake.place}</strong></h6>
                                        <p><strong>Magnitud:</strong> {currentEarthquake.magnitud}</p>
                                        <p><strong>Profundidad:</strong> {currentEarthquake.profundidad.toFixed(2)} km</p>
                                        <p><strong>Fecha:</strong> {currentEarthquake.localTime}</p>
                                        {currentEarthquake.url && (
                                            <a
                                                href={currentEarthquake.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-warning btn-sm w-100 mt-2"
                                            >
                                                <i className="bi bi-link-45deg me-1"></i>
                                                Ver detalles
                                            </a>
                                        )}
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
                                                                                src={`${API_URL}/img/old/?img=${sim.localidad ? sim.localidad.toUpperCase() : 'CARTAGENA'}/${sim.IMAGEN}`}
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
                                                                                src={`${API_URL}/img?img=${sim.imagen}`}
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

                {/* Panel derecho para información de simulaciones */}
                <Col lg={3} className="info-panel" style={{ borderLeft: '1px solid #dee2e6' }}>
                    <div className="info-content">
                        {/* Logo DIMAR */}
                        <div style={{ textAlign: 'center', marginBottom: '20px', paddingTop: '10px' }}>
                            <img
                                src={dimarLogo}
                                alt="DIMAR Logo"
                                style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    maxHeight: '220px'
                                }}
                            />
                        </div>

                        {/* Card de Simulación Local (Pacífico) */}
                        {currentEarthquake && currentEarthquake.oceano && (
                            !(currentEarthquake.oceanoRegion &&
                                (currentEarthquake.oceanoRegion.toLowerCase() === 'regional' ||
                                    currentEarthquake.oceanoRegion.toLowerCase() === 'lejano')) && escenario && escenario.simulaciones && escenario.simulaciones.length > 0 ? (
                                <Card className="mb-3" style={{ border: '2px solid #0d6efd' }}>
                                    <Card.Header style={{ backgroundColor: '#0d6efd', color: 'white', fontWeight: 'bold' }}>
                                        🌊 Simulación Local - Pacífico
                                    </Card.Header>
                                    <Card.Body>
                                        {(() => {
                                            const pacificoSim = escenario.simulaciones.find(
                                                sim => sim.localidad && sim.localidad.toLowerCase() === 'pacifico'
                                            );
                                            
                                            if (pacificoSim && pacificoSim.imagen) {
                                                return (
                                                    <>
                                                        <div style={{ marginBottom: '12px' }}>
                                                            <img
                                                                src={`${API_URL}/img?img=${pacificoSim.imagen}`}
                                                                alt="Simulación Pacífico"
                                                                style={{
                                                                    width: '100%',
                                                                    height: 'auto',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid #ddd',
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
                                                                fontSize: '11px',
                                                                color: '#dc3545',
                                                                fontStyle: 'italic'
                                                            }}>
                                                                ⚠️ No se pudo cargar la imagen
                                                            </p>
                                                        </div>
                                                        
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            className="w-100"
                                                            onClick={() => setShowLocalidadesModal(true)}
                                                        >
                                                            <i className="bi bi-eye me-2"></i>
                                                            Ver más detalles
                                                        </Button>
                                                    </>
                                                );
                                            } else {
                                                return (
                                                    <Alert variant="info" className="mb-0">
                                                        <small>No hay imagen de simulación disponible para Pacífico.</small>
                                                    </Alert>
                                                );
                                            }
                                        })()}
                                    </Card.Body>
                                </Card>
                            ) : null
                        )}

                        {/* Card de simulación regional o mensaje de no amenaza */}
                        {currentEarthquake && currentEarthquake.oceano && (
                            !(currentEarthquake.oceanoRegion &&
                                (currentEarthquake.oceanoRegion.toLowerCase() === 'regional' ||
                                    currentEarthquake.oceanoRegion.toLowerCase() === 'lejano')) ? (
                                // Mensaje cuando NO es regional/lejano (sismos locales) - Solo mostrar si NO hay escenario con simulaciones
                                !(escenario && escenario.simulaciones && escenario.simulaciones.length > 0) && (
                                    <Card className="mb-3" style={{ border: '2px solid #28a745' }}>
                                        <Card.Header style={{ backgroundColor: '#28a745', color: 'white', fontWeight: 'bold' }}>
                                            ✅ Información de Tsunami
                                        </Card.Header>
                                        <Card.Body>
                                            <Alert variant="success" className="mb-0">
                                                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                                    El sismo <strong>{currentEarthquake.id}</strong> reportado por <strong>{currentEarthquake.fuente || currentEarthquake.fuenteApi}</strong> de magnitud <strong>Mw {currentEarthquake.magnitud}</strong> de origen <strong>{currentEarthquake.oceanoRegion || 'local'}</strong> NO representa una amenaza para la costa <strong>{currentEarthquake.oceano}</strong> colombiana teniendo en cuenta el Protocolo Nacional de Detección y Alerta de Tsunamis.
                                                </p>
                                            </Alert>
                                        </Card.Body>
                                    </Card>
                                )
                            ) : (
                                // Card de simulación regional existente
                                <Card className="mb-3" style={{ border: '2px solid #17a2b8' }}>
                                    <Card.Header style={{ backgroundColor: '#17a2b8', color: 'white', fontWeight: 'bold' }}>
                                        🌊 Simulación Regional
                                    </Card.Header>
                                    <Card.Body>
                                        {existingRegionalSimulation ? (
                                            <>
                                                <Alert variant="info" className="mb-3">
                                                    <small>
                                                        <strong>ℹ️ Información:</strong> Ya existe una simulación para este sismo.
                                                        Puedes ejecutar una nueva si lo deseas.
                                                    </small>
                                                </Alert>

                                                {existingRegionalSimulation.sismo && (
                                                    <div className="mb-3">
                                                        <h6 style={{ fontWeight: 'bold', marginBottom: '10px', color: '#17a2b8' }}>Datos del Sismo</h6>
                                                        <div style={{ fontSize: '13px' }}>
                                                            <p style={{ margin: '4px 0' }}><strong>ID:</strong> {existingRegionalSimulation.idSismo || existingRegionalSimulation.sismo.id}</p>
                                                            {existingRegionalSimulation.sismo.magnitud && (
                                                                <p style={{ margin: '4px 0' }}><strong>Magnitud:</strong> {existingRegionalSimulation.sismo.magnitud}</p>
                                                            )}
                                                            {existingRegionalSimulation.sismo.profundidad && (
                                                                <p style={{ margin: '4px 0' }}><strong>Profundidad:</strong> {existingRegionalSimulation.sismo.profundidad} m</p>
                                                            )}
                                                            {existingRegionalSimulation.sismo.oceano && (
                                                                <p style={{ margin: '4px 0' }}><strong>Océano:</strong> {existingRegionalSimulation.sismo.oceano}</p>
                                                            )}
                                                            {existingRegionalSimulation.sismo.oceanoRegion && (
                                                                <p style={{ margin: '4px 0' }}><strong>Región:</strong> {existingRegionalSimulation.sismo.oceanoRegion}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {existingRegionalSimulation.fault && (
                                                    <div className="mb-3">
                                                        <h6 style={{ fontWeight: 'bold', marginBottom: '10px', color: '#17a2b8' }}>Parámetros de Falla</h6>
                                                        <div style={{ fontSize: '13px' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                                {existingRegionalSimulation.fault.slip && (
                                                                    <p style={{ margin: '2px 0' }}><strong>Slip:</strong> {existingRegionalSimulation.fault.slip}</p>
                                                                )}
                                                                {existingRegionalSimulation.fault.length && (
                                                                    <p style={{ margin: '2px 0' }}><strong>Length:</strong> {existingRegionalSimulation.fault.length} m</p>
                                                                )}
                                                                {existingRegionalSimulation.fault.width && (
                                                                    <p style={{ margin: '2px 0' }}><strong>Width:</strong> {existingRegionalSimulation.fault.width} m</p>
                                                                )}
                                                                {existingRegionalSimulation.fault.str && (
                                                                    <p style={{ margin: '2px 0' }}><strong>Strike:</strong> {existingRegionalSimulation.fault.str}°</p>
                                                                )}
                                                                {existingRegionalSimulation.fault.dip && (
                                                                    <p style={{ margin: '2px 0' }}><strong>Dip:</strong> {existingRegionalSimulation.fault.dip}°</p>
                                                                )}
                                                                {existingRegionalSimulation.fault.rake && (
                                                                    <p style={{ margin: '2px 0' }}><strong>Rake:</strong> {existingRegionalSimulation.fault.rake}°</p>
                                                                )}
                                                                {existingRegionalSimulation.fault.depth && (
                                                                    <p style={{ margin: '2px 0' }}><strong>Depth:</strong> {existingRegionalSimulation.fault.depth} m</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {existingRegionalSimulation.archivos && (
                                                    <div className="mb-3">
                                                        <h6 style={{ fontWeight: 'bold', marginBottom: '10px', color: '#17a2b8' }}>Imágenes de Simulación</h6>

                                                        {/* Imagen Wave 1 */}
                                                        {existingRegionalSimulation.archivos.wave1Png && (
                                                            <div style={{ marginBottom: '12px' }}>
                                                                <p style={{ margin: '4px 0 8px 0', fontSize: '13px', fontWeight: 'bold' }}>
                                                                    🌊 Wave 1
                                                                </p>
                                                                <img
                                                                    src={`${API_URL}/img/regionales/${existingRegionalSimulation.idSismo}/wave_1.png`}
                                                                    alt="Wave 1"
                                                                    style={{
                                                                        width: '100%',
                                                                        height: 'auto',
                                                                        borderRadius: '4px',
                                                                        border: '1px solid #ddd',
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
                                                                    fontSize: '11px',
                                                                    color: '#dc3545',
                                                                    fontStyle: 'italic'
                                                                }}>
                                                                    ⚠️ No se pudo cargar la imagen
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Imagen Zmax */}
                                                        {existingRegionalSimulation.archivos.zmaxPng && (
                                                            <div style={{ marginBottom: '12px' }}>
                                                                <p style={{ margin: '4px 0 8px 0', fontSize: '13px', fontWeight: 'bold' }}>
                                                                    📊 Zmax
                                                                </p>
                                                                <img
                                                                    src={`${API_URL}/img/regionales/${existingRegionalSimulation.idSismo}/zmax.png`}
                                                                    alt="Zmax"
                                                                    style={{
                                                                        width: '100%',
                                                                        height: 'auto',
                                                                        borderRadius: '4px',
                                                                        border: '1px solid #ddd',
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
                                                                    fontSize: '11px',
                                                                    color: '#dc3545',
                                                                    fontStyle: 'italic'
                                                                }}>
                                                                    ⚠️ No se pudo cargar la imagen
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Imagen Max5 */}
                                                        {existingRegionalSimulation.archivos.max5Png && (
                                                            <div style={{ marginBottom: '12px' }}>
                                                                <p style={{ margin: '4px 0 8px 0', fontSize: '13px', fontWeight: 'bold' }}>
                                                                    📈 Max5
                                                                </p>
                                                                <img
                                                                    src={`${API_URL}/img/regionales/${existingRegionalSimulation.idSismo}/max5.png`}
                                                                    alt="Max5"
                                                                    style={{
                                                                        width: '100%',
                                                                        height: 'auto',
                                                                        borderRadius: '4px',
                                                                        border: '1px solid #ddd',
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
                                                                    fontSize: '11px',
                                                                    color: '#dc3545',
                                                                    fontStyle: 'italic'
                                                                }}>
                                                                    ⚠️ No se pudo cargar la imagen
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {existingRegionalSimulation.createdAt && (
                                                    <div style={{
                                                        marginTop: '12px',
                                                        padding: '8px',
                                                        backgroundColor: '#f8f9fa',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        color: '#666'
                                                    }}>
                                                        <strong>Fecha de creación:</strong> {new Date(existingRegionalSimulation.createdAt).toLocaleString('es-CO')}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <Alert variant="warning" className="mb-0">
                                                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                                    El sismo <strong>{currentEarthquake.id}</strong> reportado por <strong>{currentEarthquake.fuente || currentEarthquake.fuenteApi}</strong> de magnitud <strong>Mw {currentEarthquake.magnitud}</strong> de origen <strong>{currentEarthquake.oceanoRegion}</strong> NO representa una amenaza para la costa <strong>{currentEarthquake.oceano}</strong> colombiana teniendo en cuenta el Protocolo Nacional de Detección y Alerta de Tsunamis.
                                                </p>
                                            </Alert>
                                        )}
                                    </Card.Body>
                                </Card>
                            )
                        )}
                    </div>
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

                {/* Toast de simulación */}
                <Toast
                    show={simulationToast.show}
                    onClose={() => setSimulationToast({ show: false, type: '', message: '' })}
                    bg={simulationToast.type}
                    autohide={false}
                >
                    <Toast.Header>
                        <strong className="me-auto">
                            {simulationToast.type === 'info' && '🚀 Simulación'}
                            {simulationToast.type === 'success' && '✅ Simulación Exitosa'}
                            {simulationToast.type === 'danger' && '❌ Error de Simulación'}
                        </strong>
                    </Toast.Header>
                    <Toast.Body className="text-white">
                        {simulationToast.message}
                        {simulationProgress && (
                            <div className="mt-2">
                                <div className="d-flex justify-content-between mb-1">
                                    <small>Progreso:</small>
                                    <small>{simulationProgress.porcentaje}%</small>
                                </div>
                                <div className="progress" style={{ height: '20px' }}>
                                    <div
                                        className="progress-bar progress-bar-striped progress-bar-animated"
                                        role="progressbar"
                                        style={{ width: `${simulationProgress.porcentaje}%` }}
                                        aria-valuenow={simulationProgress.porcentaje}
                                        aria-valuemin="0"
                                        aria-valuemax="100"
                                    >
                                        {simulationProgress.porcentaje}%
                                    </div>
                                </div>
                            </div>
                        )}
                    </Toast.Body>
                </Toast>
            </ToastContainer>            {/* Modal para simulación personalizada */}
            <Modal show={showSimulationModal} onHide={() => setShowSimulationModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Ejecutar Simulación Personalizada</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {currentEarthquake && (
                        <>
                            <Alert variant="info" className="mb-3">
                                <strong>Sismo seleccionado:</strong> {currentEarthquake.place}<br />
                                <strong>Magnitud:</strong> {currentEarthquake.magnitud} |
                                <strong> Océano:</strong> {currentEarthquake.oceano} |
                                <strong> Región:</strong> {currentEarthquake.oceanoRegion}
                            </Alert>

                            <h6 className="mb-3">Parámetros de Falla (Fault)</h6>
                            <Alert variant="secondary" className="mb-3">
                                <small>
                                    <strong>Nota:</strong> Los valores de longitud ({currentEarthquake.longitudOperativa.toFixed(4)}),
                                    latitud ({currentEarthquake.latitud.toFixed(4)}) y
                                    depth ({(currentEarthquake.profundidad * 1000).toFixed(0)} m)
                                    se tomarán automáticamente del sismo seleccionado.
                                </small>
                            </Alert>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Slip</Form.Label>
                                        <Form.Control
                                            type="number"
                                            step="0.1"
                                            value={faultData.slip}
                                            onChange={(e) => handleFaultChange('slip', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Length (metros)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={faultData.length}
                                            onChange={(e) => handleFaultChange('length', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Width (metros)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={faultData.width}
                                            onChange={(e) => handleFaultChange('width', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Strike (str)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={faultData.str}
                                            onChange={(e) => handleFaultChange('str', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Dip</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={faultData.dip}
                                            onChange={(e) => handleFaultChange('dip', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Rake</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={faultData.rake}
                                            onChange={(e) => handleFaultChange('rake', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSimulationModal(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={executeCustomSimulation}
                        disabled={isExecutingSimulation}
                    >
                        {isExecutingSimulation ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Ejecutando...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-play-circle me-2"></i>
                                Ejecutar Simulación
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal de Localidades Afectadas */}
            <Modal show={showLocalidadesModal} onHide={() => setShowLocalidadesModal(false)} size="xl" dialogClassName="modal-90w">
                <Modal.Header closeButton>
                    <Modal.Title>Localidades Afectadas</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                    {escenario && escenario.simulaciones && escenario.simulaciones.length > 0 ? (
                        <>
                            <Alert variant="info" className="mb-3">
                                <strong>Escenario:</strong> {escenario.idEscenario || 'N/A'} | 
                                <strong> Distancia:</strong> {escenario.distancia ? escenario.distancia.toFixed(2) : 'N/A'} km
                            </Alert>

                            {/* 3-Column Grid Layout */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '30% 25% 45%',
                                gap: '14px',
                                marginBottom: '14px'
                            }}>
                                {/* LEFT: Pacifico Map Card */}
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
                                                if (escenario.simulaciones[0]?.imagen) {
                                                    window.open(`${API_URL}/img?img=${escenario.simulaciones[0].imagen}`, '_blank');
                                                }
                                            }}
                                        >
                                            <i className="bi bi-arrows-fullscreen me-1"></i>
                                            Ampliar
                                        </button>
                                    </div>

                                    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                                        {escenario.simulaciones[0]?.imagen && (
                                            <img
                                                src={`${API_URL}/img?img=${escenario.simulaciones[0].imagen}`}
                                                alt="Mapa Pacífico"
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

                                {/* CENTER: Wave Image Card */}
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
                                                <i className="bi bi-water" style={{ color: '#0d6efd', marginRight: '8px' }}></i>
                                                Ola máxima
                                            </h6>
                                            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#666' }}>
                                                Visualización de onda
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
                                                if (escenario.simulaciones[0]?.imagen) {
                                                    const imgPath = escenario.simulaciones[0].imagen;
                                                    const pathParts = imgPath.split('/');
                                                    if (pathParts.length >= 4) {
                                                        const basePath = pathParts.slice(0, 4).join('/');
                                                        const waveUrl = `${API_URL}/img?img=${encodeURIComponent(basePath + '/result/max1.png')}&name=wave`;
                                                        window.open(waveUrl, '_blank');
                                                    }
                                                }
                                            }}
                                        >
                                            <i className="bi bi-arrows-fullscreen me-1"></i>
                                            Ampliar
                                        </button>
                                    </div>

                                    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                                        {(() => {
                                            if (escenario.simulaciones[0]?.imagen) {
                                                const imgPath = escenario.simulaciones[0].imagen;
                                                const pathParts = imgPath.split('/');
                                                if (pathParts.length >= 4) {
                                                    const basePath = pathParts.slice(0, 4).join('/');
                                                    const waveUrl = `${API_URL}/img?img=${encodeURIComponent(basePath + '/result/max1.png')}&name=wave`;
                                                    return (
                                                        <img
                                                            src={waveUrl}
                                                            alt="Ola máxima"
                                                            style={{
                                                                width: '100%',
                                                                height: 'auto',
                                                                maxWidth: '100%',
                                                                objectFit: 'contain',
                                                                borderRadius: '8px',
                                                                border: '1px solid #e0e0e0'
                                                            }}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                const sibling = e.target.nextElementSibling;
                                                                if (sibling) sibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    );
                                                }
                                            }
                                            return (
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    height: '200px',
                                                    backgroundColor: '#f8f9fa',
                                                    borderRadius: '8px',
                                                    color: '#6c757d',
                                                    fontSize: '12px',
                                                    textAlign: 'center',
                                                    padding: '20px'
                                                }}>
                                                    <div>
                                                        <i className="bi bi-image" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}></i>
                                                        No hay ruta de imagen disponible
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <div style={{
                                            display: 'none',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            height: '200px',
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '8px',
                                            color: '#6c757d',
                                            fontSize: '12px',
                                            textAlign: 'center',
                                            padding: '20px'
                                        }}>
                                            <div>
                                                <i className="bi bi-image" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}></i>
                                                Error al cargar la imagen
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT: Table Panel */}
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
                                                    {escenario.simulaciones[0]?.localidad?.charAt(0).toUpperCase() + escenario.simulaciones[0]?.localidad?.slice(1)}
                                                </p>
                                            </div>
                                        </div>

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

                            {/* BOTTOM: Locality Cards */}
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
                                            {sim.imagen && (
                                                <div>
                                                    <img
                                                        src={`${API_URL}/img?img=${sim.imagen}`}
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
                                                            window.open(`${API_URL}/img?img=${sim.imagen}`, '_blank');
                                                        }}
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                </div>
                                            )}

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
                        </>
                    ) : (
                        <Alert variant="warning" className="mb-0">
                            <p style={{ margin: 0 }}>No hay datos de simulación disponibles para este sismo.</p>
                        </Alert>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowLocalidadesModal(false)}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default EarthquakeList;
