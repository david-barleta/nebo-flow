from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Nebo Flow API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # ← Must match frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Nebo Flow API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/test")  # ← ADD THIS ENDPOINT
def test_endpoint():
    return {"data": "This is a test from FastAPI!"}