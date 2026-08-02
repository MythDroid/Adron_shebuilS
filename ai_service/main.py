import uvicorn
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import random

app = FastAPI(title="Adorn AI Microservice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Adorn AI service running"}

@app.post("/analyze-outfit")
async def analyze_outfit(
    file: UploadFile = File(...),
    userId: Optional[str] = Form(None)
):
    # Simulated pretrained CNN embedding / dominant color extractor
    # In a real environment, we'd load ResNet model and run feature extraction.
    # To keep it lightweight and fast, we simulate the color and style extraction.
    outfit_styles = ["casual", "minimalist", "elegant", "royal", "vintage"]
    colors = ["emerald-green", "royal-blue", "crimson-red", "classic-black", "pearl-white", "pastel-pink"]
    
    selected_color = random.choice(colors)
    selected_style = random.choice(outfit_styles)
    
    # Matching metal pairing logic
    recommended_metals = []
    if selected_color in ["emerald-green", "pearl-white"]:
        recommended_metals = ["platinum", "silver", "gold"]
    elif selected_color in ["royal-blue", "classic-black"]:
        recommended_metals = ["platinum", "silver"]
    else:
        recommended_metals = ["gold", "rose-gold"]

    # Recommended stone pairings
    recommended_stones = []
    if selected_color == "emerald-green":
        recommended_stones = ["emerald", "diamond"]
    elif selected_color == "royal-blue":
        recommended_stones = ["sapphire", "diamond"]
    elif selected_color == "crimson-red":
        recommended_stones = ["ruby", "diamond"]
    else:
        recommended_stones = ["diamond", "pearl"]

    return {
        "fileName": file.filename,
        "dominantColor": selected_color,
        "extractedStyle": selected_style,
        "recommendedMetals": recommended_metals,
        "recommendedStones": recommended_stones,
        "confidence": 0.94
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
