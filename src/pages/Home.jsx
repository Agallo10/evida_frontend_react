import { Card, Container, Row, Col, Button } from 'react-bootstrap';

function Home() {
    return (
        <Container>
            <h1 className="mb-4">Bienvenido a la Página de Inicio</h1>

            <Row>
                <Col md={6} className="mb-4">
                    <Card>
                        <Card.Body>
                            <Card.Title>¿Qué es esta aplicación?</Card.Title>
                            <Card.Text>
                                Esta es una aplicación de ejemplo construida con React, React Router y Bootstrap.
                                Demuestra el uso de un sidebar de navegación y múltiples páginas.
                            </Card.Text>
                            <Button variant="primary">Más Información</Button>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={6} className="mb-4">
                    <Card>
                        <Card.Body>
                            <Card.Title>Características</Card.Title>
                            <Card.Text>
                                <ul>
                                    <li>Navegación con React Router</li>
                                    <li>Diseño responsivo con Bootstrap</li>
                                    <li>Sidebar lateral</li>
                                    <li>Componentes reutilizables</li>
                                </ul>
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                <Col>
                    <Card className="bg-light">
                        <Card.Body>
                            <Card.Title>Comenzar</Card.Title>
                            <Card.Text>
                                Explora las diferentes secciones usando el menú lateral.
                                Puedes navegar entre la página de Inicio y Acerca de.
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}

export default Home;
