"""Small shim to expose the FastAPI `app` from the package entry point.

This keeps backwards compatibility with running `python main.py` or
`uvicorn main:app` while the real implementation lives in
`app.main`.
"""

from app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)