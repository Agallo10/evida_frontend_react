import { Card, Container, Row, Col, Badge } from 'react-bootstrap';

function About() {
    return (
        <Container>
            <h1 className="mb-4">Acerca de Nosotros</h1>

            <Row>
                <Col lg={8}>
                    <Card className="mb-4">
                        <Card.Body>
                            <Card.Title>Nuestra Misión</Card.Title>
                            <Card.Text>
                                Somos una empresa dedicada a crear soluciones web modernas y eficientes.
                                Utilizamos las últimas tecnologías para ofrecer la mejor experiencia a nuestros usuarios.
                            </Card.Text>
                        </Card.Body>
                    </Card>

                    <Card className="mb-4">
                        <Card.Body>
                            <Card.Title>Nuestra Visión</Card.Title>
                            <Card.Text>
                                Ser líderes en el desarrollo de aplicaciones web innovadoras que transformen
                                la manera en que las personas interactúan con la tecnología.
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4}>
                    <Card className="mb-4">
                        <Card.Body>
                            <Card.Title>Tecnologías</Card.Title>
                            <div className="d-flex flex-wrap gap-2">
                                <Badge bg="primary">React</Badge>
                                <Badge bg="success">Bootstrap</Badge>
                                <Badge bg="info">React Router</Badge>
                                <Badge bg="warning">Vite</Badge>
                                <Badge bg="secondary">JavaScript</Badge>
                                <Badge bg="danger">CSS</Badge>
                            </div>
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Body>
                            <Card.Title>Contacto</Card.Title>
                            <Card.Text>
                                <strong>Email:</strong> info@ejemplo.com<br />
                                <strong>Teléfono:</strong> +123 456 7890<br />
                                <strong>Dirección:</strong> Calle Principal 123
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}

export default About;
