import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline } from 'react-leaflet';
import { Badge, Spinner, Alert, Form } from 'react-bootstrap';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import useEarthquakeStore from '../../store/earthquakeStore';
import datosLC from '../../docs/datosLC.json';
import * as TileLayers from '../../TileLayers';
import './Escenarios.css';

// Fix para los iconos de Leaflet en producción
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Crear icono personalizado para escenarios
const escenarioIcon = new L.Icon({
    iconUrl: '/Escenario.png',
    shadowUrl: '/shadow.png',
    iconSize: [32, 47],
    iconAnchor: [16, 46],
    popupAnchor: [0, -48],
    shadowSize: [49, 47],
    shadowAnchor: [3, 47]
});

function Escenarios() {
    const { escenarios, escenariosOld, escenariosLoading, escenariosError, fetchEscenarios } = useEarthquakeStore();
    const [selectedLayer, setSelectedLayer] = useState('Esri_WorldImagery');
    const [filterTipo, setFilterTipo] = useState('todos');

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
        fetchEscenarios();
    }, [fetchEscenarios]);

    // Filtrar escenarios por océano (determinado por coordenadas)
    const getOceanoByCoordinates = (lat, lng) => {
        // Pacífico: longitud oeste de -77 a -81
        // Caribe: latitud norte de 8 grados o longitud este de -77
        if (lng < -77) {
            return 'Pacífico';
        } else {
            return 'Caribe';
        }
    };

    // Normalizar escenarios nuevos (minúsculas) - LOCALES
    const escenariosNormalizados = escenarios.map(esc => ({
        ...esc,
        id: esc.idEscenario,
        latitud: parseFloat(esc.latitud),
        longitud: parseFloat(esc.longitud),
        oceano: getOceanoByCoordinates(parseFloat(esc.latitud), parseFloat(esc.longitud)),
        tipo: 'Locales',
        activo: true
    }));

    // Normalizar escenarios old (MAYÚSCULAS) - REGIONALES Y LEJANOS
    const escenariosOldNormalizados = escenariosOld.map(esc => ({
        ...esc,
        id: esc.ID_ESCENARIO,
        latitud: parseFloat(esc.LATITUD),
        longitud: parseFloat(esc.LONGITUD),
        oceano: getOceanoByCoordinates(parseFloat(esc.LATITUD), parseFloat(esc.LONGITUD)),
        tipo: 'Regionales y Lejanos',
        activo: esc.ACTIVO
    }));

    // Combinar ambos tipos de escenarios
    const todosLosEscenarios = [...escenariosNormalizados, ...escenariosOldNormalizados];

    // Filtrar escenarios por tipo
    const filteredEscenarios = filterTipo === 'todos'
        ? todosLosEscenarios
        : todosLosEscenarios.filter(esc => esc.tipo === filterTipo);

    // Obtener tipos únicos para el filtro
    const tiposUnicos = ['todos', 'Locales', 'Regionales y Lejanos'];

    // Estadísticas
    const totalEscenarios = todosLosEscenarios.length;
    const escenariosLocales = escenariosNormalizados.length;
    const escenariosRegionalesLejanos = escenariosOldNormalizados.filter(esc => esc.activo).length;

    return (
        <div className="escenarios-container">
            <div className="escenarios-header">
                <div className="d-flex justify-content-between align-items-start flex-wrap">
                    <div>
                        <h1>Escenarios de Tsunami</h1>
                        <p>Visualización de escenarios precomputados en el mapa</p>
                    </div>
                    <div className="d-flex gap-2 align-items-center mt-2">
                        <Badge bg="primary">Total: {totalEscenarios} escenarios</Badge>
                        {escenariosLoading && (
                            <Badge bg="info">
                                <Spinner animation="border" size="sm" className="me-1" />
                                Cargando...
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            <div className="escenarios-map-container">
                {escenariosError && (
                    <Alert variant="danger" className="m-3">
                        {escenariosError}
                    </Alert>
                )}

                <MapContainer
                    center={[4.5709, -74.2973]}
                    zoom={6}
                    style={{ height: '100%', width: '100%' }}
                    worldCopyJump={true}
                    maxBoundsViscosity={1.0}
                >
                    <TileLayer
                        key={selectedLayer}
                        url={layerOptions[selectedLayer].layer.url}
                        attribution={layerOptions[selectedLayer].layer.attribution}
                    />

                    {/* Polígonos de zonas sísmicas */}
                    <Polygon
                        positions={datosLC.latlonPacificoLocal}
                        pathOptions={{
                            color: 'red',
                            fillColor: '#EBC2C4',
                            fillOpacity: 0.3,
                            weight: 0.5
                        }}
                    >
                        <Popup>
                            <div><strong>Pacífico Local</strong></div>
                        </Popup>
                    </Polygon>

                    <Polygon
                        positions={datosLC.latlonPacificoRegional}
                        pathOptions={{
                            color: 'orange',
                            weight: 1,
                            fillColor: '#FBE2B3',
                            fillOpacity: 0.3
                        }}
                    >
                        <Popup>
                            <div><strong>Pacífico Regional</strong></div>
                        </Popup>
                    </Polygon>

                    <Polygon
                        positions={datosLC.latlonCaribeLocal}
                        pathOptions={{
                            color: 'red',
                            fillColor: '#EBC2C4',
                            fillOpacity: 0.3,
                            weight: 0.5
                        }}
                    >
                        <Popup>
                            <div><strong>Caribe Local</strong></div>
                        </Popup>
                    </Polygon>

                    <Polygon
                        positions={datosLC.latlonCaribeLocalInsular}
                        pathOptions={{
                            color: 'red',
                            fillColor: '#EBC2C4',
                            fillOpacity: 0.3,
                            weight: 0.5
                        }}
                    >
                        <Popup>
                            <div><strong>Caribe Local Insular</strong></div>
                        </Popup>
                    </Polygon>

                    <Polygon
                        positions={datosLC.latlonCaribeRegional}
                        pathOptions={{
                            color: 'orange',
                            weight: 1,
                            fillColor: '#FBE2B3',
                            fillOpacity: 0.3
                        }}
                    >
                        <Popup>
                            <div><strong>Caribe Regional</strong></div>
                        </Popup>
                    </Polygon>

                    {/* Polylines */}
                    <Polyline
                        positions={datosLC.latlonPacificoLineaLocalRegional}
                        pathOptions={{ color: 'red', weight: 0.5 }}
                    />
                    <Polyline
                        positions={datosLC.latlonCaribeLineaLocalRegional}
                        pathOptions={{ color: 'red', weight: 0.5 }}
                    />
                    <Polyline
                        positions={datosLC.latlonCaribeLocalInsular}
                        pathOptions={{ color: 'red', weight: 0.5 }}
                    />

                    {/* Marcadores de escenarios */}
                    {filteredEscenarios.map((escenario) => (
                        escenario.latitud && escenario.longitud && (
                            <Marker
                                key={`${escenario.tipo}-${escenario._id || escenario.id}`}
                                position={[escenario.latitud, escenario.longitud]}
                                icon={escenarioIcon}
                            >
                                <Popup maxWidth={350}>
                                    <div className="escenario-popup">
                                        <h6>
                                            Escenario #{escenario.id}
                                            <Badge
                                                bg={escenario.tipo === 'Locales' ? 'danger' : 'warning'}
                                                className="ms-2"
                                                style={{ fontSize: '10px' }}
                                            >
                                                {escenario.tipo}
                                            </Badge>
                                        </h6>

                                        <p><strong>Latitud:</strong> {escenario.latitud.toFixed(4)}</p>
                                        <p><strong>Longitud:</strong> {escenario.longitud.toFixed(4)}</p>

                                        <p>
                                            <strong>Océano:</strong> {escenario.oceano}
                                            <Badge bg={escenario.oceano === 'Pacífico' ? 'primary' : 'info'} className="ms-2">
                                                {escenario.oceano}
                                            </Badge>
                                        </p>

                                        {escenario.tipo === 'Regionales y Lejanos' && (
                                            <p>
                                                <strong>Estado:</strong>
                                                <Badge bg={escenario.activo ? 'success' : 'secondary'} className="ms-2">
                                                    {escenario.activo ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </p>
                                        )}

                                        <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
                                            <strong>ID MongoDB:</strong> {escenario._id}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    ))}
                </MapContainer>

                {/* Panel de filtros */}
                <div className="filter-panel">
                    <h6>🔍 Filtros</h6>

                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontSize: '12px', fontWeight: '600' }}>Capa del mapa:</Form.Label>
                        <Form.Select
                            value={selectedLayer}
                            onChange={(e) => setSelectedLayer(e.target.value)}
                            size="sm"
                        >
                            {Object.entries(layerOptions).map(([key, { name }]) => (
                                <option key={key} value={key}>{name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontSize: '12px', fontWeight: '600' }}>Filtrar por tipo:</Form.Label>
                        <Form.Select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            size="sm"
                        >
                            {tiposUnicos.map((tipo) => (
                                <option key={tipo} value={tipo}>
                                    {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <div className="stats-panel">
                        <p><strong>📊 Estadísticas:</strong></p>
                        <p>📍 Locales: {escenariosLocales}</p>
                        <p>🌍 Regionales y Lejanos: {escenariosRegionalesLejanos}</p>
                        <hr style={{ margin: '8px 0' }} />
                        <p><strong>Mostrando:</strong> {filteredEscenarios.length} escenarios</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Escenarios;
