from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from db import models
from db.database import get_db
import schemas
from .auth import get_current_admin_user
from .notifications import emit

router = APIRouter()

@router.get("/", response_model=List[schemas.App])
def get_apps(db: Session = Depends(get_db)):
    return db.query(models.Application).all()

@router.post("/", response_model=schemas.App)
def create_app(app: schemas.AppCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_admin_user)):
    db_app = models.Application(**app.dict())
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    emit(db, f"Application “{db_app.name}” added by {current_user.email}", "success")
    return db_app

@router.put("/{app_id}", response_model=schemas.App)
def update_app(app_id: int, app_update: schemas.AppUpdate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_admin_user)):
    db_app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    update_data = app_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_app, key, value)
    
    db.commit()
    db.refresh(db_app)
    emit(db, f"Application “{db_app.name}” updated by {current_user.email}", "info")
    return db_app

@router.delete("/{app_id}")
def delete_app(app_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_admin_user)):
    db_app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    name = db_app.name
    db.delete(db_app)
    db.commit()
    emit(db, f"Application “{name}” deleted by {current_user.email}", "warning")
    return {"message": "Application deleted"}
