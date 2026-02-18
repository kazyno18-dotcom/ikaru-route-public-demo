from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine
from app.routers import auth, staff, clients, routes, visits, revenue, reports

# テーブル作成
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="IkaruRoute API",
    description="訪問介護ルート最適化システム IkaruRoute バックエンドAPI",
    version="1.0.0-MVP",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS設定
origins = settings.cors_origins.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(auth.router)
app.include_router(staff.router)
app.include_router(clients.router)
app.include_router(routes.router)
app.include_router(visits.router)
app.include_router(revenue.router)
app.include_router(reports.router)


@app.get("/")
def root():
    return {"message": "IkaruRoute API v1.0 - 訪問介護ルート最適化システム", "status": "running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
