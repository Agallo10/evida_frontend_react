# Sistema de Monitoreo de Sismos en Tiempo Real

Aplicación web desarrollada con React + Vite que muestra terremotos en tiempo real con actualización automática vía WebSocket.

## 🚀 Características

- 📊 **Estado Global con Zustand** - Manejo centralizado de datos
- 🔌 **WebSocket con Socket.IO** - Actualizaciones en tiempo real
- 🗺️ **Mapas Interactivos con Leaflet** - Visualización geoespacial
- 📱 **Diseño Responsivo** - Bootstrap 5 + React Bootstrap
- 🔔 **Notificaciones Toast** - Alertas de actualización
- 📄 **Múltiples Vistas** - Mapa completo y lista paginada

## 📁 Estructura del Proyecto

```
src/
├── components/
│   └── Layout/
│       ├── index.jsx           # Componente principal con sidebar
│       └── Layout.css          # Estilos del layout
├── pages/
│   ├── EarthquakeMap/
│   │   ├── index.jsx           # Vista de mapa con todos los sismos
│   │   └── EarthquakeMap.css   # Estilos del mapa
│   ├── EarthquakeList/
│   │   ├── index.jsx           # Vista paginada de sismos
│   │   └── EarthquakeList.css  # Estilos de la lista
│   ├── About.jsx               # Página acerca de
│   ├── Home.jsx                # Página de inicio
│   └── SocketTest.jsx          # Panel de pruebas de socket
├── store/
│   └── earthquakeStore.js      # Store de Zustand con Socket.IO
├── App.jsx                     # Configuración de rutas
└── main.jsx                    # Punto de entrada

```

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build
```

## 📦 Dependencias Principales

- **React** 19.1.1
- **React Router DOM** - Navegación
- **Zustand** - Estado global
- **Socket.IO Client** - WebSocket
- **Leaflet & React Leaflet** - Mapas
- **Bootstrap & React Bootstrap** - UI
- **Vite** - Build tool

## 🔧 Configuración del Backend

El frontend se conecta a `http://localhost:4000`. Ver [SOCKET_README.md](./SOCKET_README.md) para la configuración completa del servidor.

### Ejemplo Básico del Servidor

```javascript
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    socket.on('actualizarSismos', () => {
        io.emit('actualizarSismos');
    });
});
```

## 📱 Páginas Disponibles

| Ruta | Descripción |
|------|-------------|
| `/` | Página de inicio |
| `/about` | Información de la aplicación |
| `/earthquake-map` | Mapa con todos los terremotos |
| `/earthquake-list` | Lista paginada de terremotos |
| `/socket-test` | Panel de pruebas de conexión |

## 🎯 Funcionalidades Clave

### Actualización en Tiempo Real
Cuando el servidor emite `actualizarSismos`:
- ✅ Se actualizan los datos automáticamente
- ✅ Notificación toast verde
- ✅ La lista vuelve al primer sismo
- ✅ Animación suave del mapa

### Visualización de Datos
- **Mapa**: Círculos de colores según magnitud
- **Lista**: Navegación uno por uno con detalles completos
- **Filtros**: Por magnitud, ubicación, profundidad

## 🧪 Testing

1. Abre `/socket-test` para verificar la conexión
2. Verifica que muestre "🟢 Socket Conectado"
3. Usa los botones de prueba o emite desde el servidor

## 📚 Documentación Adicional

- [SOCKET_README.md](./SOCKET_README.md) - Configuración completa de Socket.IO
- [DEBUGGING_SOCKET.md](./DEBUGGING_SOCKET.md) - Guía de troubleshooting

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

MIT
