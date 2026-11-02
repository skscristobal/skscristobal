from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# URL de conexión a SQLite (archivo local 'mercado.db' en el mismo directorio)
# DATABASE_URL = "sqlite:///./mercado.db"

import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'mercado.db')}"

# Se crea el engine de SQLAlchemy.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Factoría de sesiones: sin autocommit y sin autoflush para tener control explícito.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base para modelos declarativos (ORM).
Base = declarative_base()

# Dependencia para obtener sesión en cada request
def get_db():
    db = SessionLocal()
    try:
        yield db  #La sesión queda disponible dentro del endpoint
    finally:
        db.close() #Cierre garantizado aunque haya excepciones
