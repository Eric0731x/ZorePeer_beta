import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import router
from app.config import get_settings

settings = get_settings()

# Configure LangSmith tracing
os.environ.setdefault("LANGCHAIN_TRACING_V2", str(settings.langchain_tracing_v2).lower())
os.environ.setdefault("LANGCHAIN_API_KEY", settings.langsmith_api_key)
os.environ.setdefault("LANGCHAIN_PROJECT", settings.langsmith_project)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="ZorePeer Competitive Intelligence API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok"}
