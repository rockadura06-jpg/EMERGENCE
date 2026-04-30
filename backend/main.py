from database import init_db, SessionLocal, ZonaRiesgo, Reporte, limpiar_db
from scheduler import scheduler, consultar_open_meteo
from fastapi import FastAPI, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Optional
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

@app.post("/reportes")
async def crear_reporte(
    nombre: str = Form(...),
    nivel: str = Form(...),
    descripcion: str = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    direccion: Optional[str] = Form(None),
    foto: Optional[UploadFile] = File(None)
):
    db = SessionLocal()
    try:
        ruta_foto = None
        if foto:
            contenido = await foto.read()
            ruta_foto = f"uploads/{foto.filename}"
            with open(ruta_foto, "wb") as f:
                f.write(contenido)

        reporte = Reporte(
            nombre = nombre,
            nivel = nivel,
            descripcion = descripcion,
            lat = lat,
            lng = lng,
            direccion = direccion,
            foto = ruta_foto
        )
        db.add(reporte)
        db.commit()
        return {"message": "Reporte guardado"}
    finally:
        db.close()

@app.get("/reportes")
def obtener_reportes():
    db = SessionLocal()
    try:
        reportes = db.query(Reporte).all()
        return [
            {
                "id": r.id,
                "nombre": r.nombre,
                "nivel": r.nivel,
                "descripcion": r.descripcion,
                "lat": r.lat,
                "lng": r.lng,
                "direccion": r.direccion,
                "foto": r.foto,
                "timestamp": str(r.timestamp)
            }
            for r in reportes
        ]
    finally:
        db.close()