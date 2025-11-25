import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, Polyline } from 'react-leaflet';
import { Container, Row, Col, Card, Spinner, Alert, Badge, Button, Toast, ToastContainer, Form } from 'react-bootstrap';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import datosLC from '../../docs/datosLC.json';
import * as TileLayers from '../../TileLayers';
import FloatingLocalidadesCard from '../../components/FloatingLocalidadesCard';
import useEarthquakeStore, { initSocket } from '../../store/earthquakeStore';
import './PruebaSismo.css';

// Variable de entorno para la URL de la API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

// Componente para centrar el mapa cuando cambia la ubicación
function MapController({ center, zoom }) {
    const map = useMap();

    useEffect(() => {
        if (center) {
            map.setView(center, zoom);
        }
    }, [center, zoom, map]);

    return null;
}

// Componente para manejar clicks en el mapa
function MapClickHandler({ onMapClick }) {
    const map = useMap();

    useEffect(() => {
        const handleClick = (e) => {
            onMapClick(e.latlng);
        };

        map.on('click', handleClick);

        return () => {
            map.off('click', handleClick);
        };
    }, [map, onMapClick]);

    return null;
}

function PruebaSismo() {
    // Estado local para el formulario
    const [formData, setFormData] = useState({
        magnitud: 8,
        latitud: 2,
        longitud: -80,
        profundidad: 10,
        boletin: false
    });

    // Estado para el mapa y simulación
    const [mapCenter, setMapCenter] = useState([4.5709, -74.2973]); // Centro de Colombia por defecto
    const [mapZoom, setMapZoom] = useState(6);
    const [selectedLayer, setSelectedLayer] = useState('Esri_WorldImagery');
    const [escenario, setEscenario] = useState(null);
    const [alturaData, setAlturaData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastVariant, setToastVariant] = useState('success');
    // Estado para correo/boletín emitido por socket
    const [correoHtml, setCorreoHtml] = useState(null);
    const [correoMeta, setCorreoMeta] = useState(null);

    // Opciones de capas disponibles
    const layerOptions = {
        'Esri_WorldImagery': { name: 'Satélite (Esri)', layer: TileLayers.Esri_WorldImagery },
        'Esri_WorldTopoMap': { name: 'Topográfico (Esri)', layer: TileLayers.Esri_WorldTopoMap },
        'Esri_OceanBasemap': { name: 'Océano (Esri)', layer: TileLayers.Esri_OceanBasemap },
        'Esri_NatGeoWorldMap': { name: 'National Geographic', layer: TileLayers.Esri_NatGeoWorldMap },
        'CartoDB_Voyager': { name: 'CartoDB Voyager', layer: TileLayers.CartoDB_Voyager },
        'Esri_WorldStreetMap': { name: 'Calles (Esri)', layer: TileLayers.Esri_WorldStreetMap }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (value === '' ? '' : parseFloat(value))
        }));
    };

    const handleMapClick = (latlng) => {
        setFormData(prev => ({
            ...prev,
            latitud: parseFloat(latlng.lat.toFixed(4)),
            longitud: parseFloat(latlng.lng.toFixed(4))
        }));
        setMapCenter([latlng.lat, latlng.lng]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validar que todos los campos numéricos tengan valores válidos
        if (
            formData.magnitud === '' || isNaN(formData.magnitud) ||
            formData.latitud === '' || isNaN(formData.latitud) ||
            formData.longitud === '' || isNaN(formData.longitud) ||
            formData.profundidad === '' || isNaN(formData.profundidad)
        ) {
            setToastMessage('⚠️ Por favor completa todos los campos con valores válidos');
            setToastVariant('warning');
            setShowToast(true);
            return;
        }

        setLoading(true);

        try {
            const payload = {
                sismo: {
                    magnitud: formData.magnitud,
                    latitud: formData.latitud,
                    longitud: formData.longitud,
                    profundidad: formData.profundidad
                },
                boletin: formData.boletin
            };

            console.log('🔍 Ejecutando prueba de sismo:', payload);

            const response = await axios.post(`${API_URL}/api/temblor/prueba-sismo`, payload);
            const result = response.data;
            console.log('✅ Respuesta de prueba-sismo:', result);

            setEscenario(result.escenarios);

            // Centrar mapa en el sismo
            setMapCenter([formData.latitud, formData.longitud]);
            setMapZoom(7);

            // Verificar si es estructura antigua
            if (result.escenarios.old) {
                setToastMessage('⚠️ Escenario con estructura antigua detectado. No se mostrarán simulaciones detalladas.');
                setToastVariant('warning');
                setShowToast(true);
            } else {
                // Si no es old y tiene simulaciones, obtener datos de altura
                if (result.escenarios.simulaciones && result.escenarios.simulaciones.length > 0) {
                    const firstLocalidad = result.escenarios.simulaciones[0];
                    await fetchAlturaData(firstLocalidad);
                }

                setToastMessage('✅ Simulación ejecutada correctamente');
                setToastVariant('success');
                setShowToast(true);
            }
        } catch (error) {
            console.error('❌ Error:', error);
            let errorMessage = '❌ Error al ejecutar la simulación';

            if (error.response) {
                // El servidor respondió con un código de error
                const errorData = error.response.data;
                if (errorData?.message) {
                    errorMessage = `❌ ${errorData.message}`;
                } else if (errorData?.error) {
                    errorMessage = `❌ ${errorData.error}`;
                } else {
                    errorMessage = `❌ Error ${error.response.status}: ${error.response.statusText}`;
                }
            } else if (error.request) {
                // La petición se hizo pero no hubo respuesta
                errorMessage = '❌ Error de conexión con el servidor';
            } else {
                // Error al configurar la petición
                errorMessage = `❌ Error: ${error.message}`;
            }

            setToastMessage(errorMessage);
            setToastVariant('danger');
            setShowToast(true);
        } finally {
            setLoading(false);
        }
    };

    const fetchAlturaData = async (localidad) => {
        try {
            const alturaRequestData = {
                localidad: 'Pacifico',
                mag: formData.magnitud,
                fecha: new Date().toISOString(),
                sismoid: `PRUEBA_${Date.now()}`
            };

            if (localidad) {
                if (localidad.caso) {
                    alturaRequestData.caso = localidad.caso;
                } else if (localidad.origen) {
                    alturaRequestData.caso = localidad.origen;
                }
            }

            console.log('🔍 Solicitando datos de altura:', alturaRequestData);

            const response = await axios.post(`${API_URL}/api/findAltura`, alturaRequestData);
            console.log('✅ Datos de altura recibidos:', response.data);
            setAlturaData(response.data);
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

    // Escuchar evento 'abrirCorreo' del backend para mostrar el boletín
    useEffect(() => {
        try {
            const sock = initSocket();
            const handleAbrirCorreo = (data) => {
                try {
                    // data expected: { html: b, boletin, sismo: 'SismoPrueba', num, mag, time }
                    if (!data) return;
                    // Filtrar por el tipo de sismo si viene indicado
                    if (data.sismo && data.sismo !== 'SismoPrueba') return;

                    const html = data.html || data.b || '';
                    setCorreoHtml(html);
                    setCorreoMeta({ boletin: data.boletin, num: data.num, mag: data.mag, time: data.time });
                    setToastMessage('📧 Boletín recibido');
                    setToastVariant('info');
                    setShowToast(true);
                } catch (err) {
                    console.error('Error procesando abrirCorreo:', err);
                }
            };

            sock.on('abrirCorreo', handleAbrirCorreo);

            return () => {
                try { sock.off('abrirCorreo', handleAbrirCorreo); } catch (e) { /* ignore */ }
            };
        } catch (err) {
            console.error('No se pudo inicializar listener abrirCorreo:', err);
        }
    }, []);

    return (
        <div className="earthquake-list-container">
            <div className="list-header">
                <div className="d-flex justify-content-between align-items-start flex-wrap">
                    <div>
                        <h1>Prueba Manual de Sismo</h1>
                        <p>Ingresa los datos manualmente para ejecutar una simulación</p>
                        <small className="text-muted">💡 Haz clic en el mapa para actualizar las coordenadas</small>
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
            </div>

            <Row className="g-0 content-row">
                {/* Panel lateral con formulario */}
                <Col lg={4} className="info-panel">
                    <div className="info-content">
                        <Card className="earthquake-card">
                            <Card.Header>
                                <strong>Parámetros del Sismo</strong>
                            </Card.Header>
                            <Card.Body>
                                <Form onSubmit={handleSubmit}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Magnitud</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="magnitud"
                                            value={formData.magnitud}
                                            onChange={handleInputChange}
                                            step="0.1"
                                            min="0"
                                            max="10"
                                            required
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Latitud</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="latitud"
                                            value={formData.latitud}
                                            onChange={handleInputChange}
                                            step="0.0001"
                                            min="-90"
                                            max="90"
                                            required
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Longitud</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="longitud"
                                            value={formData.longitud}
                                            onChange={handleInputChange}
                                            step="0.0001"
                                            min="-180"
                                            max="180"
                                            required
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Profundidad (km)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="profundidad"
                                            value={formData.profundidad}
                                            onChange={handleInputChange}
                                            step="0.1"
                                            min="0"
                                            required
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Check
                                            type="checkbox"
                                            name="boletin"
                                            label="Generar Boletín"
                                            checked={formData.boletin}
                                            onChange={handleInputChange}
                                        />
                                    </Form.Group>

                                    <Button
                                        variant="warning"
                                        type="submit"
                                        className="w-100"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Spinner
                                                    as="span"
                                                    animation="border"
                                                    size="sm"
                                                    role="status"
                                                    aria-hidden="true"
                                                    className="me-2"
                                                />
                                                Ejecutando...
                                            </>
                                        ) : (
                                            'Ejecutar Simulación'
                                        )}
                                    </Button>
                                </Form>

                                {escenario && (
                                    <div className="mt-3">
                                        <hr />
                                        <h6><strong>Resultado</strong></h6>
                                        <div className="info-row">
                                            <strong>ID Escenario:</strong>
                                            <span>{escenario.idEscenario}</span>
                                        </div>
                                        {escenario.distancia && (
                                            <div className="info-row">
                                                <strong>Distancia:</strong>
                                                <span>{escenario.distancia.toFixed(2)} km</span>
                                            </div>
                                        )}
                                        {escenario.simulaciones && (
                                            <div className="info-row">
                                                <strong>Simulaciones:</strong>
                                                <Badge bg="info">{escenario.simulaciones.length}</Badge>
                                            </div>
                                        )}
                                        {escenario.old && (
                                            <Alert variant="warning" className="mt-2 mb-0" style={{ fontSize: '12px' }}>
                                                <div>
                                                    <strong>⚠️ Estructura Antigua</strong>
                                                    <p className="mb-0 mt-1">
                                                        Este escenario no contiene simulaciones detalladas de localidades.
                                                        No se mostrarán datos de altura ni tiempos de llegada.
                                                    </p>
                                                </div>
                                            </Alert>
                                        )}
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
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
                        <MapClickHandler onMapClick={handleMapClick} />

                        {/* Polígono Pacífico Local */}
                        <Polygon
                            positions={datosLC.latlonPacificoLocal}
                            pathOptions={{
                                color: 'red',
                                fillColor: '#EBC2C4',
                                fillOpacity: 0.4,
                                weight: 0.5
                            }}
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                }
                            }}
                            interactive={false}
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
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                }
                            }}
                            interactive={false}
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
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                }
                            }}
                            interactive={false}
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
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                }
                            }}
                            interactive={false}
                        >
                            <Popup>
                                <div>
                                    <strong>Caribe Local Insular</strong>
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
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                }
                            }}
                            interactive={false}
                        >
                            <Popup>
                                <div>
                                    <strong>Caribe Regional</strong>
                                </div>
                            </Popup>
                        </Polygon>

                        {/* Líneas divisorias */}
                        <Polyline
                            positions={datosLC.latlonPacificoLineaLocalRegional}
                            pathOptions={{
                                color: 'red',
                                weight: 0.5
                            }}
                        />
                        <Polyline
                            positions={datosLC.latlonCaribeLineaLocalRegional}
                            pathOptions={{
                                color: 'red',
                                weight: 0.5
                            }}
                        />
                        <Polyline
                            positions={datosLC.latlonCaribeLocalInsular}
                            pathOptions={{
                                color: 'red',
                                weight: 0.5
                            }}
                        />

                        {/* Polilíneas de localidades coloreadas por estado */}
                        {escenario && !escenario.old && escenario.simulaciones && escenario.simulaciones.length > 0 && (() => {
                            const getLocalidadColor = (localidadNombre) => {
                                const localidad = escenario.simulaciones.find(
                                    sim => sim.localidad && sim.localidad.toLowerCase() === localidadNombre.toLowerCase()
                                );
                                return localidad?.estadoColor || '#6c757d';
                            };

                            return (
                                <>
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

                        {/* Marker del sismo de prueba */}
                        {!isNaN(formData.latitud) && !isNaN(formData.longitud) && formData.latitud !== '' && formData.longitud !== '' && (
                            <Marker
                                position={[formData.latitud, formData.longitud]}
                                icon={earthquakeIcon}
                            >
                                <Popup>
                                    <div className="earthquake-popup">
                                        <h6><strong>Sismo de Prueba</strong></h6>
                                        <p><strong>Magnitud:</strong> {formData.magnitud}</p>
                                        <p><strong>Profundidad:</strong> {formData.profundidad} km</p>
                                        <p><strong>Coordenadas:</strong> {typeof formData.latitud === 'number' ? formData.latitud.toFixed(4) : formData.latitud}, {typeof formData.longitud === 'number' ? formData.longitud.toFixed(4) : formData.longitud}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {/* Marker del escenario */}
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
                                        <p style={{ margin: '4px 0' }}><strong>Sismo ID:</strong> {escenario.sismoid || 'N/A'}</p>

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
            </Row>

            {/* Toasts */}
            <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 9999 }}>
                <Toast
                    show={showToast}
                    onClose={() => setShowToast(false)}
                    bg={toastVariant}
                    autohide
                    delay={3000}
                >
                    <Toast.Header>
                        <strong className="me-auto">Notificación</strong>
                    </Toast.Header>
                    <Toast.Body className="text-white">
                        {toastMessage}
                    </Toast.Body>
                </Toast>
            </ToastContainer>

            {/* Floating card con datos de simulación */}
            <FloatingLocalidadesCard
                escenario={escenario}
                alturaData={alturaData}
                getEstadoColor={getEstadoColor}
            />

            {/* Card flotante para mostrar el boletín (correoHtml) */}
            {correoHtml && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '85vw',
                    maxWidth: '1200px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    zIndex: 10000,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    borderRadius: '12px',
                    backgroundColor: 'white'
                }}>
                    <Card style={{ margin: 0, border: 'none' }}>
                        <Card.Header className="d-flex justify-content-between align-items-center bg-info text-white">
                            <div>
                                <strong>📧 Boletín Generado</strong>
                                {correoMeta && correoMeta.num && (
                                    <span className="ms-2">#{correoMeta.num}</span>
                                )}
                            </div>
                            <Button
                                variant="light"
                                size="sm"
                                onClick={() => { setCorreoHtml(null); setCorreoMeta(null); }}
                                title="Cerrar"
                            >
                                ✕
                            </Button>
                        </Card.Header>
                        <Card.Body style={{ maxHeight: '80vh', overflowY: 'auto', padding: 0 }}>
                            {correoMeta && (
                                <div style={{
                                    fontSize: '13px',
                                    padding: '15px',
                                    backgroundColor: '#f8f9fa',
                                    borderBottom: '1px solid #dee2e6',
                                    color: '#666'
                                }}>
                                    {correoMeta.mag && <div><strong>Magnitud:</strong> {correoMeta.mag}</div>}
                                    {correoMeta.time && <div><strong>Fecha:</strong> {correoMeta.time}</div>}
                                </div>
                            )}
                            <iframe
                                srcDoc={correoHtml}
                                style={{
                                    width: '100%',
                                    minHeight: '600px',
                                    border: 'none',
                                    display: 'block'
                                }}
                                title="Boletín HTML"
                                sandbox="allow-same-origin"
                            />
                        </Card.Body>
                    </Card>
                </div>
            )}
        </div>
    );
}

export default PruebaSismo;