// Script de prueba para verificar la conexión del socket
// Ejecutar en la consola del navegador: window.testSocket()

import { initSocket } from './store/earthquakeStore';

window.testSocket = () => {
    const socket = initSocket();

    console.log('=== TEST DE SOCKET ===');
    console.log('Socket ID:', socket.id);
    console.log('Conectado:', socket.connected);
    console.log('URL:', socket.io.uri);
    console.log('Transporte:', socket.io.engine?.transport?.name);

    // Listar todos los eventos registrados
    console.log('Eventos registrados:', Object.keys(socket._callbacks || {}));

    // Emitir evento de prueba
    console.log('Emitiendo evento de prueba...');
    socket.emit('test', { mensaje: 'Hola desde el cliente' });

    // Intentar recibir cualquier evento
    socket.onAny((eventName, ...args) => {
        console.log(`📨 Evento recibido: ${eventName}`, args);
    });

    return socket;
};

console.log('✅ Helper de prueba cargado. Ejecuta: window.testSocket()');
