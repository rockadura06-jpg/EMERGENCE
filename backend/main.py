from database import init_db, SessionLocal, ZonaRiesgo, limpiar_db
from scheduler import scheduler, consultar_open_meteo
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json

app = FastAPI(title="EMERGENCE Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "EMERGENCE corriendo"}

@app.on_event("startup")
async def startup():
    init_db()
    limpiar_db()
    scheduler.start()
    await consultar_open_meteo()

@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()

@app.get("/sse/zonas")
async def sse_zonas():
    async def event_stream():
        db = SessionLocal()
        try:
            while True:
                zonas = db.query(ZonaRiesgo).order_by(
                    ZonaRiesgo.timestamp.desc()
                ).limit(12).all()

                data = [
                    {
                        "nombre": z.nombre,
                        "nivel_riesgo": z.nivel_riesgo,
                        "precipitacion": z.precipitacion
                    }
                    for z in zonas
                ]
                yield f"data: {json.dumps(data)}\n\n"
                await asyncio.sleep(60)
        finally:
            db.close()
    
    return StreamingResponse(event_stream(), media_type="text/event-stream")
