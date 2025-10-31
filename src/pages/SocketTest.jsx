import { useEffect } from 'react';
import { Button, Card, Container } from 'react-bootstrap';
import useEarthquakeStore from '../store/earthquakeStore';
import { initSocket } from '../store/earthquakeStore';

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
        <Container className="mt-4">
            <Card>
                <Card.Header>
                    <h4>Panel de Pruebas de Socket</h4>
                </Card.Header>
                <Card.Body>
                    <div className="mb-3">
                        <p><strong>Estado de Conexión:</strong> {isConnected ? '✅ Conectado' : '❌ Desconectado'}</p>
                        <p><strong>Socket ID:</strong> {initSocket().id || 'No conectado'}</p>
                        <p><strong>Total de Terremotos:</strong> {earthquakes.length}</p>
                        <p><strong>Listeners Activos:</strong> {socketListenersCount}</p>
                    </div>

                    <div className="d-flex gap-2">
                        <Button variant="primary" onClick={handleManualUpdate}>
                            Actualizar Manualmente
                        </Button>
                        <Button variant="warning" onClick={handleSimulateSocketEvent}>
                            Simular Evento Socket
                        </Button>
                    </div>

                    <div className="mt-3">
                        <small className="text-muted">
                            <strong>Nota:</strong> El servidor debe emitir el evento 'actualizarSismos'
                            para que se actualicen automáticamente los datos en todas las pestañas abiertas.
                        </small>
                    </div>

                    <div className="mt-3">
                        <h6>Código del servidor (Node.js):</h6>
                        <pre className="bg-light p-3 rounded">
                            <code>{`// Cuando hay nuevos sismos en el servidor
io.emit('actualizarSismos');`}
                            </code>
                        </pre>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
}

export default SocketTest;
