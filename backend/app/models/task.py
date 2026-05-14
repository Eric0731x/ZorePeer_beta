import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Enum as SAEnum
from app.database import Base


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    PLANNING = "PLANNING"
    COLLECTING = "COLLECTING"
    ANALYZING = "ANALYZING"
    QA_REVIEW = "QA_REVIEW"
    WRITING = "WRITING"
    MEMORY_SYNC = "MEMORY_SYNC"
    COMPLETED = "COMPLETED"
    COMPLETED_NO_UPDATE = "COMPLETED_NO_UPDATE"
    FAILED = "FAILED"
    FAILED_COLLECTION = "FAILED_COLLECTION"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    competitor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    focus_areas: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON-serialised list
    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(TaskStatus, name="taskstatus"), default=TaskStatus.PENDING, nullable=False
    )
    report_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    langsmith_trace_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="tasks")
