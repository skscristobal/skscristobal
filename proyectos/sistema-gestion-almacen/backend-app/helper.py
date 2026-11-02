from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session
def column_exists(db: Session, table: str, column: str) -> bool:
    # -Consulta de metadatos propia de SQLite que lista columnas de una tabla-
    cols = db.execute(sql_text(f"PRAGMA table_info('{table}')")).fetchall()
    return any(c[1] == column for c in cols)