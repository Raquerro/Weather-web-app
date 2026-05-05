from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pathlib

app = FastAPI()

@app.get("/api/")
def read_root():
    return {"Hello": "World"}

@app.get("/api/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}

# Serve React build when present
build_dir = pathlib.Path(__file__).resolve().parent.parent / "frontend" / "build"
if build_dir.exists():
    app.mount("/static", StaticFiles(directory=build_dir / "static"), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(build_dir / "index.html")
