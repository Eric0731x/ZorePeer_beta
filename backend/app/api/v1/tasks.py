import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.workspace import Workspace
from app.models.task import Task, TaskStatus
from app.schemas.task import TaskCreate, TaskRead, TaskStatusRead
from app.agents.graph import run_research_graph

router = APIRouter(tags=["tasks"])


@router.post("/workspaces/{workspace_id}/tasks", response_model=TaskRead, status_code=201)
async def create_task(
    workspace_id: uuid.UUID,
    payload: TaskCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    task = Task(
        workspace_id=workspace_id,
        competitor_name=payload.competitor_name,
        focus_areas=json.dumps(payload.focus_areas or []),
        status=TaskStatus.PENDING,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    background_tasks.add_task(run_research_graph, str(task.id))
    return task


@router.get("/tasks/{task_id}/status", response_model=TaskStatusRead)
async def get_task_status(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskStatusRead(
        task_id=task.id,
        status=task.status,
        error_reason=task.error_reason,
        langsmith_trace_id=task.langsmith_trace_id,
    )


@router.get("/workspaces/{workspace_id}/tasks", response_model=list[TaskRead])
async def list_workspace_tasks(workspace_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    result = await db.execute(
        select(Task).where(Task.workspace_id == workspace_id).order_by(Task.created_at.desc())
    )
    return result.scalars().all()


@router.get("/tasks/{task_id}", response_model=TaskRead)
async def get_task(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
