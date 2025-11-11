from fastapi import FastAPI, Request
import os

app = FastAPI()

@app.get("/api")
def ping():
    return {
        "ok": True,
        "has_openai": bool(os.getenv("OPENAI_API_KEY")),
        "has_news": bool(os.getenv("NEWS_API_KEY")),
        "has_telegram": bool(os.getenv("TELEGRAM_TOKEN")),
        "chat_id_set": bool(os.getenv("CHAT_ID")),
    }

@app.post("/api")
async def main(req: Request):
    data = await req.json()
    return {"received": data}
