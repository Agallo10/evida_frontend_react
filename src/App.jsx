import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import EarthquakeMap from './pages/EarthquakeMap';
import EarthquakeList from './pages/EarthquakeList';
import Escenarios from './pages/Escenarios';
import Entidades from './pages/Entidades';
import Contactos from './pages/Contactos';
import Correos from './pages/Correos';
import SocketTest from './pages/SocketTest';
import Login from './pages/Login';
import { isAuthenticated } from './utils/authHelper';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Componente para rutas protegidas
function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta de login */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="earthquake-map" element={<EarthquakeMap />} />
          <Route path="earthquake-list" element={<EarthquakeList />} />
          <Route path="escenarios" element={<Escenarios />} />
          <Route path="entidades" element={<Entidades />} />
          <Route path="contactos" element={<Contactos />} />
          <Route path="correos" element={<Correos />} />
          <Route path="socket-test" element={<SocketTest />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
