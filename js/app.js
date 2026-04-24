if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('Service Worker registrado'))
    .catch((error) => console.log('Error al registrar SW: ', error));
}

const ZONAS = [
    { nombre: 'Av. Inglaterra y Niños Héroes',          lat:20.6665 , lon:-103.3787 , radio: 300, alturaMax:6.00 },
    { nombre: 'La Martinica, Zapopan',                  lat:20.7452 , lon:-103.3667 , radio: 300, alturaMax:5.00  },
    { nombre: 'Héroes Ferrocarrileros y Washington',    lat:20.6540 , lon:-103.3462 , radio: 300, alturaMax:2.00  },
    { nombre: '8 de Julio y Washington',                lat:20.6593 , lon:-103.3562 , radio: 300, alturaMax:2.00  },
    { nombre: 'Colón y Washington',                     lat:20.6610 , lon:-103.3575 , radio: 300, alturaMax:2.00  },
    { nombre: 'Lázaro Cárdenas y Mariano Otero',        lat:20.6319 , lon:-103.4478 , radio: 300, alturaMax:2.00  },
    { nombre: 'El Deán (Vaso regulador)',               lat:20.6376 , lon:-103.3468 , radio: 300, alturaMax:1.25  },
    { nombre: 'Zona Expo',                              lat:20.6529 , lon:-103.3918 , radio: 300, alturaMax:1.20  },
    { nombre: 'Las Juntitas, Tlaquepaque',              lat:20.6078 , lon:-103.3313 , radio: 300, alturaMax:1.10  },
    { nombre: 'Los Amiales, Tonalá',                    lat:20.6722 , lon:-103.2289 , radio: 300, alturaMax:0.70  },
    { nombre: 'Los Manzanos, Zapotlanejo',              lat:20.6139 , lon:-103.0780 , radio: 300, alturaMax:0.60  },
    { nombre: 'Av. México y López Mateos',              lat:20.6797 , lon:-103.3851 , radio: 300, alturaMax:0.50  }
];

function calcularProbabilidad(precipitacion, alturaMax) {
    const probabilidad = Math.min(1, (precipitacion / 50) * (alturaMax - 0.50) / (6.00 - 0.50));
    return probabilidad;
}

function clasificarRiesgoPorProbabilidad(probabilidad) {
    if (probabilidad >= 0.7)
        return { nivel: 'alto',   color: '#ef4444', mensaje: 'Riesgo alto de inundación' };
    if (probabilidad >= 0.5)
        return { nivel: 'medio',  color: '#f97316', mensaje: 'Riesgo medio de inundación' };
    if (probabilidad >= 0.1)
        return { nivel: 'bajo',   color: '#eab308', mensaje: 'Riesgo bajo de inundación' };
    
    return { nivel: 'ninguno', color: '#22c55e', mensaje: 'Sin riesgo de inundación' };
}

const mapa = L.map('mapa', {
    minZoom: 11,
    maxBounds: [
        [20.4, -103.6],
        [20.9, -103.1]
    ]
}).setView([20.6597, -103.3496], 12);

let latUsuario = null;
let lngUsuario = null;
let markerUsuario = null;

navigator.geolocation.watchPosition(
    function(posicion) {
        latUsuario = posicion.coords.latitude;
        lngUsuario = posicion.coords.longitude;

        if(markerUsuario) {
            markerUsuario.remove();
        }

        if (markerUsuario === null) {
            mapa.setView([latUsuario, lngUsuario], 15);
        }

        const iconoUsuario = L.divIcon({
            html: '📍',
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        markerUsuario = L.marker([latUsuario, lngUsuario], {icon:iconoUsuario})
                        .bindPopup('Tu ubicación')
                        .addTo(mapa);
    },
    function(error) {
        mapa.setView([20.6597, -103.3496], 12);
    }
)

const circulos = {};

function actualizarMapa(zonas) {
    const horaActual = new Date().getHours();

    zonas.forEach(zona => {
        const zonaFrontend = ZONAS.find(z => z.nombre === zona.nombre);
        if (!zonaFrontend) return;
        const probabilidad = calcularProbabilidad(zona.precipitacion, zonaFrontend.alturaMax);
        const riesgo = clasificarRiesgoPorProbabilidad(probabilidad);

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

    const maxProbabilidad = Math.max(...zonas.map(z => {
    const zf = ZONAS.find(zona => zona.nombre === z.nombre);
    return zf ? calcularProbabilidad(z.precipitacion, zf.alturaMax) : 0;
    }));
    const riesgoGeneral = clasificarRiesgoPorProbabilidad(maxProbabilidad);
    document.getElementById('nivel-riesgo').textContent = riesgoGeneral.mensaje;
    document.getElementById('nivel-riesgo').style.color = riesgoGeneral.color;
    document.getElementById('precipitacion').textContent = `Probabilidad máxima: ${(maxProbabilidad * 100).toFixed(1)}%`;
}     

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(mapa);

function conectarSSE() {
    const sse = new EventSource('https://emergence-backend-id2q.onrender.com/sse/zonas');
    sse.onmessage = (event) => {
        const zonas = JSON.parse(event.data);
        if(zonas.length > 0){
            actualizarMapa(zonas);
            actualizarPanel(zonas);
        }
    };
    sse.onerror = () => console.error('Error de conexión SSE');
}

document.getElementById('toggle-zonas').addEventListener('click', () => {
    const lista = document.getElementById('lista-zonas');
    const btn = document.getElementById('toggle-zonas');
    const visible = lista.style.display !== 'none';
    lista.style.display = visible ? 'none' : 'block';
    btn.textContent = visible ? 'ZONAS DE RIESGO ▼': 'ZONAS DE RIESGO ▲';
});

let circuloReporte = null;
document.getElementById('btn-reportar').addEventListener('click',() => {
    if(latUsuario === null) return;
    mapa.setView([latUsuario, lngUsuario], 16)

    circuloReporte = L.circle([latUsuario, lngUsuario], {
        radius: 200,
        color: '#037e93',
        fillColor: '#06b6d4',
        fillOpacity: 0.1,
        weight: 2
}).addTo(mapa)
});

function actualizarPanel(zonas) {
    const contenedor = document.getElementById('lista-zonas');
    contenedor.innerHTML = '';

    zonas.forEach(zona => {
        const zonaFrontend = ZONAS.find(z => z.nombre === zona.nombre);
        if (!zonaFrontend) return;

        const probabilidad = calcularProbabilidad(zona.precipitacion, zonaFrontend.alturaMax);
        const riesgo = clasificarRiesgoPorProbabilidad(probabilidad);

        const tarjeta = document.createElement('div');
        tarjeta.className = `tarjeta-zona riesgo-${riesgo.nivel}`;
        tarjeta.innerHTML = `
            <h4>${zona.nombre}</h4>
            <span class="etiqueta-riesgo" style="color:${riesgo.color}">${riesgo.mensaje.toUpperCase()}</span>
            <p>${(probabilidad * 100).toFixed(1)}% de probabilidad</p>
        `;
        tarjeta.addEventListener('click', () => {
            mapa.setView([zonaFrontend.lat, zonaFrontend.lon], 15);
        });
        contenedor.appendChild(tarjeta);
    });
}

conectarSSE();
import('./firebase-init.js')
    .then(({ solicitarPermisoNotificaciones }) => {
        solicitarPermisoNotificaciones().then((token) => {
            if(token) console.log('FCM listo. Token:', token);
        });
    })
    .catch(e => console.warn('Firebase no disponible:', e));
