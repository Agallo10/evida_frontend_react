import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Nav, Button } from 'react-bootstrap';
import './Layout.css';

function Layout() {
    const [collapsed, setCollapsed] = useState(false);
    const [boletinesOpen, setBoletinesOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Obtener información del usuario
    const usuarioData = localStorage.getItem('usuario');
    const usuario = usuarioData ? JSON.parse(usuarioData) : null;

    const toggleSidebar = () => {
        setCollapsed(!collapsed);
    };

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('username');
        navigate('/login');
    };

    return (
        <Container fluid className="vh-100 p-0">
            <Row className="h-100 g-0">
                {/* Sidebar */}
                <Col
                    xs={12}
                    md={collapsed ? 'auto' : 3}
                    lg={collapsed ? 'auto' : 2}
                    className={`sidebar bg-dark ${collapsed ? 'collapsed' : ''}`}
                >
                    <div className="sidebar-header p-3 text-white d-flex justify-content-between align-items-center">
                        {!collapsed && <h4 className="mb-0">EVIDA - DIMAR</h4>}
                        <Button
                            variant="outline-light"
                            size="sm"
                            onClick={toggleSidebar}
                            className="toggle-btn"
                        >
                            <i className={`bi bi-${collapsed ? 'chevron-right' : 'chevron-left'}`}></i>
                        </Button>
                    </div>

                    {/* Info del usuario */}
                    {!collapsed && usuario && (
                        <div className="p-3 text-white" style={{
                            fontSize: '0.85rem',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            backgroundColor: 'rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="bi bi-person-circle" style={{ fontSize: '1.2rem' }}></i>
                                <div>
                                    <div style={{ fontWeight: '600' }}>{usuario.nombre}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: '0.8' }}>@{usuario.user}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <Nav className="flex-column">
                        <Nav.Link as={Link} to="/" className={`text-white sidebar-link ${location.pathname === '/' ? 'active' : ''}`} title="Inicio">
                            <i className="bi bi-house-door-fill"></i>
                            {!collapsed && <span className="ms-2">Inicio</span>}
                        </Nav.Link>
                        <Nav.Link as={Link} to="/about" className={`text-white sidebar-link ${location.pathname === '/about' ? 'active' : ''}`} title="Acerca de">
                            <i className="bi bi-info-circle-fill"></i>
                            {!collapsed && <span className="ms-2">Acerca de</span>}
                        </Nav.Link>
                        <Nav.Link as={Link} to="/earthquake-map" className={`text-white sidebar-link ${location.pathname === '/earthquake-map' ? 'active' : ''}`} title="Mapa de Terremotos">
                            <i className="bi bi-globe-americas"></i>
                            {!collapsed && <span className="ms-2">Mapa de Terremotos</span>}
                        </Nav.Link>
                        <Nav.Link as={Link} to="/earthquake-list" className={`text-white sidebar-link ${location.pathname === '/earthquake-list' ? 'active' : ''}`} title="Lista de Terremotos">
                            <i className="bi bi-list-ul"></i>
                            {!collapsed && <span className="ms-2">Lista de Terremotos</span>}
                        </Nav.Link>
                        <Nav.Link as={Link} to="/prueba-sismo" className={`text-white sidebar-link ${location.pathname === '/prueba-sismo' ? 'active' : ''}`} title="Prueba Manual de Sismo">
                            <i className="bi bi-gear-fill"></i>
                            {!collapsed && <span className="ms-2">Prueba Manual</span>}
                        </Nav.Link>
                        <Nav.Link as={Link} to="/escenarios" className={`text-white sidebar-link ${location.pathname === '/escenarios' ? 'active' : ''}`} title="Escenarios">
                            <i className="bi bi-pin-map-fill"></i>
                            {!collapsed && <span className="ms-2">Escenarios</span>}
                        </Nav.Link>

                        {/* Menú Boletines con Submenús */}
                        <div className="sidebar-submenu">
                            <Nav.Link
                                onClick={() => !collapsed && setBoletinesOpen(!boletinesOpen)}
                                className="text-white sidebar-link"
                                title="Boletines"
                                style={{ cursor: 'pointer' }}
                            >
                                <i className="bi bi-file-earmark-text-fill"></i>
                                {!collapsed && (
                                    <>
                                        <span className="ms-2">Boletines</span>
                                        <i className={`bi bi-chevron-${boletinesOpen ? 'down' : 'right'} ms-auto`}></i>
                                    </>
                                )}
                            </Nav.Link>

                            {!collapsed && boletinesOpen && (
                                <div className="submenu-items">
                                    <Nav.Link as={Link} to="/correos" className={`text-white sidebar-sublink ${location.pathname === '/correos' ? 'active' : ''}`} title="Correos">
                                        <i className="bi bi-envelope-fill"></i>
                                        <span className="ms-2">Correos</span>
                                    </Nav.Link>
                                    <Nav.Link as={Link} to="/entidades" className={`text-white sidebar-sublink ${location.pathname === '/entidades' ? 'active' : ''}`} title="Entidades">
                                        <i className="bi bi-building"></i>
                                        <span className="ms-2">Entidades</span>
                                    </Nav.Link>
                                    <Nav.Link as={Link} to="/contactos" className={`text-white sidebar-sublink ${location.pathname === '/contactos' ? 'active' : ''}`} title="Contactos">
                                        <i className="bi bi-person-lines-fill"></i>
                                        <span className="ms-2">Contactos</span>
                                    </Nav.Link>
                                </div>
                            )}
                        </div>

                        <Nav.Link as={Link} to="/socket-test" className={`text-white sidebar-link ${location.pathname === '/socket-test' ? 'active' : ''}`} title="Test Socket">
                            <i className="bi bi-plug-fill"></i>
                            {!collapsed && <span className="ms-2">Test Socket</span>}
                        </Nav.Link>

                        {/* Separador */}
                        <hr className="my-3" style={{ borderColor: 'rgba(255,255,255,0.2)' }} />

                        {/* Botón de cerrar sesión */}
                        <Nav.Link
                            onClick={handleLogout}
                            className="text-white sidebar-link"
                            title="Cerrar Sesión"
                            style={{ cursor: 'pointer' }}
                        >
                            <i className="bi bi-box-arrow-right"></i>
                            {!collapsed && <span className="ms-2">Cerrar Sesión</span>}
                        </Nav.Link>
                    </Nav>
                </Col>

                {/* Main Content */}
                <Col className="main-content">
                    <Outlet />
                </Col>
            </Row>
        </Container>
    );
}

export default Layout;
