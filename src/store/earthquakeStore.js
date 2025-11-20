import { create } from 'zustand';
import { io } from 'socket.io-client';
import axios from 'axios';

// Variable de entorno para la URL de la API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const EARTHQUAKE_API_URL = import.meta.env.VITE_EARTHQUAKE_API_URL || 'http://localhost:8080';

// Configurar la conexión de Socket.IO para el backend principal (Node.js)
let socket = null;
let socketInitialized = false;

// WebSocket nativo para el servicio de sismos (Go)
let earthquakeWs = null;
let earthquakeWsInitialized = false;

const initSocket = () => {
    if (!socket) {
        socket = io(API_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });
        console.log('Socket.IO creado para backend principal');
    }
    return socket;
};

const initEarthquakeWebSocket = (onNewEarthquake) => {
    if (!earthquakeWs || earthquakeWs.readyState === WebSocket.CLOSED) {
        const wsUrl = EARTHQUAKE_API_URL.replace('http', 'ws');
        earthquakeWs = new WebSocket(`${wsUrl}/ws`);

        earthquakeWs.onopen = () => {
            console.log('✅ WebSocket conectado al servicio de sismos (Go)');
        };

        earthquakeWs.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'new_earthquake') {
                    console.log('🔔 Nuevo sismo recibido desde Go backend:', message.data);
                    onNewEarthquake(message.data);
                }
            } catch (err) {
                console.error('Error parseando mensaje de WebSocket:', err);
            }
        };

        earthquakeWs.onerror = (error) => {
            console.error('⚠️ Error en WebSocket de sismos:', error);
        };

        earthquakeWs.onclose = () => {
            console.log('❌ WebSocket de sismos desconectado');
            // Intentar reconectar después de 3 segundos
            setTimeout(() => {
                console.log('🔄 Intentando reconectar WebSocket de sismos...');
                initEarthquakeWebSocket(onNewEarthquake);
            }, 3000);
        };

        console.log('🚀 WebSocket de sismos inicializado');
    }
    return earthquakeWs;
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

    // Estado para escenarios
    escenarios: [],
    escenariosOld: [],
    escenariosLoading: false,
    escenariosError: null,

    // Función para cargar los terremotos desde la API
    fetchEarthquakes: async (fromSocket = false) => {
        set({ loading: true, error: null });
        try {
            // Nueva API de sismos en puerto 8080
            const response = await axios.get(`${EARTHQUAKE_API_URL}/api/earthquakes`);
            set({
                earthquakes: Array.isArray(response.data) ? response.data : [],
                loading: false,
                error: null,
                lastUpdate: new Date(),
                updatedFromSocket: fromSocket
            });
        } catch (err) {
            set({
                error: `Error al cargar los datos de terremotos. Verifica que el servidor esté corriendo en ${EARTHQUAKE_API_URL}`,
                loading: false
            });
            console.error('Error fetching earthquake data:', err);
        }
    },

    // Función para cargar los escenarios desde la API
    fetchEscenarios: async () => {
        set({ escenariosLoading: true, escenariosError: null });
        try {
            // Fetch de ambas APIs en paralelo con axios
            const [responseNew, responseOld] = await Promise.all([
                axios.get(`${API_URL}/api/escenarios`),
                axios.get(`${API_URL}/api/escenarios/old`)
            ]);

            set({
                escenarios: Array.isArray(responseNew.data) ? responseNew.data : [],
                escenariosOld: Array.isArray(responseOld.data) ? responseOld.data : [],
                escenariosLoading: false,
                escenariosError: null
            });
        } catch (err) {
            set({
                escenariosError: 'Error al cargar los escenarios. Verifica que el servidor esté corriendo.',
                escenariosLoading: false
            });
            console.error('Error fetching escenarios data:', err);
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
            console.log('Socket.IO ya está inicializado');
            return;
        }

        const sock = initSocket();
        socketInitialized = true;

        // Conexión establecida
        sock.on('connect', () => {
            console.log('✅ Socket.IO conectado:', sock.id);
            set({ isConnected: true });
        });

        // Conexión perdida
        sock.on('disconnect', () => {
            console.log('❌ Socket.IO desconectado');
            set({ isConnected: false });
        });

        // Escuchar evento de actualización de sismos (backend Node.js)
        sock.on('actualizarSismos', () => {
            console.log('🔔 Evento "actualizarSismos" recibido del servidor Node.js');
            get().updateEarthquakes();
        });

        // Error de conexión
        sock.on('connect_error', (error) => {
            console.error('⚠️ Error de conexión de Socket.IO:', error);
            set({ isConnected: false });
        });

        console.log('🚀 Socket.IO inicializado y escuchando eventos');
        set({ socketListenersCount: get().socketListenersCount + 1 });

        // Inicializar WebSocket para sismos (Go backend)
        if (!earthquakeWsInitialized) {
            earthquakeWsInitialized = true;
            initEarthquakeWebSocket((newEarthquake) => {
                console.log('📡 Actualizando lista de sismos por WebSocket (Go)');
                get().updateEarthquakes();
            });
        }
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
export { initSocket, initEarthquakeWebSocket };
