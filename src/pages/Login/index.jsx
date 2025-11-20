import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Alert, FloatingLabel } from 'react-bootstrap';
import axios from 'axios';
import './Login.css';

// Configuración de la API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        rememberMe: false
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/login`, {
                user: formData.username,
                pass: formData.password
            });

            const data = response.data;

            if (data.token) {
                // Guardar token y datos de usuario
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('token', data.token);
                localStorage.setItem('usuario', JSON.stringify(data.usuario));

                if (formData.rememberMe) {
                    localStorage.setItem('username', formData.username);
                }

                console.log('✅ Login exitoso:', {
                    usuario: data.usuario.nombre,
                    uid: data.usuario.uid,
                    token: data.token.substring(0, 20) + '...'
                });

                // Redirigir al dashboard
                navigate('/');
            } else {
                setError(data.error || 'Credenciales incorrectas. Por favor intente nuevamente.');
            }
        } catch (err) {
            // Manejo de errores de axios
            if (err.response) {
                // El servidor respondió con un código de estado fuera del rango 2xx
                const errorMessage = err.response.data?.error || err.response.data?.message || 'Credenciales incorrectas';
                setError(errorMessage);
                console.error('❌ Error de autenticación:', err.response.data);
            } else if (err.request) {
                // La petición fue hecha pero no hubo respuesta
                setError('Error al conectar con el servidor. Verifique que el backend esté corriendo.');
                console.error('❌ Error de conexión:', err.request);
            } else {
                // Algo sucedió al configurar la petición
                setError('Error inesperado. Por favor intente nuevamente.');
                console.error('❌ Error:', err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div>
                <div className="login-card">
                    <div className="login-header">
                        <img
                            src="/dimar-logo.png"
                            alt="DIMAR Logo"
                            className="login-logo"
                        />
                        <h1 className="login-title">EVIDA</h1>
                        <p className="login-subtitle">Sistema de Alerta de Tsunamis</p>
                    </div>

                    {error && (
                        <Alert variant="danger" className="alert-login" dismissible onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}

                    <Form className="login-form" onSubmit={handleSubmit}>
                        <FloatingLabel
                            controlId="floatingUsername"
                            label="Usuario"
                            className="mb-3"
                        >
                            <Form.Control
                                type="text"
                                name="username"
                                placeholder="Usuario"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                autoComplete="username"
                            />
                        </FloatingLabel>

                        <FloatingLabel
                            controlId="floatingPassword"
                            label="Contraseña"
                            className="mb-3"
                        >
                            <Form.Control
                                type="password"
                                name="password"
                                placeholder="Contraseña"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                autoComplete="current-password"
                            />
                        </FloatingLabel>

                        <Form.Check
                            type="checkbox"
                            id="rememberMe"
                            name="rememberMe"
                            label="Recordar sesión"
                            checked={formData.rememberMe}
                            onChange={handleChange}
                            className="mb-3"
                        />

                        <Button
                            type="submit"
                            className="btn-login"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Iniciando sesión...
                                </>
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </Button>
                    </Form>

                    <div className="login-footer">
                        <a href="#forgot-password">¿Olvidó su contraseña?</a>
                    </div>
                </div>

                <div className="system-info">
                    <strong>Dirección General Marítima - DIMAR</strong>
                    <div>Centro de Investigaciones Oceanográficas e Hidrográficas del Pacífico</div>
                </div>
            </div>
        </div>
    );
}

export default Login;
