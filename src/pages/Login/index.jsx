import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Alert, FloatingLabel } from 'react-bootstrap';
import './Login.css';

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
            const response = await fetch('http://localhost:4000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user: formData.username,
                    pass: formData.password
                })
            });

            const data = await response.json();

            if (response.ok && data.token) {
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
            setError('Error al conectar con el servidor. Verifique que el backend esté corriendo.');
            console.error('Login error:', err);
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
