import { Container } from 'react-bootstrap';
import './About.css';

function About() {
    return (
        <Container fluid className="about-container">
            <div className="about-content">
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
                
                <div className="about-text">
                    <h1>Acerca del Sistema EVIDA</h1>
                    <p className="subtitle">
                        El Sistema de Vigilancia y Alerta de Tsunamis (EVIDA) es una herramienta desarrollada 
                        por la Dirección General Marítima - DIMAR para la protección de las comunidades costeras 
                        colombianas ante amenazas de tsunamis.
                    </p>
                    
                    <div className="mission-section">
                        <h3><i className="bi bi-bullseye me-2"></i>Nuestra Misión</h3>
                        <p>
                            Proporcionar un sistema confiable de monitoreo sísmico y alerta temprana de tsunamis, 
                            garantizando la seguridad de las poblaciones costeras mediante información oportuna 
                            y precisa para la toma de decisiones.
                        </p>
                    </div>
                    
                    <div className="vision-section">
                        <h3><i className="bi bi-eye me-2"></i>Nuestra Visión</h3>
                        <p>
                            Ser el sistema líder en Colombia para la prevención y mitigación de riesgos 
                            asociados a tsunamis, integrando tecnología de punta con protocolos efectivos 
                            de respuesta ante emergencias.
                        </p>
                    </div>
                    
                    <div className="info-badge">
                        <i className="bi bi-shield-check me-2"></i>
                        Vigilancia Continua 24/7
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default About;
