"""initial schema: workspaces, tasks, notifications

Revision ID: 0001
Revises:
Create Date: 2026-05-14 00:00:00.000000

"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── workspaces ─────────────────────────────────────────────────────────────
    op.create_table(
        "workspaces",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── taskstatus enum ────────────────────────────────────────────────────────
    taskstatus = postgresql.ENUM(
        "PENDING", "PLANNING", "COLLECTING", "ANALYZING",
        "QA_REVIEW", "WRITING", "MEMORY_SYNC",
        "COMPLETED", "COMPLETED_NO_UPDATE", "FAILED", "FAILED_COLLECTION",
        name="taskstatus",
    )
    taskstatus.create(op.get_bind())

    # ── tasks ──────────────────────────────────────────────────────────────────
    op.create_table(
        "tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("competitor_name", sa.String(255), nullable=False),
        sa.Column("focus_areas", sa.Text(), nullable=True),
        sa.Column("status", sa.Enum(
            "PENDING", "PLANNING", "COLLECTING", "ANALYZING",
            "QA_REVIEW", "WRITING", "MEMORY_SYNC",
            "COMPLETED", "COMPLETED_NO_UPDATE", "FAILED", "FAILED_COLLECTION",
            name="taskstatus", create_type=False,
        ), nullable=False, server_default="PENDING"),
        sa.Column("report_content", sa.Text(), nullable=True),
        sa.Column("error_reason", sa.String(1000), nullable=True),
        sa.Column("langsmith_trace_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tasks_workspace_id", "tasks", ["workspace_id"])
    op.create_index("ix_tasks_status", "tasks", ["status"])

    # ── notifications ──────────────────────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_workspace_id", "notifications", ["workspace_id"])
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("tasks")
    op.drop_table("workspaces")
    op.execute("DROP TYPE IF EXISTS taskstatus")
