# Learnova AI

Learnova AI is a Flask-based learning platform that combines AI tutoring, practice workflows, resource sharing, and student progress tools in one web application.

## Why This Project Exists

Students often use multiple disconnected tools for notes, interview prep, resume feedback, and learning resources. Learnova AI brings these into one workflow so users can:

- ask contextual AI questions with guardrails,
- generate and manage learning assets,
- track progress and habits,
- and prepare for placements through practical modules.

## Current Capabilities

- Authentication and account recovery
  - register, login, logout,
  - forgot/reset password with email token flow.
- AI chat with knowledge support
  - response generation with guardrails,
  - retrieval from local knowledge-base files,
  - chat history retrieval and deletion APIs.
- Instant Note Maker
  - generate structured notes,
  - export notes to PDF,
  - send generated notes into the resources pipeline.
- Resources hub
  - upload, preview, filter, and download resources,
  - user-owned resource management,
  - comments and AI-assisted refinement.
- Admin moderation
  - pending/live resource review,
  - approve/reject/edit/delete actions,
  - moderation comments and uploader notifications.
- YouTube Mindmap
  - transcript extraction,
  - AI-generated Mermaid mindmaps.
- Resume Analyzer
  - resume upload and parsing,
  - AI analysis and feedback workflow.
- Progress and engagement
  - habits tracking,
  - leaderboard,
  - mock tests,
  - onboarding and dashboard modules.

## Technology Stack

- Backend: Python, Flask
- Database: SQLite
- Frontend: Jinja2 templates, vanilla JavaScript, CSS
- AI and integrations: OpenAI, optional Gemini, optional Apify
- Document tooling: PyPDF2, python-docx, reportlab

## Project Structure

```text
LearnovaAI/
|- run.py
|- requirements.txt
|- .env
|- app/
|  |- __init__.py
|  |- db.py
|  |- routes.py
|  |- rag_pipeline.py
|  |- kb_manager.py
|  |- static/
|  |  |- css/
|  |  |- js/
|  |- templates/
|- Knowledge base/
|- data/
|  |- resources/
|  |- resumes/
|- scripts/
```

## Local Setup

### 1. Prerequisites

- Python 3.9 or newer
- SMTP credentials for password reset emails
- API keys for enabled AI providers

### 2. Install Dependencies

```bash
git clone <your-repo-url>
cd LearnovaAI
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure Environment

Create a root .env file with values similar to:

```env
SECRET_KEY=replace-with-a-secure-random-value

OPEN_API_KEY=your-openai-key
LLM_PROVIDER=groq
GROQ_API_KEY=your-groq-key
GROQ_MODEL=llama-3.3-70b-versatile

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=true

APIFY_API_TOKEN=optional-apify-token
APIFY_YOUTUBE_ACTOR_ID=pintostudio~youtube-transcript

GEMINI_API_KEY=optional-gemini-key
GEMINI_MODEL=gemini-2.0-flash
```

Security note: keep secrets in environment variables only. Do not commit real keys.

## Run the Application

```bash
source .venv/bin/activate
python3 run.py
```

If port 5000 is already occupied, the project may run on 5001 depending on your current run configuration.

## Key Route Groups

- UI pages: landing, auth, onboarding, dashboard, progress, mock tests, resume, notes, resources, YouTube mindmap, admin
- Chat APIs: message generation, history fetch/delete
- Notes APIs: generate, PDF export, upload to resources
- Resource APIs: user and admin workflows
- Resume APIs: upload, analyze, retrieve.
- Progress APIs: habits, logs, leaderboard, mock tests.
- Knowledge-base APIs: add/search/status endpoints.

## Operational Notes

- RAG/knowledge content is loaded during startup.
- If knowledge JSON files change, restart the app to refresh runtime context.
- Database migration helper is available in scripts/migrate_sqlite_to_postgres.py.

## Maintainer Checklist

- Keep .env out of version control.
- Test auth, chat, resources, and resume flows after major route changes.
- Validate moderation and notifications after admin updates.
- Re-test landing page animation after frontend script changes.
