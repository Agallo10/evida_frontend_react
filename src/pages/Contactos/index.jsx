import { useEffect, useState } from 'react';
import { Table, Button, Spinner, Alert, Form, InputGroup, Badge, Modal } from 'react-bootstrap';
import { fetchWithAuth } from '../../utils/authHelper';
import './Contactos.css';

function Contactos() {
    const [contactos, setContactos] = useState([]);
    const [entidades, setEntidades] = useState([]);
    const [filteredContactos, setFilteredContactos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para el modal de crear/editar
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', correo: '', telefono: '', entidad: '' });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Estados para el modal de eliminar
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [contactoToDelete, setContactoToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchContactos();
        fetchEntidades();
    }, []);

    useEffect(() => {
        // Filtrar contactos cuando cambia el término de búsqueda
        if (searchTerm.trim() === '') {
            setFilteredContactos(contactos);
        } else {
            const filtered = contactos.filter(contacto =>
                contacto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contacto.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contacto.telefono.toString().includes(searchTerm) ||
                (contacto.entidad && contacto.entidad.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            setFilteredContactos(filtered);
        }
    }, [searchTerm, contactos]);

    const fetchContactos = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchWithAuth('http://localhost:4000/api/contactos');

            if (!response.ok) {
                throw new Error('Error al cargar los contactos');
            }

            const data = await response.json();
            setContactos(Array.isArray(data) ? data : []);
            setFilteredContactos(Array.isArray(data) ? data : []);
        } catch (err) {
            setError('Error al cargar los contactos. Verifique que el servidor esté corriendo.');
            console.error('Error fetching contactos:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchEntidades = async () => {
        try {
            const response = await fetchWithAuth('http://localhost:4000/api/entidades');
            if (response.ok) {
                const data = await response.json();
                setEntidades(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Error fetching entidades:', err);
        }
    };

    const handleEdit = (contacto) => {
        setIsEditing(true);
        setEditingId(contacto._id);
        setFormData({
            nombre: contacto.nombre,
            correo: contacto.correo,
            telefono: contacto.telefono.toString(),
            entidad: contacto.entidad ? contacto.entidad._id : ''
        });
        setFormError('');
        setShowModal(true);
    };

    const handleDelete = (contacto) => {
        setContactoToDelete(contacto);
        setShowDeleteModal(true);
    };

    const handleCloseDeleteModal = () => {
        setShowDeleteModal(false);
        setContactoToDelete(null);
    };

    const confirmDelete = async () => {
        if (!contactoToDelete) return;

        setDeleting(true);
        setFormError('');

        try {
            const response = await fetchWithAuth(
                `http://localhost:4000/api/contactos/${contactoToDelete._id}`,
                { method: 'DELETE' }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al eliminar el contacto');
            }

            console.log('✅ Contacto eliminado:', contactoToDelete._id);

            // Actualizar lista de contactos
            await fetchContactos();

            // Mostrar mensaje de éxito
            setSuccessMessage(`Contacto "${contactoToDelete.nombre}" eliminado exitosamente`);
            setTimeout(() => setSuccessMessage(''), 3000);

            // Cerrar modal
            handleCloseDeleteModal();
        } catch (err) {
            setFormError(err.message || 'Error al eliminar el contacto');
            console.error('Error deleting contacto:', err);
        } finally {
            setDeleting(false);
        }
    };

    const handleAdd = () => {
        setIsEditing(false);
        setEditingId(null);
        setFormData({ nombre: '', correo: '', telefono: '', entidad: '' });
        setFormError('');
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditing(false);
        setEditingId(null);
        setFormData({ nombre: '', correo: '', telefono: '', entidad: '' });
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

        if (!formData.correo.trim()) {
            setFormError('El correo es requerido');
            setSubmitting(false);
            return;
        }

        if (!formData.telefono) {
            setFormError('El teléfono es requerido');
            setSubmitting(false);
            return;
        }

        if (!formData.entidad) {
            setFormError('La entidad es requerida');
            setSubmitting(false);
            return;
        }

        try {
            const url = isEditing
                ? `http://localhost:4000/api/contactos/${editingId}`
                : 'http://localhost:4000/api/contactos';

            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetchWithAuth(url, {
                method: method,
                body: JSON.stringify({
                    nombre: formData.nombre.trim(),
                    correo: formData.correo.trim(),
                    telefono: parseInt(formData.telefono),
                    entidad: formData.entidad
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error al ${isEditing ? 'actualizar' : 'crear'} el contacto`);
            }

            const result = await response.json();
            console.log(`✅ Contacto ${isEditing ? 'actualizado' : 'creado'}:`, result);

            // Actualizar lista de contactos
            await fetchContactos();

            // Mostrar mensaje de éxito
            setSuccessMessage(`Contacto ${isEditing ? 'actualizado' : 'creado'} exitosamente`);
            setTimeout(() => setSuccessMessage(''), 3000);

            // Cerrar modal
            handleCloseModal();
        } catch (err) {
            setFormError(err.message || `Error al ${isEditing ? 'actualizar' : 'crear'} el contacto`);
            console.error(`Error ${isEditing ? 'updating' : 'creating'} contacto:`, err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="contactos-container">
            <div className="contactos-header">
                <h1>
                    <i className="bi bi-person-lines-fill me-2"></i>
                    Gestión de Contactos
                </h1>
                <p>Administre los contactos del sistema de alerta de tsunamis</p>
            </div>

            {/* Estadísticas */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <i className="bi bi-person-lines-fill"></i>
                    </div>
                    <div className="stat-content">
                        <h3>{contactos.length}</h3>
                        <p>Total Contactos</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <i className="bi bi-search"></i>
                    </div>
                    <div className="stat-content">
                        <h3>{filteredContactos.length}</h3>
                        <p>Resultados Filtrados</p>
                    </div>
                </div>
            </div>

            {/* Acciones */}
            <div className="contactos-actions">
                <InputGroup className="search-box">
                    <InputGroup.Text>
                        <i className="bi bi-search"></i>
                    </InputGroup.Text>
                    <Form.Control
                        placeholder="Buscar por nombre, correo, teléfono o entidad..."
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
                    Nuevo Contacto
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
            <div className="contactos-table-card">
                {error && (
                    <Alert variant="danger" className="m-3">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {error}
                        <Button
                            variant="link"
                            size="sm"
                            onClick={fetchContactos}
                            className="ms-2"
                        >
                            Reintentar
                        </Button>
                    </Alert>
                )}

                {loading ? (
                    <div className="loading-container">
                        <Spinner animation="border" variant="primary" />
                        <span className="ms-3">Cargando contactos...</span>
                    </div>
                ) : filteredContactos.length === 0 ? (
                    <div className="empty-state">
                        <i className="bi bi-inbox"></i>
                        <h4>No se encontraron contactos</h4>
                        <p>
                            {searchTerm
                                ? `No hay resultados para "${searchTerm}"`
                                : 'No hay contactos registrados en el sistema'}
                        </p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <Table hover className="contactos-table">
                            <thead>
                                <tr>
                                    {/* <th>#</th> */}
                                    <th>Nombre</th>
                                    <th>Correo</th>
                                    <th>Teléfono</th>
                                    <th>Entidad</th>
                                    <th className="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredContactos.map((contacto, index) => (
                                    <tr key={contacto._id}>
                                        {/* <td>
                                            <Badge bg="secondary">{index + 1}</Badge>
                                        </td> */}
                                        <td>
                                            <div className="contacto-nombre">
                                                <i className="bi bi-person-fill me-2"></i>
                                                {contacto.nombre}
                                            </div>
                                        </td>
                                        <td>
                                            <a href={`mailto:${contacto.correo}`} className="contacto-correo">
                                                <i className="bi bi-envelope-fill me-2"></i>
                                                {contacto.correo}
                                            </a>
                                        </td>
                                        <td>
                                            <div className="contacto-telefono">
                                                <i className="bi bi-telephone-fill me-2"></i>
                                                {contacto.telefono}
                                            </div>
                                        </td>
                                        <td>
                                            {contacto.entidad ? (
                                                <span className="contacto-entidad" title={contacto.entidad.descripcion}>
                                                    {contacto.entidad.nombre}
                                                </span>
                                            ) : (
                                                <Badge bg="secondary">Sin entidad</Badge>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                className="btn-action"
                                                onClick={() => handleEdit(contacto)}
                                                title="Editar"
                                            >
                                                <i className="bi bi-pencil"></i>
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                className="btn-action"
                                                onClick={() => handleDelete(contacto)}
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

            {/* Modal para crear contacto */}
            <Modal show={showModal} onHide={handleCloseModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className={`bi bi-${isEditing ? 'pencil' : 'plus-circle'} me-2`}></i>
                        {isEditing ? 'Editar Contacto' : 'Nuevo Contacto'}
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
                                placeholder="Ej: Juan Pérez"
                                value={formData.nombre}
                                onChange={handleFormChange}
                                required
                                disabled={submitting}
                                autoFocus
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>
                                Correo Electrónico <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                type="email"
                                name="correo"
                                placeholder="Ej: jperez@dimar.mil.co"
                                value={formData.correo}
                                onChange={handleFormChange}
                                required
                                disabled={submitting}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>
                                Teléfono <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                type="number"
                                name="telefono"
                                placeholder="Ej: 3001234567"
                                value={formData.telefono}
                                onChange={handleFormChange}
                                required
                                disabled={submitting}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>
                                Entidad <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Select
                                name="entidad"
                                value={formData.entidad}
                                onChange={handleFormChange}
                                required
                                disabled={submitting}
                            >
                                <option value="">Seleccione una entidad...</option>
                                {entidades.map(entidad => (
                                    <option key={entidad._id} value={entidad._id}>
                                        {entidad.nombre} - {entidad.descripcion}
                                    </option>
                                ))}
                            </Form.Select>
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

                    {contactoToDelete && (
                        <div>
                            <p className="mb-3">
                                ¿Está seguro que desea eliminar el siguiente contacto?
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
                                    <strong>Nombre:</strong> {contactoToDelete.nombre}
                                </p>
                                <p className="mb-2">
                                    <strong>Correo:</strong> {contactoToDelete.correo}
                                </p>
                                <p className="mb-2">
                                    <strong>Teléfono:</strong> {contactoToDelete.telefono}
                                </p>
                                {contactoToDelete.entidad && (
                                    <p className="mb-0">
                                        <strong>Entidad:</strong> {contactoToDelete.entidad.nombre}
                                    </p>
                                )}
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

export default Contactos;
