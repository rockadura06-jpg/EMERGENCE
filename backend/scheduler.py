import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from database import SessionLocal, ZonaRiesgo
from datetime import datetime

ZONAS = [
    { "nombre": "Av. Inglaterra y Niños Héroes",       "lat":20.6665 , "lon":-103.3787},
    { "nombre": "La Martinica, Zapopan",                "lat":20.7452 , "lon":-103.3667 },
    { "nombre": "Héroes Ferrocarrileros y Washington",  "lat":20.6540 , "lon":-103.3462 },
    { "nombre": "8 de Julio y Washington",              "lat":20.6593 , "lon":-103.3562 },
    { "nombre": "Colón y Washington",                   "lat":20.6610 , "lon":-103.3575 },
    { "nombre": "Lázaro Cárdenas y Mariano Otero",     "lat":20.6319 , "lon":-103.4478 },
    { "nombre": "El Deán (Vaso regulador)",             "lat":20.6376 , "lon":-103.3468 },
    { "nombre": "Zona Expo",                            "lat":20.6529 , "lon":-103.3918 },
    { "nombre": "Las Juntitas, Tlaquepaque",            "lat":20.6078 , "lon":-103.3313 },
    { "nombre": "Los Amiales, Tonalá",                  "lat":20.6722 , "lon":-103.2289 },
    { "nombre": "Los Manzanos, Zapotlanejo",            "lat":20.6139 , "lon":-103.0780 },
    { "nombre": "Av. México y López Mateos",          "lat":20.6797 , "lon":-103.3851 }
]

async def consultar_open_meteo():
    db = SessionLocal()
    try:
        async with httpx.AsyncClient() as client:
            for zona in ZONAS:
                url = (
                    f"https://api.open-meteo.com/v1/forecast"
                    f"?latitude={zona['lat']}&longitude={zona['lon']}"
                    f"&hourly=precipitation&forecast_days=1"
                )
                response = await client.get(url)
                data = response.json()
                precipitacion = data["hourly"]["precipitation"][0]
                nivel = "sin_calcular"

                registro = ZonaRiesgo(
                    nombre = zona["nombre"],
                    nivel_riesgo = nivel,
                    precipitacion = precipitacion,
                    timestamp = datetime.utcnow()
                )
                db.add(registro)
            db.commit()
            print(f"Zonas actualizadas: {datetime.utcnow()}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

scheduler = AsyncIOScheduler()
scheduler.add_job(consultar_open_meteo, "interval", minutes=30)