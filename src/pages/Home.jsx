import { Container } from 'react-bootstrap';
import './Home.css';

function Home() {
    return (
        <Container fluid className="home-container">
            <div className="home-content">
                <div className="logo-container">
                    <img 
                        src="/dimar-logo.png" 
                        alt="DIMAR - Dirección General Marítima" 
                        className="dimar-logo"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'block';
                        }}
                    />
                    <div className="logo-placeholder" style={{ display: 'none' }}>
                        <div className="placeholder-box">
                            <i className="bi bi-image" style={{ fontSize: '4rem' }}></i>
                            <p>Logo DIMAR</p>
                        </div>
                    </div>
                </div>
                
                <div className="welcome-text">
                    <h1>Sistema de Vigilancia y Alerta de Tsunamis</h1>
                    <p className="subtitle">
                        Bienvenido al sistema EVIDA - Monitoreo sísmico y gestión de alertas de tsunami 
                        para la protección de las costas colombianas
                    </p>
                    <div className="info-badge">
                        <i className="bi bi-shield-check me-2"></i>
                        Sistema de Monitoreo en Tiempo Real
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default Home;
