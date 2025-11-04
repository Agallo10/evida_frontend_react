import { useEffect, useState } from 'react';
import { Table, Button, Spinner, Alert, Form, InputGroup, Badge, Modal } from 'react-bootstrap';
import { fetchWithAuth } from '../../utils/authHelper';
import './Correos.css';

function Correos() {
    const [correos, setCorreos] = useState([]);
    const [filteredCorreos, setFilteredCorreos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTipo, setFilterTipo] = useState('TODOS');

    // Modal para ver el contenido completo del correo
    const [showModal, setShowModal] = useState(false);
    const [selectedCorreo, setSelectedCorreo] = useState(null);

    useEffect(() => {
        fetchCorreos();
    }, []);

    useEffect(() => {
        // Filtrar correos cuando cambia el término de búsqueda o el filtro de tipo
        let filtered = correos;

        // Filtrar por tipo
        if (filterTipo !== 'TODOS') {
            filtered = filtered.filter(correo => correo.tipo === filterTipo);
        }

        // Filtrar por búsqueda
        if (searchTerm.trim() !== '') {
            filtered = filtered.filter(correo =>
                correo.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                correo.fecha.toLowerCase().includes(searchTerm.toLowerCase()) ||
                correo.destino.some(dest => dest.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        setFilteredCorreos(filtered);
    }, [searchTerm, filterTipo, correos]);

    const fetchCorreos = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchWithAuth('http://localhost:4000/api/correos');

            if (!response.ok) {
                throw new Error('Error al cargar los correos');
            }

            const data = await response.json();
            const correosArray = Array.isArray(data) ? data : [];
            setCorreos(correosArray);
            setFilteredCorreos(correosArray);
        } catch (err) {
            setError('Error al cargar los correos. Verifique que el servidor esté corriendo.');
            console.error('Error fetching correos:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewCorreo = (correo) => {
        setSelectedCorreo(correo);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedCorreo(null);
    };

    const getTipoCount = (tipo) => {
        if (tipo === 'TODOS') return correos.length;
        return correos.filter(c => c.tipo === tipo).length;
    };

    const tipos = ['ALERTA', 'ADVERTENCIA', 'INFORMATIVO', 'VIGILANCIA', 'ACTUALIZACION'];

    return (
        <div className="correos-container">
            <div className="correos-header">
                <h1>
                    <i className="bi bi-envelope-fill me-2"></i>
                    Correos Enviados
                </h1>
                <p>Historial de correos de alertas de tsunami enviados por el sistema</p>
            </div>

            {/* Estadísticas */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon">
                        <i className="bi bi-envelope-fill"></i>
                    </div>
                    <div className="stat-content">
                        <h3>{correos.length}</h3>
                        <p>Total Correos</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">
                        <i className="bi bi-search"></i>
                    </div>
                    <div className="stat-content">
                        <h3>{filteredCorreos.length}</h3>
                        <p>Resultados Filtrados</p>
                    </div>
                </div>
            </div>

            {/* Acciones y Filtros */}
            <div className="correos-actions">
                <InputGroup className="search-box">
                    <InputGroup.Text>
                        <i className="bi bi-search"></i>
                    </InputGroup.Text>
                    <Form.Control
                        placeholder="Buscar por tipo, fecha o destinatario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <Button
                            variant="outline-secondary"
                            onClick={() => setSearchTerm('')}
                        >
                            <i className="bi bi-x"></i>
                        </Button>
                    )}
                </InputGroup>

                <Form.Select
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                    style={{ width: '200px' }}
                >
                    <option value="TODOS">Todos ({getTipoCount('TODOS')})</option>
                    {tipos.map(tipo => (
                        <option key={tipo} value={tipo}>
                            {tipo} ({getTipoCount(tipo)})
                        </option>
                    ))}
                </Form.Select>

                <Button
                    variant="outline-primary"
                    onClick={fetchCorreos}
                    className="d-flex align-items-center gap-2"
                >
                    <i className="bi bi-arrow-clockwise"></i>
                    Actualizar
                </Button>
            </div>

            {/* Tabla */}
            <div className="correos-table-card">
                {error && (
                    <Alert variant="danger" className="m-3">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {error}
                        <Button
                            variant="link"
                            size="sm"
                            onClick={fetchCorreos}
                            className="ms-2"
                        >
                            Reintentar
                        </Button>
                    </Alert>
                )}

                {loading ? (
                    <div className="loading-container">
                        <Spinner animation="border" variant="primary" />
                        <span className="ms-3">Cargando correos...</span>
                    </div>
                ) : filteredCorreos.length === 0 ? (
                    <div className="empty-state">
                        <i className="bi bi-inbox"></i>
                        <h4>No se encontraron correos</h4>
                        <p>
                            {searchTerm || filterTipo !== 'TODOS'
                                ? 'No hay resultados para los filtros aplicados'
                                : 'No hay correos registrados en el sistema'}
                        </p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <Table hover className="correos-table">
                            <thead>
                                <tr>
                                    <th>Tipo</th>
                                    <th>Fecha</th>
                                    <th>Destinatarios</th>
                                    <th>Vista Previa</th>
                                    <th className="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCorreos.map((correo) => (
                                    <tr key={correo._id}>
                                        <td>
                                            <span className={`email-tipo ${correo.tipo}`}>
                                                {correo.tipo}
                                            </span>
                                        </td>
                                        <td>
                                            <i className="bi bi-calendar3 me-2"></i>
                                            {correo.fecha}
                                        </td>
                                        <td>
                                            <div className="email-destinatarios">
                                                {correo.destino.slice(0, 2).map((dest, idx) => (
                                                    <span key={idx} className="email-destinatario">
                                                        {dest}
                                                    </span>
                                                ))}
                                                {correo.destino.length > 2 && (
                                                    <span className="email-destinatario">
                                                        +{correo.destino.length - 2} más
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div 
                                                className="email-contenido"
                                                dangerouslySetInnerHTML={{ 
                                                    __html: correo.contenido.replace(/<[^>]*>/g, '').substring(0, 100) + '...'
                                                }}
                                            />
                                        </td>
                                        <td className="text-center">
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                className="btn-action"
                                                onClick={() => handleViewCorreo(correo)}
                                                title="Ver contenido completo"
                                            >
                                                <i className="bi bi-eye"></i>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Modal para ver el contenido completo */}
            <Modal show={showModal} onHide={handleCloseModal} size="xl" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="bi bi-envelope-open me-2"></i>
                        Detalles del Correo
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedCorreo && (
                        <div>
                            <div className="mb-3">
                                <strong>Tipo:</strong>{' '}
                                <span className={`email-tipo ${selectedCorreo.tipo}`}>
                                    {selectedCorreo.tipo}
                                </span>
                            </div>
                            <div className="mb-3">
                                <strong>Fecha:</strong> {selectedCorreo.fecha}
                            </div>
                            <div className="mb-3">
                                <strong>Destinatarios:</strong>
                                <div className="mt-2">
                                    {selectedCorreo.destino.map((dest, idx) => (
                                        <Badge key={idx} bg="secondary" className="me-2 mb-2">
                                            {dest}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="mb-3">
                                <strong>Contenido:</strong>
                                <div 
                                    className="email-full-content mt-2"
                                    dangerouslySetInnerHTML={{ __html: selectedCorreo.contenido }}
                                />
                            </div>
                            {selectedCorreo.idSismo && (
                                <div className="mb-3">
                                    <strong>ID Sismo:</strong> <code>{selectedCorreo.idSismo}</code>
                                </div>
                            )}
                            <div className="mb-3">
                                <strong>ID MongoDB:</strong> <code>{selectedCorreo._id}</code>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Correos;
