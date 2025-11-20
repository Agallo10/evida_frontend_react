/**
 * Helper para manejar autenticación y peticiones con JWT
 */
import axios from 'axios';

// Configuración de la API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Obtiene el token JWT del localStorage
 * @returns {string|null} Token JWT o null si no existe
 */
export const getToken = () => {
    return localStorage.getItem('token');
};

/**
 * Obtiene los datos del usuario del localStorage
 * @returns {object|null} Objeto usuario o null si no existe
 */
export const getUsuario = () => {
    const usuarioData = localStorage.getItem('usuario');
    return usuarioData ? JSON.parse(usuarioData) : null;
};

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean} True si está autenticado
 */
export const isAuthenticated = () => {
    return localStorage.getItem('isAuthenticated') === 'true' && !!getToken();
};

/**
 * Realiza una petición HTTP con el token JWT incluido
 * @param {string} endpoint - Endpoint de la API (sin incluir la base URL)
 * @param {object} options - Opciones de axios (method, data, etc.)
 * @returns {Promise} Promesa con la respuesta
 */
export const fetchWithAuth = async (endpoint, options = {}) => {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['user-token'] = token; // Header requerido por el backend
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-token'] = token;
    }

    const config = {
        ...options,
        url: `${API_URL}${endpoint}`,
        headers,
    };

    try {
        const response = await axios(config);
        return response;
    } catch (error) {
        // Si el token expiró o es inválido (401), redirigir al login
        if (error.response && error.response.status === 401) {
            localStorage.clear();
            window.location.href = '/login';
            throw new Error('Sesión expirada. Por favor inicie sesión nuevamente.');
        }

        console.error('Error en petición autenticada:', error);
        throw error;
    }
};

/**
 * Cierra la sesión del usuario
 */
export const logout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('username');
    window.location.href = '/login';
};

/**
 * Decodifica el payload de un JWT (sin validar la firma)
 * @param {string} token - Token JWT
 * @returns {object|null} Payload decodificado o null si falla
 */
export const decodeJWT = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decodificando JWT:', error);
        return null;
    }
};

/**
 * Verifica si el token ha expirado
 * @param {string} token - Token JWT
 * @returns {boolean} True si el token ha expirado
 */
export const isTokenExpired = (token) => {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return true;

    // exp está en segundos, Date.now() en milisegundos
    return payload.exp * 1000 < Date.now();
};
