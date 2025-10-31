# 🔧 Guía de Debugging - Socket.IO

## ⚠️ Problema: El evento `actualizarSismos` no refresca los datos

### ✅ Cambios Implementados

1. **Socket como Singleton**: El socket ahora es único y persiste entre navegación de páginas
2. **No se desconecta**: Los listeners ya no se eliminan al cambiar de página
3. **Más logs**: Emojis en consola para identificar eventos fácilmente

### 🔍 Pasos para Verificar el Problema

#### 1. Verificar que el Socket está Conectado

Abre la consola del navegador (F12) y busca:
```
✅ Socket conectado: [socket-id]
🚀 Socket inicializado y escuchando eventos
```

#### 2. Verificar el Backend

En tu servidor Node.js, asegúrate de que:

```javascript
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Verificar conexión de clientes
io.on('connection', (socket) => {
    console.log('✅ Cliente conectado:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado:', socket.id);
    });
});

// Para emitir el evento a TODOS los clientes
io.emit('actualizarSismos');

// NO uses: socket.emit() (solo envía a un cliente)
```

#### 3. Usar el Helper de Prueba

En la consola del navegador, ejecuta:
```javascript
window.testSocket()
```

Esto mostrará:
- ID del socket
- Estado de conexión
- URL del servidor
- Tipo de transporte (websocket/polling)
- Eventos registrados

#### 4. Verificar que el Evento Llega

Cuando el backend emite `actualizarSismos`, deberías ver en consola:
```
🔔 Evento "actualizarSismos" recibido del servidor
Actualizando sismos por evento de socket...
```

### 🐛 Problemas Comunes y Soluciones

#### Problema 1: "Socket desconectado" constantemente
**Causa**: CORS mal configurado o puerto incorrecto
**Solución**:
```javascript
// Backend
const io = require('socket.io')(server, {
    cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
        methods: ["GET", "POST"],
        credentials: true
    }
});
```

#### Problema 2: El evento no se recibe
**Causa 1**: El servidor no está configurado para escuchar y reemitir
```javascript
// ✅ CORRECTO - El servidor escucha y reemite
io.on('connection', (socket) => {
    socket.on('actualizarSismos', () => {
        // Reemitir a TODOS los clientes
        io.emit('actualizarSismos');
        
        // O a todos excepto el que envió:
        // socket.broadcast.emit('actualizarSismos');
    });
});

// También puedes emitir directamente desde el servidor:
function notificarNuevosSismos() {
    io.emit('actualizarSismos');
}
```

**Causa 2**: El nombre del evento no coincide
```javascript
// Backend debe usar EXACTAMENTE el mismo nombre
socket.on('actualizarSismos', () => { ... }); // Con mayúscula en la S
```

#### Problema 3: Socket se reconecta constantemente
**Causa**: StrictMode en React causa doble mount
**Solución**: Ya implementado - el socket es singleton y no se destruye

### 🧪 Prueba Manual del Backend

Crea un archivo `test-emit.js` en tu backend:

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:4000');

socket.on('connect', () => {
    console.log('Conectado al servidor como cliente de prueba');
    console.log('Socket ID:', socket.id);
    
    // Forzar al servidor a emitir (si tienes un endpoint para esto)
    // O manualmente desde el código del servidor:
    setInterval(() => {
        console.log('Simulando actualización de sismos...');
        // Esto debe ejecutarse en tu servidor, no aquí
        // io.emit('actualizarSismos');
    }, 10000);
});

socket.on('actualizarSismos', () => {
    console.log('✅ Evento actualizarSismos recibido!');
});
```

### 📝 Checklist de Verificación

- [ ] El servidor backend está corriendo en `http://localhost:4000`
- [ ] El endpoint `/api/temblor` responde correctamente
- [ ] Socket.IO está instalado en el backend: `npm install socket.io`
- [ ] CORS está configurado correctamente
- [ ] El frontend muestra "Socket Conectado" (badge verde)
- [ ] La consola muestra "✅ Socket conectado: [id]"
- [ ] El servidor usa `io.emit('actualizarSismos')` no `socket.emit()`
- [ ] El nombre del evento es exactamente `actualizarSismos`

### 🔬 Código Completo del Servidor para Pruebas

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Endpoint API de sismos
app.get('/api/temblor', (req, res) => {
    // Tus datos de terremotos
    res.json(misDatos);
});

// Endpoint para forzar actualización (solo pruebas)
app.get('/api/trigger-update', (req, res) => {
    console.log('🔔 Forzando actualización vía API');
    io.emit('actualizarSismos');
    res.json({ 
        message: 'Evento emitido', 
        clients: io.engine.clientsCount 
    });
});

// Socket.IO - Manejar conexiones
io.on('connection', (socket) => {
    console.log('✅ Cliente conectado:', socket.id);
    
    // Escuchar cuando un cliente pide actualizar
    socket.on('actualizarSismos', () => {
        console.log('📤 Cliente', socket.id, 'solicita actualización');
        // Reemitir a TODOS (incluyendo quien envió)
        io.emit('actualizarSismos');
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado:', socket.id);
    });
});

server.listen(4000, () => {
    console.log('🚀 Servidor en http://localhost:4000');
});
```

**Probar desde el navegador o Postman:**
```
GET http://localhost:4000/api/trigger-update
```

### 📊 Logs Esperados

**Frontend (Consola del Navegador)**:
```
✅ Socket conectado: abc123xyz
🚀 Socket inicializado y escuchando eventos
🔔 Evento "actualizarSismos" recibido del servidor
Actualizando sismos por evento de socket...
```

**Backend (Terminal del Servidor)**:
```
✅ Cliente conectado: abc123xyz
🔔 Emitiendo actualizarSismos a todos los clientes
```

### 🆘 Si Nada Funciona

1. Reinicia el servidor backend
2. Recarga el frontend (Ctrl + F5)
3. Limpia cache del navegador
4. Verifica que no haya firewall bloqueando el puerto 4000
5. Intenta cambiar el puerto temporalmente
6. Usa el panel "Network" en DevTools, pestaña "WS" para ver WebSocket

### 📞 Herramientas de Debugging

- **Chrome DevTools**: F12 → Network → WS (ver mensajes de WebSocket)
- **Console**: Ver todos los logs del socket
- **window.testSocket()**: Función helper para inspeccionar el socket

### 🎯 Testing Rápido

1. Abre `/socket-test` en el navegador
2. Verifica que muestre "Socket Conectado"
3. Haz clic en "Actualizar Manualmente" - debería mostrar el toast
4. Desde tu servidor backend ejecuta: `io.emit('actualizarSismos')`
5. Deberías ver el toast aparecer automáticamente

---

## 🔗 Enlaces Útiles

- Socket.IO Docs: https://socket.io/docs/v4/
- Troubleshooting: https://socket.io/docs/v4/troubleshooting-connection-issues/
- CORS: https://socket.io/docs/v4/handling-cors/
