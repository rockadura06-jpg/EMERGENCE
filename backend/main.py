from database import init_db, SessionLocal, ZonaRiesgo, Reporte, Voto, limpiar_db
from scheduler import scheduler, consultar_open_meteo
from fastapi import FastAPI, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Optional
import asyncio
import json
import cloudinary
import cloudinary.uploader
import os

cloudinary.config(
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key = os.environ.get("CLOUDINARY_API_KEY"),
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")
)

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
            resultado = cloudinary.uploader.upload(
                contenido,
                folder="emergence"
            )
            ruta_foto = resultado["secure_url"]

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
                "timestamp": str(r.timestamp),
                "likes": r.likes,
                "dislikes": r.dislikes
            }
            for r in reportes
        ]
    finally:
        db.close()

@app.post("/reportes/{reporte_id}/votar")
async def votar_reporte(
    reporte_id: int,
    user_id: str = Form(...),
    tipo: str = Form(...)
):
    db = SessionLocal()
    try:
        voto_existente = db.query(Voto).filter(
            Voto.reporte_id == reporte_id,
            Voto.user_id == user_id
        ).first()

        if voto_existente:
            return{"message": "Ya votaste en ete reporte"}
        
        nuevo_voto = Voto(reporte_id=reporte_id, user_id=user_id, tipo=tipo)
        db.add(nuevo_voto)

        reporte = db.query(Reporte).filter(Reporte.id == reporte_id).first()
        if tipo == "like":
            reporte.likes += 1
        elif tipo == "dislike":
            reporte.dislikes+= 1

        db.commit()
        return {"message": "Voto registrado"}
    finally:
        db.close()