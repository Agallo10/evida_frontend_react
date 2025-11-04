import { useEffect, useState } from 'react';
import { Table, Button, Spinner, Alert, Form, InputGroup, Badge, Modal } from 'react-bootstrap';
import { fetchWithAuth } from '../../utils/authHelper';
import './Entidades.css';

function Entidades() {
    const [entidades, setEntidades] = useState([]);
    const [filteredEntidades, setFilteredEntidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para el modal
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Estados para el modal de eliminar
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [entidadToDelete, setEntidadToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchEntidades();
    }, []);

    useEffect(() => {
        // Filtrar entidades cuando cambia el término de búsqueda
        if (searchTerm.trim() === '') {
            setFilteredEntidades(entidades);
        } else {
            const filtered = entidades.filter(entidad =>
                entidad.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entidad.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredEntidades(filtered);
        }
    }, [searchTerm, entidades]);

    const fetchEntidades = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchWithAuth('http://localhost:4000/api/entidades');

            if (!response.ok) {
                throw new Error('Error al cargar las entidades');
            }

            const data = await response.json();
            setEntidades(Array.isArray(data) ? data : []);
            setFilteredEntidades(Array.isArray(data) ? data : []);
        } catch (err) {
            setError('Error al cargar las entidades. Verifique que el servidor esté corriendo.');
            console.error('Error fetching entidades:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (entidad) => {
        setIsEditing(true);
        setEditingId(entidad._id);
        setFormData({
            nombre: entidad.nombre,
            descripcion: entidad.descripcion
        });
        setFormError('');
        setShowModal(true);
    };

    const handleDelete = (entidad) => {
        setEntidadToDelete(entidad);
        setShowDeleteModal(true);
    };

    const handleCloseDeleteModal = () => {
        setShowDeleteModal(false);
        setEntidadToDelete(null);
    };

    const confirmDelete = async () => {
        if (!entidadToDelete) return;

        setDeleting(true);
        setFormError('');

        try {
            const response = await fetchWithAuth(
                `http://localhost:4000/api/entidades/${entidadToDelete._id}`,
                { method: 'DELETE' }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al eliminar la entidad');
            }

            console.log('✅ Entidad eliminada:', entidadToDelete._id);

            // Actualizar lista de entidades
            await fetchEntidades();

            // Mostrar mensaje de éxito
            setSuccessMessage(`Entidad "${entidadToDelete.nombre}" eliminada exitosamente`);
            setTimeout(() => setSuccessMessage(''), 3000);

            // Cerrar modal
            handleCloseDeleteModal();
        } catch (err) {
            setFormError(err.message || 'Error al eliminar la entidad');
            console.error('Error deleting entidad:', err);
        } finally {
            setDeleting(false);
        }
    };

    const handleAdd = () => {
        setIsEditing(false);
        setEditingId(null);
        setFormData({ nombre: '', descripcion: '' });
        setFormError('');
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditing(false);
        setEditingId(null);
        setFormData({ nombre: '', descripcion: '' });
        setFormError('');
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSubmitting(true);

        // Validaciones
        if (!formData.nombre.trim()) {
            setFormError('El nombre es requerido');
            setSubmitting(false);
            return;
        }

        if (!formData.descripcion.trim()) {
            setFormError('La descripción es requerida');
            setSubmitting(false);
            return;
        }

        try {
            const url = isEditing
                ? `http://localhost:4000/api/entidades/${editingId}`
                : 'http://localhost:4000/api/entidades';

            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetchWithAuth(url, {
                method: method,
                body: JSON.stringify({
                    nombre: formData.nombre.trim(),
                    descripcion: formData.descripcion.trim()
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error al ${isEditing ? 'actualizar' : 'crear'} la entidad`);
            }

            const result = await response.json();
            console.log(`✅ Entidad ${isEditing ? 'actualizada' : 'creada'}:`, result);

            // Actualizar lista de entidades
            await fetchEntidades();

            // Mostrar mensaje de éxito
            setSuccessMessage(`Entidad ${isEditing ? 'actualizada' : 'creada'} exitosamente`);
            setTimeout(() => setSuccessMessage(''), 3000);

            // Cerrar modal
            handleCloseModal();
        } catch (err) {
            setFormError(err.message || `Error al ${isEditing ? 'actualizar' : 'crear'} la entidad`);
            console.error(`Error ${isEditing ? 'updating' : 'creating'} entidad:`, err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="entidades-container">
            <div className="entidades-header">
                <h1>
                    <i className="bi bi-building me-2"></i>
                    Gestión de Entidades
                </h1>
                <p>Administre las entidades del sistema de alerta de tsunamis</p>
            </div>

            {/* Estadísticas */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <i className="bi bi-building"></i>
                    </div>
                    <div className="stat-content">
                        <h3>{entidades.length}</h3>
                        <p>Total Entidades</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <i className="bi bi-search"></i>
                    </div>
                    <div className="stat-content">
                        <h3>{filteredEntidades.length}</h3>
                        <p>Resultados Filtrados</p>
                    </div>
                </div>
            </div>

            {/* Acciones */}
            <div className="entidades-actions">
                <InputGroup className="search-box">
                    <InputGroup.Text>
                        <i className="bi bi-search"></i>
                    </InputGroup.Text>
                    <Form.Control
                        placeholder="Buscar por nombre o descripción..."
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

                <Button
                    variant="primary"
                    onClick={handleAdd}
                    className="d-flex align-items-center gap-2"
                >
                    <i className="bi bi-plus-circle"></i>
                    Nueva Entidad
                </Button>
            </div>

            {/* Mensaje de éxito */}
            {successMessage && (
                <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    {successMessage}
                </Alert>
            )}

            {/* Tabla */}
            <div className="entidades-table-card">
                {error && (
                    <Alert variant="danger" className="m-3">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {error}
                        <Button
                            variant="link"
                            size="sm"
                            onClick={fetchEntidades}
                            className="ms-2"
                        >
                            Reintentar
                        </Button>
                    </Alert>
                )}

                {loading ? (
                    <div className="loading-container">
                        <Spinner animation="border" variant="primary" />
                        <span className="ms-3">Cargando entidades...</span>
                    </div>
                ) : filteredEntidades.length === 0 ? (
                    <div className="empty-state">
                        <i className="bi bi-inbox"></i>
                        <h4>No se encontraron entidades</h4>
                        <p>
                            {searchTerm
                                ? `No hay resultados para "${searchTerm}"`
                                : 'No hay entidades registradas en el sistema'}
                        </p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <Table hover className="entidades-table">
                            <thead>
                                <tr>
                                    {/* <th>#</th> */}
                                    <th>Nombre</th>
                                    <th>Descripción</th>
                                    <th>ID MongoDB</th>
                                    <th className="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntidades.map((entidad, index) => (
                                    <tr key={entidad._id}>
                                        {/* <td>
                                            <Badge bg="secondary">{index + 1}</Badge>
                                        </td> */}
                                        <td>
                                            <div className="entidad-nombre">
                                                {entidad.nombre}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="entidad-descripcion">
                                                {entidad.descripcion}
                                            </div>
                                        </td>
                                        <td>
                                            <code className="entidad-id">
                                                {entidad._id}
                                            </code>
                                        </td>
                                        <td className="text-center">
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                className="btn-action"
                                                onClick={() => handleEdit(entidad)}
                                                title="Editar"
                                            >
                                                <i className="bi bi-pencil"></i>
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                className="btn-action"
                                                onClick={() => handleDelete(entidad)}
                                                title="Eliminar"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Modal para crear/editar entidad */}
            <Modal show={showModal} onHide={handleCloseModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className={`bi bi-${isEditing ? 'pencil' : 'plus-circle'} me-2`}></i>
                        {isEditing ? 'Editar Entidad' : 'Nueva Entidad'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {formError && (
                        <Alert variant="danger" dismissible onClose={() => setFormError('')}>
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            {formError}
                        </Alert>
                    )}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>
                                Nombre <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                type="text"
                                name="nombre"
                                placeholder="Ej: UNGRD"
                                value={formData.nombre}
                                onChange={handleFormChange}
                                required
                                disabled={submitting}
                                autoFocus
                            />
                            <Form.Text className="text-muted">
                                Nombre corto de la entidad (siglas o abreviatura)
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>
                                Descripción <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                name="descripcion"
                                placeholder="Ej: Unidad Nacional de Gestión del Riesgo de Desastres"
                                value={formData.descripcion}
                                onChange={handleFormChange}
                                required
                                disabled={submitting}
                            />
                            <Form.Text className="text-muted">
                                Descripción completa de la entidad
                            </Form.Text>
                        </Form.Group>

                        <div className="d-flex justify-content-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={handleCloseModal}
                                disabled={submitting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-save me-2"></i>
                                        Guardar
                                    </>
                                )}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Modal de confirmación para eliminar */}
            <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered>
                <Modal.Header closeButton style={{ borderBottom: '2px solid #dc3545' }}>
                    <Modal.Title className="text-danger">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        Confirmar Eliminación
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {formError && (
                        <Alert variant="danger" dismissible onClose={() => setFormError('')}>
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            {formError}
                        </Alert>
                    )}

                    {entidadToDelete && (
                        <div>
                            <p className="mb-3">
                                ¿Está seguro que desea eliminar la siguiente entidad?
                            </p>
                            <div
                                style={{
                                    backgroundColor: '#f8f9fa',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    border: '1px solid #dee2e6'
                                }}
                            >
                                <p className="mb-2">
                                    <strong>Nombre:</strong> {entidadToDelete.nombre}
                                </p>
                                <p className="mb-2">
                                    <strong>Descripción:</strong> {entidadToDelete.descripcion}
                                </p>
                                <p className="mb-0">
                                    <strong>ID:</strong> <code>{entidadToDelete._id}</code>
                                </p>
                            </div>
                            <Alert variant="warning" className="mt-3 mb-0">
                                <i className="bi bi-info-circle me-2"></i>
                                <strong>Advertencia:</strong> Esta acción no se puede deshacer.
                            </Alert>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={handleCloseDeleteModal}
                        disabled={deleting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="danger"
                        onClick={confirmDelete}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Eliminando...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-trash me-2"></i>
                                Eliminar
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Entidades;
