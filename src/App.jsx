import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import EarthquakeMap from './pages/EarthquakeMap';
import EarthquakeList from './pages/EarthquakeList';
import SocketTest from './pages/SocketTest';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="earthquake-map" element={<EarthquakeMap />} />
          <Route path="earthquake-list" element={<EarthquakeList />} />
          <Route path="socket-test" element={<SocketTest />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
