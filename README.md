# RepoGuide AI

RepoGuide AI is a hackathon-stage, locally-run AI tool that helps beginners understand an open-source repository and find their first contribution.

A user pastes a project's README/documentation into a web form, and a local AI model (running via Ollama) returns a plain-language project overview, detected technologies, setup instructions, three beginner-friendly contribution ideas, and questions to ask maintainers. The user can then pick one contribution and receive a step-by-step contribution guide (prerequisites, steps, verification steps, suggested PR title/description).

The backend can also accept a repository `.zip` file, extract it safely, and serve its file tree and individual file contents. **Note:** the repository-upload feature is implemented on the backend only; there is no frontend UI to reach it in the current release.

## Product positioning

RepoGuide AI is positioned as a "friendly open-source mentor" for beginners rather than a code-generation/copilot tool. Per the system prompts embedded in the backend, the AI analyzes **only** the supplied project documentation. It does not claim to inspect source code, run commands, or check GitHub issues. Users are explicitly told to verify each suggestion against the actual repository before opening a pull request.

## Repository structure

```
repoguide-ai/
├── backend/              # Express API server (port 5000)
│   ├── server.js         # Backend entry: all routes, ZIP extraction, Ollama proxy
│   ├── package.json      # Backend manifest
│   ├── package-lock.json
│   └── node_modules/     # (installed, not committed)
├── frontend/             # Vite + React SPA (port 5173)
│   ├── src/
│   │   ├── App.jsx       # Sole frontend component: all UI + API calls
│   │   ├── App.css       # Custom dark-theme styles
│   │   ├── main.jsx      # React entry point
│   │   └── index.css     # Vite default theme variables (largely unused)
│   ├── index.html        # HTML entry
│   ├── vite.config.js    # Vite config
│   ├── eslint.config.js  # ESLint flat config
│   ├── package.json      # Frontend manifest
│   ├── package-lock.json
│   └── node_modules/     # (installed, not committed)
├── README.md             # This file
└── .gitignore            # Ignores node_modules, dist, .env, .DS_Store
```

## Technology stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | React | 19.3.1 |
| Frontend build/dev server | Vite | ^8.3.5 |
| Frontend language | JavaScript (JSX) | — |
| Frontend styling | Custom CSS | — |
| Frontend state | React `useState` (local only) | — |
| Backend framework | Express | 5.3.0 |
| Backend language | Node.js (CommonJS) | — |
| CORS | cors | 2.8.6 |
| File upload | multer | ^2.5.0 |
| ZIP parsing | yauzl | ^3.4.0 |
| Backend dev tool | nodemon | ^3.1.14 |
| Linting | ESLint (flat config) | ^10.13.0 |
| AI provider | Ollama (local) | — |
| AI model | gemma4:e2b | — |
| Database | None | In-memory session Map only |
| Authentication | None | — |
| Testing | None | — |

## Requirements

- **Node.js** (tested with v24.19.0) and **npm** (tested with 11.17.0).
- **Ollama** installed and running locally at `http://localhost:11434`.
- The Ollama model **gemma4:e2b** must be pulled: `ollama pull gemma4:e2b`.

> Ollama is the only external runtime dependency. It is not documented anywhere else in the repository. All AI processing happens locally — no cloud AI provider and no API keys are used.

## How to run locally

### 1. Install and start Ollama

Install Ollama from https://ollama.com, then pull and run the model:

```bash
ollama pull gemma4:e2b
```

Keep Ollama running in the background (it listens on `http://localhost:11434`).

### 2. Start the backend

```bash
cd backend
npm install        # only if node_modules is missing
npm start          # runs node server.js → http://localhost:5000
# or, for auto-restart during development:
# npm dev          # runs nodemon server.js
```

### 3. Start the frontend

In a separate terminal:

```bash
cd frontend
npm install        # only if node_modules is missing
npm run dev        # runs vite → http://localhost:5173
```

### 4. Use the application

Open `http://localhost:5173`, paste a project's README into the textarea, and click "Analyze project".

## Available scripts

### Backend (`cd backend`)
| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `node server.js` | Run the backend server on port 5000 |
| `dev` | `nodemon server.js` | Run the backend with auto-restart on file changes |
| `test` | `echo ...` | Placeholder; no tests exist |

### Frontend (`cd frontend`)
| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start the Vite dev server on port 5173 |
| `build` | `vite build` | Build for production (output to `dist/`) |
| `lint` | `eslint .` | Run ESLint |
| `preview` | `vite preview` | Preview the production build locally |

## API endpoints (backend, port 5000)

All endpoints are unauthenticated. CORS is restricted to `http://localhost:5173`.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/analyze` | Analyze pasted README via Ollama |
| POST | `/api/guide` | Generate a contribution guide via Ollama |
| POST | `/api/repository/upload` | Upload & extract a repository ZIP (backend only) |
| GET | `/api/repository/:repositoryId/tree` | Return extracted file tree |
| GET | `/api/repository/:repositoryId/file` | Return text content of one file |

## Current limitations (honest)

These are real gaps in the current release, not planned future work:

1. **No frontend UI for repository upload.** The backend ZIP-upload/tree/file-read endpoints are fully implemented, but `frontend/src/App.jsx` has no file input, so users cannot reach repository exploration through the application.
2. **AI does not process source code.** Despite the ZIP-upload feature, no AI endpoint reads or analyzes uploaded repository files. The AI only ever receives pasted README text.
3. **No authentication or database.** All state is in-memory; refreshing the page loses work. There are no users, no accounts, and no persistent storage.
4. **No streaming AI responses.** `stream: false` is hardcoded; users wait for the complete model response (up to 120 seconds) before seeing anything.
5. **No embeddings, vector search, or RAG.** There is no embedding model, vector database, or retrieval step.
6. **No conversation history.** State lives only in React component memory.
7. **No tests.** Zero unit, integration, or end-to-end test coverage exists.
8. **Hardcoded localhost URLs.** The frontend calls `http://localhost:5000` and the backend calls `http://localhost:11434`; neither is configurable via environment variables. The app is not deployable beyond local development without code changes.
9. **Ollama dependency undocumented in code.** If Ollama is not running with `gemma4:e2b`, the analyze and guide endpoints return errors with no operator guidance.
10. **No backend `start`/`dev` scripts previously existed.** (Added in this stabilization.)

## What a user can currently do

1. Paste a README into the frontend and click "Analyze project".
2. Receive an AI-generated project overview, technology tags, setup instructions, three contribution cards, and maintainer questions.
3. Click "Start this contribution →" on a card to receive a detailed contribution guide (prerequisites, steps, verification, PR title/description).
4. Copy the full guide, individual tasks, PR title, or PR description to the clipboard.

## What cannot be done in the current release

- Upload a repository ZIP through the application UI.
- Have the AI read or analyze actual repository source files.
- Log in, create an account, or save work across sessions.
- Search repositories semantically or via code-aware search.
- Compare multiple repositories.
- Import a repository by GitHub/GitLab URL.

## Development constraints (do not change without good reason)

- AI prompts are embedded in `backend/server.js` and must not be altered.
- API response structures must remain unchanged.
- ZIP extraction logic (path-traversal, symlink, encryption, and size safeguards) must remain unchanged.
- No database or authentication should be introduced.
- The monolithic backend (`server.js`) should not be refactored in this stabilization phase.
- No unnecessary dependencies should be installed.
