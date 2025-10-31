import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Container, Row, Col, Nav, Button } from 'react-bootstrap';
import './Layout.css';

function Layout() {
    const [collapsed, setCollapsed] = useState(false);

    const toggleSidebar = () => {
        setCollapsed(!collapsed);
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
                        {!collapsed && <h4 className="mb-0">Mi Aplicación</h4>}
                        <Button
                            variant="outline-light"
                            size="sm"
                            onClick={toggleSidebar}
                            className="toggle-btn"
                        >
                            <i className={`bi bi-${collapsed ? 'chevron-right' : 'chevron-left'}`}></i>
                        </Button>
                    </div>
                    <Nav className="flex-column">
                        <Nav.Link as={Link} to="/" className="text-white sidebar-link" title="Inicio">
                            <i className="bi bi-house-door-fill"></i>
                            {!collapsed && <span className="ms-2">Inicio</span>}
                        </Nav.Link>
                        <Nav.Link as={Link} to="/about" className="text-white sidebar-link" title="Acerca de">
                            <i className="bi bi-info-circle-fill"></i>
                            {!collapsed && <span className="ms-2">Acerca de</span>}
                        </Nav.Link>
                        <Nav.Link as={Link} to="/earthquake-map" className="text-white sidebar-link" title="Mapa de Terremotos">
                            <i className="bi bi-globe-americas"></i>
                            {!collapsed && <span className="ms-2">Mapa de Terremotos</span>}
                        </Nav.Link>
                        <Nav.Link as={Link} to="/earthquake-list" className="text-white sidebar-link" title="Lista de Terremotos">
                            <i className="bi bi-list-ul"></i>
                            {!collapsed && <span className="ms-2">Lista de Terremotos</span>}
                        </Nav.Link>
                        <Nav.Link as={Link} to="/socket-test" className="text-white sidebar-link" title="Test Socket">
                            <i className="bi bi-plug-fill"></i>
                            {!collapsed && <span className="ms-2">Test Socket</span>}
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
