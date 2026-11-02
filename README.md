# RepoGuide AI

RepoGuide AI is a locally run AI tool that helps beginners understand open-source projects and find a first contribution. Import a public GitHub repository or upload a repository ZIP, explore its file tree, and ask the local AI for a plain-language overview, technologies, setup instructions, three beginner-friendly contribution ideas, and questions to ask maintainers. Select an idea to get a step-by-step guide with prerequisites, verification steps, and a suggested pull request title and description.

## Why it matters for Africa

RepoGuide AI can make open-source projects easier to approach for people who are new to contributing, including learners and aspiring developers across Africa. By breaking down project information and offering practical first steps, it aims to lower the learning barrier to participating in global open-source communities. Its AI runs locally through Ollama, so it does not require a paid cloud AI account or API key. However, running a local model requires a compatible computer and an initial model download; importing a GitHub repository requires internet access. The current app is not specifically localized for African languages or tailored to particular countries or communities, and its contribution suggestions should be checked against the repository and with maintainers.

## Product positioning

RepoGuide AI is positioned as a "friendly open-source mentor" for beginners rather than a code-generation/copilot tool. The AI analyzes a bounded set of repository context: README, selected manifests/configuration/entry-point files, and a structural summary. It does not run commands or check GitHub issues, and it may not see every source file. Users are explicitly told to verify each suggestion against the actual repository before opening a pull request.

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

Open `http://localhost:5173`, then either upload a repository ZIP or enter a public GitHub repository URL. Once it is imported, choose **Analyze repository**. Browse files in the repository explorer, review the analysis and contribution ideas, and select **Start this contribution** to generate a detailed guide.

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
| POST | `/api/analyze` | Analyze imported repository context or pasted README via Ollama |
| POST | `/api/guide` | Generate a contribution guide via Ollama |
| POST | `/api/repository/upload` | Upload and extract a repository ZIP |
| GET | `/api/repository/:repositoryId/tree` | Return extracted file tree |
| GET | `/api/repository/:repositoryId/file` | Return text content of one file |

## Current limitations (honest)

These are real gaps in the current release, not planned future work:

1. **Analysis is bounded.** The AI receives selected project files and a repository summary, not every file or a complete understanding of the codebase.
2. **No authentication or database.** There are no user accounts or persistent analysis history; repository sessions expire after 30 minutes.
3. **No streaming AI responses.** `stream: false` is configured; users wait for the complete model response (up to 240 seconds) before seeing it.
4. **No embeddings, vector search, or RAG.** There is no embedding model, vector database, or retrieval step.
5. **No conversation history.** Analysis and guide state lives only in React component memory.
6. **No tests.** There is no automated unit, integration, or end-to-end test coverage.
7. **Local development configuration.** The frontend and Ollama URLs are hardcoded to localhost, so deployment beyond local development requires configuration changes.
8. **Public repositories only.** GitHub import does not support private repositories; GitLab import is not available.

## What a user can currently do

1. Import a public GitHub repository or upload a repository ZIP.
2. Browse its file tree and preview supported text files.
3. Analyze the repository to receive an AI-generated overview, technology tags, setup instructions, three contribution cards, and maintainer questions.
4. Click "Start this contribution →" on a card to receive a detailed contribution guide (prerequisites, steps, verification, PR title/description).
5. Copy the full guide, individual tasks, PR title, or PR description to the clipboard.

## What cannot be done in the current release

- Import private GitHub repositories or repositories from GitLab.
- Have the AI inspect every file or execute/test the repository.
- Log in, create an account, or save work across sessions.
- Search repositories semantically or via code-aware search.
- Compare multiple repositories.

## Development constraints (do not change without good reason)

- AI prompts are embedded in `backend/server.js` and must not be altered.
- API response structures must remain unchanged.
- ZIP extraction logic (path-traversal, symlink, encryption, and size safeguards) must remain unchanged.
- No database or authentication should be introduced.
- The monolithic backend (`server.js`) should not be refactored in this stabilization phase.
- No unnecessary dependencies should be installed.
