from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./emergence.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ZonaRiesgo(Base):
    __tablename__="zonas_riesgo"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    nivel_riesgo = Column(String)
    precipitacion = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Reporte(Base):
    __tablename__="Reportes"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    nivel = Column(String)
    descripcion = Column(String)
    foto = Column(String, nullable=True)
    lat = Column(Float)
    lng = Column(Float)
    direccion = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)



def init_db():
    Base.metadata.create_all(bind=engine)

def limpiar_db():
    db = SessionLocal()
    try:
        db.query(ZonaRiesgo).delete()
        db.commit()
    finally:
        db.close()