# =============================================================================
# FastAPI Backend — Entry Point
# =============================================================================
# This is the main file that starts the backend API server.
# FastAPI is a Python web framework for building APIs (like Express for Node.js).
# When you run "uvicorn main:app --reload", it loads this file and starts
# listening for HTTP requests (GET, POST, PUT, DELETE) from the frontend.
# =============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create the FastAPI application instance.
# Think of this as the "app" object that everything else attaches to.
# "title" is just a label shown in the auto-generated API docs at /docs.
app = FastAPI(title="Nebo Flow API")

# =============================================================================
# CORS (Cross-Origin Resource Sharing) Configuration
# =============================================================================
# By default, browsers BLOCK requests between different origins (domains/ports).
# Our frontend runs on http://localhost:3000 and our backend on http://localhost:8000.
# Without CORS, the browser would reject every API call from the frontend.
#
# This middleware tells the browser: "It's okay, allow requests from localhost:3000."
#
# - allow_origins: which frontend URLs can make requests to this API
# - allow_credentials: allow cookies and auth headers to be sent
# - allow_methods: ["*"] means allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
# - allow_headers: ["*"] means allow all headers (including Authorization for JWT)
# =============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# API Endpoints (Routes)
# =============================================================================
# "@app.get(...)" is a DECORATOR — a Python feature that modifies the function
# below it. Here, it registers the function as a route handler with FastAPI.
#
# How it works:
#   @app.get("/health")      ← "When someone sends a GET request to /health..."
#   def health_check():      ← "...run this function..."
#       return {"status": "healthy"}  ← "...and send this back as JSON."
#
# The browser/frontend sees: {"status": "healthy"}
#
# Other HTTP methods work the same way:
#   @app.post("/items")   — for creating data (e.g., create a new invoice)
#   @app.put("/items/1")  — for updating data (e.g., edit an invoice)
#   @app.delete("/items/1") — for deleting data
# =============================================================================

@app.get("/")
def read_root():
    """Root endpoint — confirms the API is running."""
    return {"message": "Nebo Flow API is running"}

@app.get("/health")
def health_check():
    """Health check endpoint — used to verify the server is up and responding."""
    return {"status": "healthy"}

@app.get("/test")
def test_endpoint():
    """Temporary test endpoint — used to verify frontend-to-backend connection."""
    return {"data": "This is a test from FastAPI!"}
