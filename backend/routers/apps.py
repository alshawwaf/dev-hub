from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..db import models
from ..db.database import get_db
from .. import schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.App])
def get_apps(db: Session = Depends(get_db)):
    return db.query(models.Application).all()

@router.post("/", response_model=schemas.App)
def create_app(app: schemas.AppCreate, db: Session = Depends(get_db)):
    db_app = models.Application(**app.dict())
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app

@router.put("/{app_id}", response_model=schemas.App)
def update_app(app_id: int, app_update: schemas.AppUpdate, db: Session = Depends(get_db)):
    db_app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    update_data = app_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_app, key, value)
    
    db.commit()
    db.refresh(db_app)
    return db_app

@router.delete("/{app_id}")
def delete_app(app_id: int, db: Session = Depends(get_db)):
    db_app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    db.delete(db_app)
    db.commit()
    return {"message": "Application deleted"}
