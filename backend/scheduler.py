import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from database import SessionLocal, ZonaRiesgo
from datetime import datetime

ZONAS = [
    {"nombre": "Centro GDL / Analco",  "lat": 20.6597, "lon": -103.3496},
    {"nombre": "Puerta de Hierro",     "lat": 20.7150, "lon": -103.4100},
    {"nombre": "Zapopan Centro",       "lat": 20.7214, "lon": -103.3916},
    {"nombre": "Tlaquepaque Centro",   "lat": 20.6419, "lon": -103.3108},
    {"nombre": "Las Águilas / ITESO",  "lat": 20.5983, "lon": -103.4200},
    {"nombre": "Huentitán / Barranca", "lat": 20.7100, "lon": -103.3200},
]

def calcular_nivel(precipitacion):
    if precipitacion == 0:
        return "bajo"
    elif precipitacion < 5:
        return "medio"
    else:
        return "alto"
    
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
                nivel = calcular_nivel(precipitacion)

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