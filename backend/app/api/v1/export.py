import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.task import Task
from app.config import get_settings
from langchain_openai import ChatOpenAI

router = APIRouter(tags=["export"])

LATEX_SYSTEM_PROMPT = """将以下竞品情报报告（Markdown格式）转换为标准的中文学术LaTeX论文格式。
要求：
1. 使用 \\documentclass[12pt,a4paper]{article} 和 \\usepackage[UTF8]{ctex}
2. 保留所有章节结构，转换为 \\section 和 \\subsection
3. 将列表转为 itemize/enumerate
4. 保留强调（\\textbf）
5. 添加完整的前言（\\title, \\author, \\date, \\maketitle, \\tableofcontents）
6. 添加适当的 \\newpage 分页
7. 文档最后加 \\end{document}
只输出纯LaTeX代码，不要任何解释。"""

LATEX_PREAMBLE_TEMPLATE = r"""\documentclass[12pt,a4paper]{article}
\usepackage[UTF8]{ctex}
\usepackage{geometry}
\usepackage{hyperref}
\usepackage{booktabs}
\usepackage{graphicx}
\usepackage{amsmath}

\geometry{left=2.5cm,right=2.5cm,top=2.5cm,bottom=2.5cm}

\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    urlcolor=blue
}

\title{%s · 竞品情报简报}
\author{ZorePeer 智能分析系统}
\date{\today}

\begin{document}
\maketitle
\tableofcontents
\newpage
"""


@router.get("/tasks/{task_id}/export/latex")
async def export_latex(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not task.report_content:
        raise HTTPException(status_code=422, detail="Report not yet generated")

    settings = get_settings()

    llm = ChatOpenAI(
        model="deepseek-chat",
        base_url=settings.deepseek_base_url,
        api_key=settings.deepseek_api_key,
        temperature=0.1,
    )

    messages = [
        {"role": "system", "content": LATEX_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"竞品名称：{task.competitor_name}\n\n以下是Markdown格式的报告：\n\n{task.report_content}",
        },
    ]

    try:
        ai_response = await llm.ainvoke(messages)
        latex_body = ai_response.content

        # If AI returned a full document, use it directly; otherwise wrap in preamble
        if r"\documentclass" in latex_body:
            latex_content = latex_body
        else:
            preamble = LATEX_PREAMBLE_TEMPLATE % task.competitor_name
            latex_content = preamble + "\n" + latex_body
            if r"\end{document}" not in latex_content:
                latex_content += "\n\\end{document}\n"

    except Exception as e:
        # Fallback: generate minimal LaTeX from the markdown without LLM
        preamble = LATEX_PREAMBLE_TEMPLATE % task.competitor_name
        escaped = task.report_content.replace("&", r"\&").replace("%", r"\%").replace("$", r"\$")
        latex_content = preamble + "\n" + escaped + "\n\\end{document}\n"

    safe_name = task.competitor_name.replace(" ", "_")
    filename = f"report_{safe_name}_{task_id}.tex"

    return Response(
        content=latex_content.encode("utf-8"),
        media_type="application/x-latex",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
