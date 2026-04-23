from fastapi import APIRouter

router = APIRouter()

@router.get("/ping", tags=["ping"])
def ping():
    return {"message": "pong"}
