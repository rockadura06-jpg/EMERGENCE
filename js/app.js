if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('Service Worker registrado'))
    .catch((error) => console.log('Error al registrar SW: ', error));
}

const ZONAS = [
    { nombre: 'Centro GDL / Analco',     lat: 20.6597, lon: -103.3496, radio: 1200 },
    { nombre: 'Puerta de Hierro',         lat: 20.7150, lon: -103.4100, radio: 1000 },
    { nombre: 'Zapopan Centro',           lat: 20.7214, lon: -103.3916, radio: 1000 },
    { nombre: 'Tlaquepaque Centro',       lat: 20.6419, lon: -103.3108, radio: 1000 },
    { nombre: 'Las Águilas / ITESO',      lat: 20.5983, lon: -103.4200, radio: 1000 },
    { nombre: 'Huentitán / Barranca',     lat: 20.7100, lon: -103.3200, radio: 1000 },
];

function calcularNivelRiesgo(precipitacion) {
    if (precipitacion >= 30)
        return { nivel: 'alto',   color: '#ef4444', mensaje: 'Riesgo alto de inundación' };
    if (precipitacion >= 10)
        return { nivel: 'medio',  color: '#f97316', mensaje: 'Riesgo medio de inundación' };
    if (precipitacion >= 2)
        return { nivel: 'bajo',   color: '#eab308', mensaje: 'Riesgo bajo de inundación' };
    return     { nivel: 'ninguno',color: '#22c55e', mensaje: 'Sin riesgo de inundación' };
}

const mapa = L.map('mapa').setView([20.6597, -103.3496], 12);

const circulos = {};

function actualizarMapa(zonas) {
    const horaActual = new Date().getHours();

    zonas.forEach(zona => {
        const riesgo = calcularNivelRiesgo(zona.precipitacion);
        const zonaFrontend = ZONAS.find(z => z.nombre === zona.nombre);
        if (!zonaFrontend) return;

        if(circulos[zona.nombre]) {
            circulos[zona.nombre].setStyle({color: riesgo.color, fillColor: riesgo.color});
            circulos[zona.nombre].setPopupContent(
                `<b>${zona.nombre}</b><br>${riesgo.mensaje}<br>Lluvia: ${zona.precipitacion} mm`
            );
        } else {
            circulos[zona.nombre] = L.circle([zonaFrontend.lat, zonaFrontend.lon], {
                radius: zonaFrontend.radio,
                color: riesgo.color,
                fillColor: riesgo.color,
                fillOpacity: 0.4,
                weight: 2
            })
            .bindPopup(`<b>${zona.nombre}</b><br>${riesgo.mensaje}<br>Lluvia: ${zona.precipitacion} mm`)
            .addTo(mapa);
        }
    });

    const maxPrecip = Math.max(...zonas.map(z => z.precipitacion));
    const riesgoGeneral = calcularNivelRiesgo(maxPrecip);
    document.getElementById('nivel-riesgo').textContent = riesgoGeneral.mensaje;
    document.getElementById('nivel-riesgo').style.color = riesgoGeneral.color;
    document.getElementById('precipitacion').textContent = `Lluvia máxima: ${maxPrecip} mm`;
}       

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(mapa);

function conectarSSE() {
    const sse = new EventSource('https://emergence-backend-id2q.onrender.com/sse/zonas');
    sse.onmessage = (event) => {
        const zonas = JSON.parse(event.data);
        if(zonas.length > 0) actualizarMapa(zonas);
    };
    sse.onerror = () => console.error('Error de conexión SSE');
}

conectarSSE();
import('./firebase-init.js')
    .then(({ solicitarPermisoNotificaciones }) => {
        solicitarPermisoNotificaciones().then((token) => {
            if(token) console.log('FCM listo. Token:', token);
        });
    })
    .catch(e => console.warn('Firebase no disponible:', e));