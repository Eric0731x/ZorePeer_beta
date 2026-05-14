import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.task import TaskStatus


class TaskCreate(BaseModel):
    competitor_name: str
    focus_areas: list[str] | None = None


class TaskRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    competitor_name: str
    focus_areas: list[str] | None
    status: TaskStatus
    report_content: str | None
    error_reason: str | None
    langsmith_trace_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskStatusRead(BaseModel):
    task_id: uuid.UUID
    status: TaskStatus
    error_reason: str | None
    langsmith_trace_id: str | None

    model_config = {"from_attributes": True}
