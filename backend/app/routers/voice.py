from fastapi import APIRouter, UploadFile, File, HTTPException
import whisper
import tempfile

router = APIRouter()

# Carrega o modelo Whisper (pode ser 'base', 'small', 'medium', 'large' conforme hardware)
model = whisper.load_model("base")

@router.post("/transcribe-audio/")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        # Salva o arquivo temporariamente
        with tempfile.NamedTemporaryFile(delete=True, suffix=".wav") as tmp:
            tmp.write(await file.read())
            tmp.flush()
            # Transcreve o áudio
            result = model.transcribe(tmp.name, language="pt")
            return {"text": result["text"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
