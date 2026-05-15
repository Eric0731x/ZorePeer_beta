from fastapi import APIRouter
from app.api.v1 import workspaces, tasks, notifications, export

router = APIRouter(prefix="/api/v1")
router.include_router(workspaces.router)
router.include_router(tasks.router)
router.include_router(notifications.router)
router.include_router(export.router)
