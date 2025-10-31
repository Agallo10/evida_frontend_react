import { create } from 'zustand';
import { io } from 'socket.io-client';

// Configurar la conexión de Socket.IO (Singleton)
let socket = null;
let socketInitialized = false;

const initSocket = () => {
    if (!socket) {
        socket = io('http://localhost:4000', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });
        console.log('Socket creado por primera vez');
    }
    return socket;
};

// Store de Zustand para los terremotos
const useEarthquakeStore = create((set, get) => ({
    earthquakes: [],
    loading: true,
    error: null,
    isConnected: false,
    lastUpdate: null,
    updatedFromSocket: false,
    socketListenersCount: 0,

    // Función para cargar los terremotos desde la API
    fetchEarthquakes: async (fromSocket = false) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch('http://localhost:4000/api/temblor');
            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }
            const data = await response.json();
            set({
                earthquakes: Array.isArray(data) ? data : [],
                loading: false,
                error: null,
                lastUpdate: new Date(),
                updatedFromSocket: fromSocket
            });
        } catch (err) {
            set({
                error: 'Error al cargar los datos de terremotos. Verifica que el servidor local esté corriendo en http://localhost:4000',
                loading: false
            });
            console.error('Error fetching earthquake data:', err);
        }
    },

    // Función para actualizar los terremotos (llamada por socket)
    updateEarthquakes: async () => {
        console.log('Actualizando sismos por evento de socket...');
        await get().fetchEarthquakes(true);
    },

    // Resetear el flag de actualización desde socket
    resetSocketUpdateFlag: () => {
        set({ updatedFromSocket: false });
    },

    // Inicializar la conexión de sockets (solo una vez)
    initializeSocket: () => {
        if (socketInitialized) {
            console.log('Socket ya está inicializado');
            return;
        }

        const sock = initSocket();
        socketInitialized = true;

        // Conexión establecida
        sock.on('connect', () => {
            console.log('✅ Socket conectado:', sock.id);
            set({ isConnected: true });
        });

        // Conexión perdida
        sock.on('disconnect', () => {
            console.log('❌ Socket desconectado');
            set({ isConnected: false });
        });

        // Escuchar evento de actualización de sismos
        sock.on('actualizarSismos', () => {
            console.log('🔔 Evento "actualizarSismos" recibido del servidor');
            get().updateEarthquakes();
        });

        // Error de conexión
        sock.on('connect_error', (error) => {
            console.error('⚠️ Error de conexión de socket:', error);
            set({ isConnected: false });
        });

        console.log('🚀 Socket inicializado y escuchando eventos');
        set({ socketListenersCount: get().socketListenersCount + 1 });
    },

    // Reducir contador de listeners (ya no desconectamos el socket)
    disconnectSocket: () => {
        const count = get().socketListenersCount - 1;
        set({ socketListenersCount: count });
        console.log(`📊 Listeners activos: ${count}`);
        // Ya no desconectamos el socket para mantener la conexión persistente
    }
}));

export default useEarthquakeStore;
export { initSocket };
