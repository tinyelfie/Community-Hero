from fastapi import APIRouter, UploadFile, File
import os
import shutil
import uuid
from services.ai_service import analyze_issue_image
from config import UPLOAD_DIR

router = APIRouter()

@router.post("/preview")
async def ai_preview(image: UploadFile = File(...)):
    """
    Receive an image, save temporarily, run AI analysis, return results, delete temp image.
    """
    temp_filename = f"temp_{uuid.uuid4()}_{image.filename}"
    temp_path = os.path.join(UPLOAD_DIR, temp_filename)
    
    try:
        # Save temp file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
            
        # Analyze
        ai_result = analyze_issue_image(temp_path)
        
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        # Ensure success flag
        ai_result["success"] = True
        return ai_result
        
    except Exception as e:
        print(f"[AI Preview Error] {e}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return {
            "category": "other",
            "severity": "low",
            "summary": "Unable to analyze image",
            "tags": [],
            "success": False
        }
