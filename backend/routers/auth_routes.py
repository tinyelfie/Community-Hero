from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth

router = APIRouter()


@router.post("/register", response_model=schemas.TokenResponse, status_code=201)
def register(body: schemas.UserRegister, db: Session = Depends(get_db)):
    """Register a new citizen account."""
    existing = db.query(models.User).filter(models.User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        name=body.name,
        email=body.email,
        password_hash=auth.hash_password(body.password),
        role=models.UserRole.citizen,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token(str(user.id), user.role.value)
    return schemas.TokenResponse(
        access_token=token,
        user=schemas.UserOut.model_validate(user)
    )


@router.post("/login", response_model=schemas.TokenResponse)
def login(body: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login and receive a JWT access token."""
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not auth.verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth.create_access_token(str(user.id), user.role.value)
    return schemas.TokenResponse(
        access_token=token,
        user=schemas.UserOut.model_validate(user)
    )


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    """Return the currently authenticated user's info."""
    return schemas.UserOut.model_validate(current_user)
