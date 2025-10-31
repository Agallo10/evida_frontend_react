# Sistema de Notificación de Sismos en Tiempo Real

## 📋 Funcionalidades Implementadas

### 1. **Estado Global con Zustand**
- Manejo centralizado de los datos de terremotos
- Sincronización automática entre todas las páginas
- Estado de conexión del socket en tiempo real

### 2. **Actualización Automática con Socket.IO**
- Conexión WebSocket con el servidor backend
- Escucha el evento `actualizarSismos` del servidor
- Actualización automática de datos sin recargar la página

### 3. **Notificaciones Toast**
Cuando el servidor emite el evento `actualizarSismos`:
- ✅ Se actualiza la lista de terremotos
- ✅ En la página de lista: vuelve al primer sismo
- ✅ Muestra un popup/toast de "Sismos Actualizados"
- ✅ El toast desaparece automáticamente después de 3 segundos

## 🚀 Configuración del Backend

### Código del Servidor Node.js con Socket.IO

\`\`\`javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // URL del frontend
        methods: ["GET", "POST"]
    }
});

// Tu endpoint de API
app.get('/api/temblor', (req, res) => {
    // Retorna los datos de terremotos
    res.json(tusDatosDeTerremotos);
});

// Manejar conexiones de Socket.IO
io.on('connection', (socket) => {
    console.log('✅ Cliente conectado:', socket.id);
    
    // Escuchar evento del cliente para actualizar sismos
    socket.on('actualizarSismos', () => {
        console.log('🔔 Solicitud de actualización recibida de:', socket.id);
        
        // Emitir a TODOS los clientes conectados (incluyendo el que envió)
        io.emit('actualizarSismos');
        
        // O si quieres emitir a todos EXCEPTO el que envió:
        // socket.broadcast.emit('actualizarSismos');
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado:', socket.id);
    });
});

// Función para emitir desde el servidor (cuando detectas nuevos sismos)
function notificarNuevosSismos() {
    io.emit('actualizarSismos');
    console.log('📢 Evento actualizarSismos emitido a todos los clientes');
}

// Ejemplo: Llamar cuando se actualiza la base de datos
// notificarNuevosSismos();

server.listen(4000, () => {
    console.log('🚀 Servidor corriendo en http://localhost:4000');
});
\`\`\`

### Instalación de Dependencias del Backend

\`\`\`bash
npm install express socket.io cors
\`\`\`

## 🔧 Instalación del Frontend

\`\`\`bash
npm install
\`\`\`

## ▶️ Ejecutar el Proyecto

\`\`\`bash
npm run dev
\`\`\`

## 📱 Páginas Disponibles

1. **Home** - `/` - Página de inicio
2. **About** - `/about` - Información de la aplicación
3. **Mapa de Terremotos** - `/earthquake-map` - Vista de todos los sismos en mapa
4. **Lista de Terremotos** - `/earthquake-list` - Vista paginada uno por uno
5. **Test Socket** - `/socket-test` - Panel de pruebas de conexión

## 🎯 Flujo de Actualización

1. El servidor backend detecta nuevos sismos o cambios en los datos
2. El servidor emite: \`io.emit('actualizarSismos')\`
3. Todos los clientes conectados reciben el evento
4. El frontend hace fetch automático de los nuevos datos
5. En la página de lista: vuelve al primer sismo
6. Se muestra la notificación toast "Sismos Actualizados"
7. El toast desaparece después de 3 segundos

## 🧪 Cómo Probar

### Opción 1: Desde el Panel de Pruebas
1. Abre la página "Test Socket" (`/socket-test`)
2. Verifica que el socket esté conectado
3. Haz clic en "Actualizar Manualmente" para simular una actualización

### Opción 2: Desde el Backend (Emitir desde el servidor)
1. Cuando detectes nuevos sismos en tu servidor, ejecuta:
   \`\`\`javascript
   io.emit('actualizarSismos');
   \`\`\`
2. Observa cómo todas las pestañas abiertas se actualizan automáticamente

### Opción 3: Desde el Cliente (Broadcast)
1. Un cliente se conecta y emite:
   \`\`\`javascript
   socket.emit('actualizarSismos');
   \`\`\`
2. El servidor recibe el evento y hace broadcast a todos:
   \`\`\`javascript
   socket.on('actualizarSismos', () => {
       io.emit('actualizarSismos'); // Reemite a todos
   });
   \`\`\`

### Opción 4: Script de Prueba Automatizado
Crea un archivo \`test-socket-client.js\` para simular un cliente:

\`\`\`javascript
const io = require('socket.io-client');
const socket = io('http://localhost:4000');

socket.on('connect', () => {
    console.log('✅ Conectado al servidor como cliente de prueba');
    console.log('Socket ID:', socket.id);
    
    // Emitir evento cada 10 segundos
    setInterval(() => {
        console.log('📤 Emitiendo actualizarSismos...');
        socket.emit('actualizarSismos');
    }, 10000);
});

socket.on('actualizarSismos', () => {
    console.log('📥 Evento actualizarSismos recibido del servidor');
});

// Ejecuta: node test-socket-client.js
\`\`\`

## 📊 Estructura del Store (Zustand)

\`\`\`javascript
{
    earthquakes: [],           // Array de terremotos
    loading: false,            // Estado de carga
    error: null,               // Mensaje de error
    isConnected: true,         // Estado de conexión del socket
    lastUpdate: Date,          // Última actualización
    updatedFromSocket: false   // Flag para notificaciones
}
\`\`\`

## 🎨 Características del Toast

- **Posición**: Esquina inferior derecha
- **Color**: Verde (success)
- **Duración**: 3 segundos
- **Cierre automático**: Sí
- **z-index**: 9999 (siempre visible)

## 🔍 Indicadores Visuales

### Badge de Conexión
- 🟢 Socket Conectado - Verde
- ⚫ Socket Desconectado - Gris

### Badge de Magnitud
- 🔴 >= 5.0 - Peligro (danger)
- 🟡 >= 4.0 - Advertencia (warning)
- 🔵 < 4.0 - Info (info)

## 📝 Notas Importantes

1. El servidor debe estar corriendo en `http://localhost:4000`
2. El frontend corre en `http://localhost:5173`
3. Asegúrate de configurar CORS correctamente en el backend
4. La conexión Socket.IO se reconecta automáticamente si se pierde

## 🐛 Troubleshooting

### El socket no se conecta
- Verifica que el backend esté corriendo
- Revisa la configuración de CORS
- Comprueba que el puerto 4000 no esté bloqueado

### Los datos no se actualizan
- Verifica que el evento sea exactamente: \`actualizarSismos\`
- Revisa la consola del navegador para mensajes de error
- Comprueba que la API \`/api/temblor\` esté respondiendo correctamente

### El toast no aparece
- Verifica que \`updatedFromSocket\` sea \`true\` en el store
- Comprueba que el evento socket esté llegando (consola del navegador)
- Asegúrate de que el componente Toast esté renderizándose

## 📦 Dependencias Principales

- React 19.1.1
- React Router DOM
- Bootstrap & React Bootstrap
- Leaflet & React Leaflet
- Zustand (estado global)
- Socket.IO Client (websockets)

## 🤝 Contribuir

Para contribuir al proyecto:
1. Fork el repositorio
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.
