import { useState } from 'react';
import PropTypes from 'prop-types';
import './FloatingLocalidadesCard.css';

// Configuración de la API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * FloatingLocalidadesCard - Componente reutilizable para mostrar información de localidades afectadas
 * por simulaciones de tsunamis.
 * 
 * @param {Object} props
 * @param {Object} props.escenario - Objeto con datos del escenario de simulación
 * @param {Array} props.escenario.simulaciones - Array de simulaciones por localidad
 * @param {Object|null} props.alturaData - Datos de altura de las localidades
 * @param {Function} props.getEstadoColor - Función para obtener color según estado
 */
function FloatingLocalidadesCard({ escenario, alturaData, getEstadoColor }) {
    const [isCardExpanded, setIsCardExpanded] = useState(false);

    if (!escenario || escenario.old || !escenario.simulaciones || escenario.simulaciones.length === 0) {
        return null;
    }

    const firstLocalidad = escenario.simulaciones[0];

    const toggleCard = () => {
        setIsCardExpanded(!isCardExpanded);
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: isCardExpanded ? '10px' : '80px',
            right: isCardExpanded ? '10px' : '20px',
            left: isCardExpanded ? '10px' : 'auto',
            top: isCardExpanded ? '10px' : 'auto',
            display: 'flex',
            gap: '15px',
            alignItems: isCardExpanded ? 'flex-start' : 'flex-end',
            zIndex: 1000,
        }}>
            {/* Card de Localidades */}
            <div
                className={`floating-localidades-card ${isCardExpanded ? 'expanded' : ''}`}
                onClick={toggleCard}
                style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    padding: isCardExpanded ? '20px' : '15px',
                    cursor: isCardExpanded ? 'default' : 'pointer',
                    transition: 'all 0.3s ease',
                    maxWidth: isCardExpanded ? 'none' : '250px',
                    width: isCardExpanded ? 'auto' : '250px',
                    maxHeight: isCardExpanded ? 'none' : 'auto',
                    overflowY: isCardExpanded ? 'auto' : 'hidden',
                    flex: isCardExpanded ? '1' : '0 0 auto'
                }}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: isCardExpanded ? '15px' : '12px',
                    borderBottom: isCardExpanded ? '2px solid #dee2e6' : 'none',
                    paddingBottom: isCardExpanded ? '12px' : '0'
                }}>
                    <h6 style={{
                        margin: 0,
                        fontWeight: 'bold',
                        color: '#2c3e50',
                        fontSize: isCardExpanded ? '18px' : '14px'
                    }}>
                        <i className="bi bi-geo-alt-fill me-2" style={{ color: '#0d6efd' }}></i>
                        {isCardExpanded ? 'Localidades Afectadas' : firstLocalidad.localidad ? firstLocalidad.localidad.charAt(0).toUpperCase() + firstLocalidad.localidad.slice(1) : 'Localidad'}
                    </h6>
                    <i
                        className={`bi bi-${isCardExpanded ? 'x-lg' : 'chevron-up'}`}
                        style={{
                            color: '#6c757d',
                            fontSize: isCardExpanded ? '24px' : '18px',
                            transition: 'transform 0.3s ease',
                            cursor: 'pointer'
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleCard();
                        }}
                    ></i>
                </div>

                {isCardExpanded && (
                    <div style={{ marginTop: '15px' }} onClick={(e) => e.stopPropagation()}>
                        {/* 3-Column Grid Layout */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '35% 30% 35%',
                            gap: '14px',
                            marginBottom: '14px'
                        }}>
                            {/* LEFT: Map Card */}
                            <div style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                                border: '1px solid #dee2e6',
                                padding: '14px',
                                maxHeight: '480px',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '10px',
                                    paddingBottom: '8px',
                                    borderBottom: '2px solid #0d6efd'
                                }}>
                                    <div>
                                        <h6 style={{ margin: 0, fontWeight: '700', color: '#1a1a1a', fontSize: '16px' }}>
                                            <i className="bi bi-map" style={{ color: '#0d6efd', marginRight: '8px' }}></i>
                                            Pacífico – Altura máx. ola
                                        </h6>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#666' }}>
                                            Simulación de tsunami
                                        </p>
                                    </div>
                                    <button
                                        style={{
                                            padding: '6px 12px',
                                            backgroundColor: '#0d6efd',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (firstLocalidad?.imagen) {
                                                window.open(`${API_URL}/img?img=${firstLocalidad.imagen}`, '_blank');
                                            }
                                        }}
                                    >
                                        <i className="bi bi-arrows-fullscreen me-1"></i>
                                        Ampliar
                                    </button>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                                    {firstLocalidad?.imagen && (
                                        <img
                                            src={`${API_URL}/img?img=${firstLocalidad.imagen}`}
                                            alt={`Mapa Pacífico`}
                                            style={{
                                                width: '100%',
                                                height: 'auto',
                                                maxWidth: '100%',
                                                objectFit: 'contain',
                                                borderRadius: '8px',
                                                border: '1px solid #e0e0e0'
                                            }}
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* CENTER: Wave Image Card */}
                            <div style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                                border: '1px solid #dee2e6',
                                padding: '14px',
                                maxHeight: '480px',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '10px',
                                    paddingBottom: '8px',
                                    borderBottom: '2px solid #0d6efd'
                                }}>
                                    <div>
                                        <h6 style={{ margin: 0, fontWeight: '700', color: '#1a1a1a', fontSize: '16px' }}>
                                            <i className="bi bi-water" style={{ color: '#0d6efd', marginRight: '8px' }}></i>
                                            Ola máxima
                                        </h6>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#666' }}>
                                            Visualización de onda
                                        </p>
                                    </div>
                                    <button
                                        style={{
                                            padding: '6px 12px',
                                            backgroundColor: '#0d6efd',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (firstLocalidad?.imagen) {
                                                const imgPath = firstLocalidad.imagen;
                                                const pathParts = imgPath.split('/');
                                                if (pathParts.length >= 4) {
                                                    const basePath = pathParts.slice(0, 4).join('/');
                                                    const waveUrl = `${API_URL}/img?img=${encodeURIComponent(basePath + '/result/max1.png')}&name=wave`;
                                                    window.open(waveUrl, '_blank');
                                                }
                                            }
                                        }}
                                    >
                                        <i className="bi bi-arrows-fullscreen me-1"></i>
                                        Ampliar
                                    </button>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                                    {(() => {
                                        if (firstLocalidad?.imagen) {
                                            const imgPath = firstLocalidad.imagen;
                                            const pathParts = imgPath.split('/');
                                            if (pathParts.length >= 4) {
                                                const basePath = pathParts.slice(0, 4).join('/');
                                                const waveUrl = `${API_URL}/img?img=${encodeURIComponent(basePath + '/result/max1.png')}&name=wave`;
                                                return (
                                                    <img
                                                        src={waveUrl}
                                                        alt="Ola máxima"
                                                        style={{
                                                            width: '100%',
                                                            height: 'auto',
                                                            maxWidth: '100%',
                                                            objectFit: 'contain',
                                                            borderRadius: '8px',
                                                            border: '1px solid #e0e0e0'
                                                        }}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            const sibling = e.target.nextElementSibling;
                                                            if (sibling) sibling.style.display = 'flex';
                                                        }}
                                                    />
                                                );
                                            }
                                        }
                                        return (
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                height: '200px',
                                                backgroundColor: '#f8f9fa',
                                                borderRadius: '8px',
                                                color: '#6c757d',
                                                fontSize: '12px',
                                                textAlign: 'center',
                                                padding: '20px'
                                            }}>
                                                <div>
                                                    <i className="bi bi-image" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}></i>
                                                    No hay ruta de imagen disponible
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    <div style={{
                                        display: 'none',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        height: '200px',
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: '8px',
                                        color: '#6c757d',
                                        fontSize: '12px',
                                        textAlign: 'center',
                                        padding: '20px'
                                    }}>
                                        <div>
                                            <i className="bi bi-image" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}></i>
                                            Error al cargar la imagen
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Table Panel */}
                            {alturaData && (
                                <div style={{
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                                    padding: '14px',
                                    border: '1px solid #e0e0e0',
                                    maxHeight: '480px',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        marginBottom: '12px',
                                        paddingBottom: '10px',
                                        borderBottom: '2px solid #0d6efd'
                                    }}>
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            backgroundColor: '#e7f3ff',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <i className="bi bi-water" style={{ color: '#0d6efd', fontSize: '20px' }}></i>
                                        </div>
                                        <div>
                                            <h6 style={{ margin: 0, fontWeight: '700', color: '#1a1a1a', fontSize: '15px' }}>
                                                Datos de Simulación
                                            </h6>
                                            <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                                                {firstLocalidad.localidad?.charAt(0).toUpperCase() + firstLocalidad.localidad?.slice(1)}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                                        {(() => {
                                            let data = alturaData;
                                            if (typeof data === 'string') {
                                                try {
                                                    data = JSON.parse(data);
                                                } catch (e) {
                                                    console.error('Error parsing alturaData:', e);
                                                    return null;
                                                }
                                            }

                                            const rows = Array.isArray(data) ? data : (data && typeof data === 'object' ? [data] : []);

                                            if (!rows || rows.length === 0) {
                                                return (
                                                    <div style={{
                                                        padding: '16px',
                                                        backgroundColor: '#fff3cd',
                                                        borderRadius: '8px',
                                                        color: '#856404',
                                                        fontSize: '12px',
                                                        textAlign: 'center',
                                                        border: '1px dashed #ffc107'
                                                    }}>
                                                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                                        No hay datos disponibles
                                                    </div>
                                                );
                                            }

                                            const columns = [
                                                { key: 'localidad', label: 'Localidad', align: 'left' },
                                                { key: 'altura', label: 'Altura', align: 'right' },
                                                { key: 'tiempo', label: 'Tiempo', align: 'right' },
                                                { key: 'estado', label: 'Estado', align: 'left' },
                                                { key: 'fecha', label: 'Fecha', align: 'left' }
                                            ];

                                            return (
                                                <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px' }}>
                                                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5ff', zIndex: 1 }}>
                                                            <tr>
                                                                {columns.map(col => (
                                                                    <th key={col.key} style={{
                                                                        textAlign: col.align,
                                                                        padding: '10px 12px',
                                                                        fontWeight: 700,
                                                                        color: '#0d47a1',
                                                                        borderBottom: '2px solid #0d6efd',
                                                                        fontSize: '11px',
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.5px'
                                                                    }}>
                                                                        {col.label}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {rows.map((row, rIdx) => (
                                                                <tr key={rIdx} style={{
                                                                    background: rIdx % 2 === 0 ? '#ffffff' : '#fafbfc',
                                                                    height: '38px'
                                                                }}>
                                                                    {columns.map(col => {
                                                                        const value = row?.[col.key];
                                                                        if (col.key === 'estado') {
                                                                            const hex = row?.estadoColor;
                                                                            return (
                                                                                <td key={col.key} style={{ padding: '8px 12px', borderBottom: '1px solid #eeeeee', textAlign: col.align }}>
                                                                                    {hex ? (
                                                                                        <span style={{
                                                                                            backgroundColor: hex,
                                                                                            color: '#fff',
                                                                                            padding: '3px 8px',
                                                                                            borderRadius: '999px',
                                                                                            fontSize: '11px',
                                                                                            fontWeight: 600,
                                                                                            whiteSpace: 'nowrap'
                                                                                        }}>
                                                                                            {String(value ?? '')}
                                                                                        </span>
                                                                                    ) : (
                                                                                        String(value ?? '')
                                                                                    )}
                                                                                </td>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <td key={col.key} style={{
                                                                                padding: '8px 12px',
                                                                                borderBottom: '1px solid #eeeeee',
                                                                                textAlign: col.align,
                                                                                fontWeight: (col.align === 'right' ? 600 : 400)
                                                                            }}>
                                                                                {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* BOTTOM: Locality Cards */}
                        {escenario.simulaciones.length > 1 && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
                                gap: '14px',
                                marginTop: '14px'
                            }}>
                                {escenario.simulaciones.slice(1).map((sim, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '200px 1fr auto',
                                            gap: '12px',
                                            padding: '12px',
                                            backgroundColor: '#fff',
                                            borderRadius: '10px',
                                            border: '1px solid #dee2e6',
                                            alignItems: 'center',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                            e.currentTarget.style.borderColor = '#0d6efd';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.borderColor = '#dee2e6';
                                        }}
                                    >
                                        {sim.imagen && (
                                            <div>
                                                <img
                                                    src={`${API_URL}/img?img=${sim.imagen}`}
                                                    alt={`Simulación ${sim.localidad}`}
                                                    style={{
                                                        width: '100%',
                                                        height: '200px',
                                                        objectFit: 'cover',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e0e0e0',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(`${API_URL}/img?img=${sim.imagen}`, '_blank');
                                                    }}
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <div style={{ marginBottom: '10px' }}>
                                                <strong style={{ fontSize: 15, color: '#0d6efd', display: 'block', marginBottom: '4px' }}>
                                                    <i className="bi bi-geo-alt-fill me-1"></i>
                                                    {sim.localidad ? sim.localidad.charAt(0).toUpperCase() + sim.localidad.slice(1) : 'N/A'}
                                                </strong>
                                                {sim.origen && (
                                                    <span style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: '2px' }}>
                                                        <i className="bi bi-compass me-1"></i>
                                                        {sim.origen}
                                                    </span>
                                                )}
                                                {sim.caso && (
                                                    <span style={{ fontSize: 11, color: '#666', display: 'block' }}>
                                                        <i className="bi bi-folder me-1"></i>
                                                        Caso: {sim.caso}
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <i className="bi bi-water" style={{ color: '#17a2b8', fontSize: 16 }}></i>
                                                    <div>
                                                        <strong style={{ color: '#dc3545', fontSize: 14 }}>{sim.altura ?? '—'}m</strong>
                                                        <div style={{ fontSize: 10, color: '#6c757d' }}>Altura</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <i className="bi bi-clock" style={{ color: '#ff9800', fontSize: 16 }}></i>
                                                    <div>
                                                        <strong style={{ color: '#ff9800', fontSize: 14 }}>{sim.tiempo ?? '—'}min</strong>
                                                        <div style={{ fontSize: 10, color: '#6c757d' }}>Tiempo</div>
                                                    </div>
                                                </div>
                                                {sim.alturaMax && sim.alturaMax !== '0' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <i className="bi bi-water" style={{ color: '#dc3545', fontSize: 16 }}></i>
                                                        <div>
                                                            <strong style={{ color: '#dc3545', fontSize: 14 }}>{sim.alturaMax}m</strong>
                                                            <div style={{ fontSize: 10, color: '#6c757d' }}>Alt. Máx</div>
                                                        </div>
                                                    </div>
                                                )}
                                                {sim.tiempoMax && sim.tiempoMax !== '0' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <i className="bi bi-clock-fill" style={{ color: '#ff9800', fontSize: 16 }}></i>
                                                        <div>
                                                            <strong style={{ color: '#ff9800', fontSize: 14 }}>{sim.tiempoMax}min</strong>
                                                            <div style={{ fontSize: 10, color: '#6c757d' }}>T. Máx</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {(sim.fecha || sim.magnitud || sim.profundidad) && (
                                                <div style={{
                                                    padding: '8px',
                                                    backgroundColor: '#f8f9fa',
                                                    borderRadius: '6px',
                                                    fontSize: 11,
                                                    color: '#495057'
                                                }}>
                                                    {sim.fecha && (
                                                        <div style={{ marginBottom: '4px' }}>
                                                            <i className="bi bi-calendar-event me-1"></i>
                                                            <strong>Fecha:</strong> {sim.fecha}
                                                        </div>
                                                    )}
                                                    {sim.magnitud && (
                                                        <div style={{ marginBottom: '4px' }}>
                                                            <i className="bi bi-activity me-1"></i>
                                                            <strong>Magnitud:</strong> {sim.magnitud}
                                                        </div>
                                                    )}
                                                    {sim.profundidad && (
                                                        <div>
                                                            <i className="bi bi-arrow-down me-1"></i>
                                                            <strong>Profundidad:</strong> {sim.profundidad} km
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {sim.estado && (
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{
                                                    backgroundColor: getEstadoColor(sim.estado),
                                                    color: '#fff',
                                                    padding: '8px 14px',
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    whiteSpace: 'nowrap',
                                                    textAlign: 'center',
                                                    minWidth: '90px'
                                                }}>
                                                    {sim.estado}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!isCardExpanded && (
                    <div>
                        {firstLocalidad.estado && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                marginBottom: '10px'
                            }}>
                                <span style={{
                                    backgroundColor: getEstadoColor(firstLocalidad.estado),
                                    color: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                }}>
                                    {firstLocalidad.estado}
                                </span>
                            </div>
                        )}

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            fontSize: '12px',
                            color: '#495057',
                            marginBottom: '12px'
                        }}>
                            {firstLocalidad.origen && (
                                <div style={{ textAlign: 'center' }}>
                                    <i className="bi bi-geo-alt" style={{ color: '#17a2b8', display: 'block', fontSize: '16px', marginBottom: '4px' }}></i>
                                    <strong style={{ display: 'block', fontSize: '11px', color: '#495057' }}>{firstLocalidad.origen}</strong>
                                    <span style={{ fontSize: '10px', color: '#6c757d' }}>Origen</span>
                                </div>
                            )}
                            {firstLocalidad.tiempo && firstLocalidad.tiempo !== "0" && (
                                <div style={{ textAlign: 'center' }}>
                                    <i className="bi bi-clock" style={{ color: '#ffc107', display: 'block', fontSize: '16px', marginBottom: '4px' }}></i>
                                    <strong style={{ display: 'block', fontSize: '14px', color: '#ff9800' }}>{firstLocalidad.tiempo}min</strong>
                                    <span style={{ fontSize: '10px', color: '#6c757d' }}>Tiempo</span>
                                </div>
                            )}
                        </div>

                        {firstLocalidad.imagen && (
                            <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                                <img
                                    src={`${API_URL}/img?img=${firstLocalidad.imagen}`}
                                    alt={`Simulación ${firstLocalidad.localidad}`}
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        borderRadius: '8px',
                                        border: '1px solid #dee2e6',
                                        cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(e.target.src, '_blank');
                                    }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}

                        <div style={{
                            marginTop: '10px',
                            fontSize: '11px',
                            color: '#6c757d',
                            textAlign: 'center',
                            fontStyle: 'italic'
                        }}>
                            Clic para ver {escenario.simulaciones.length} localidades
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

FloatingLocalidadesCard.propTypes = {
    escenario: PropTypes.shape({
        old: PropTypes.bool,
        simulaciones: PropTypes.arrayOf(PropTypes.shape({
            localidad: PropTypes.string,
            imagen: PropTypes.string,
            estado: PropTypes.string,
            origen: PropTypes.string,
            tiempo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            altura: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            caso: PropTypes.string,
            alturaMax: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            tiempoMax: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            fecha: PropTypes.string,
            magnitud: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            profundidad: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        }))
    }),
    alturaData: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.array,
        PropTypes.object
    ]),
    getEstadoColor: PropTypes.func.isRequired
};

export default FloatingLocalidadesCard;
