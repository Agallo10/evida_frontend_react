import { useEffect } from 'react';
import { Button, Card, Container } from 'react-bootstrap';
import useEarthquakeStore from '../store/earthquakeStore';
import { initSocket } from '../store/earthquakeStore';
import './SocketTest.css';

function SocketTest() {
    const { earthquakes, isConnected, fetchEarthquakes, initializeSocket, socketListenersCount } = useEarthquakeStore();

    useEffect(() => {
        initializeSocket();
    }, [initializeSocket]);

    const handleManualUpdate = () => {
        console.log('Actualizando manualmente los sismos...');
        fetchEarthquakes(true); // Simular que viene del socket
    };

    const handleSimulateSocketEvent = () => {
        console.log('Simulando evento socket "actualizarSismos" desde el cliente');
        const sock = initSocket();
        // Forzar el trigger del evento localmente para prueba
        sock.emit('test', 'mensaje de prueba');

        // Simular la recepción del evento
        handleManualUpdate();
    };

    return (
        <div className="socket-test-container">
            <div className="socket-header">
                <h1>
                    <i className="bi bi-plug-fill me-2"></i>
                    Panel de Pruebas de Socket
                </h1>
                <p>Monitoreo y pruebas de conexión en tiempo real</p>
            </div>
            
            <Container className="mt-4">
                <Card className="socket-card">
                    <Card.Header className="socket-card-header">
                        <h4><i className="bi bi-gear-fill me-2"></i>Estado de Conexión</h4>
                    </Card.Header>
                    <Card.Body>
                        <div className="mb-3 socket-info">
                            <p><strong>Estado de Conexión:</strong> {isConnected ? '✅ Conectado' : '❌ Desconectado'}</p>
                            <p><strong>Socket ID:</strong> {initSocket().id || 'No conectado'}</p>
                            <p><strong>Total de Terremotos:</strong> {earthquakes.length}</p>
                            <p><strong>Listeners Activos:</strong> {socketListenersCount}</p>
                        </div>

                        <div className="d-flex gap-2">
                            <Button variant="primary" onClick={handleManualUpdate}>
                                <i className="bi bi-arrow-clockwise me-2"></i>
                                Actualizar Manualmente
                            </Button>
                            <Button variant="warning" onClick={handleSimulateSocketEvent}>
                                <i className="bi bi-lightning-fill me-2"></i>
                                Simular Evento Socket
                            </Button>
                        </div>

                        <div className="mt-3 socket-note">
                            <small className="text-muted">
                                <strong>Nota:</strong> El servidor debe emitir el evento 'actualizarSismos'
                                para que se actualicen automáticamente los datos en todas las pestañas abiertas.
                            </small>
                        </div>

                        <div className="mt-3">
                            <h6 className="code-title">Código del servidor (Node.js):</h6>
                            <pre className="bg-light p-3 rounded code-block">
                                <code>{`// Cuando hay nuevos sismos en el servidor
io.emit('actualizarSismos');`}
                                </code>
                            </pre>
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
}

export default SocketTest;
