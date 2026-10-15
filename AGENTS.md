# Instructions for the coding agent

Work toward the application described in `README.md`. Work inside this project
root and preserve existing code, data, and unfinished work. Read the README and,
when present, `docs/design-pipeline.md` and `handoffs/current.md` before changes.
These instructions are self-contained; no course website is needed to use them.

## Startup boundary

For the startup task, create only the base folders and README.md/AGENTS.md.
Preserve existing supporting files. Do not install dependencies, build an
interface, configure credentials, create a database, or create/capture a Figma
design during this step. Add supporting documents later as work requires them.

The README leaves project-specific design guidelines open. Before implementing
an interface, obtain the developer's chosen skill, intended flow, design
guidelines, and rationale based on class principles. Do not silently substitute
the lecture's breathing example or invent decisions for unfinished placeholders.
The instructions below govern later development as those tasks are requested.

## 1. Keep the frontend, backend, and database separate

- **`frontend/`: Vue with JavaScript, HTML, and CSS.** Put Vue components,
  interface state, input controls, pacing cues, and API-request code here.
  Use Node.js for frontend tooling and declare dependencies in `package.json`.
- **`backend/`: Python with FastAPI.** Put API routes, request validation,
  controllers, data models, database access, and model-provider calls here.
  Use a project environment at `backend/.venv` and declare Python dependencies.
- **`data/`: SQLite and fictional fixtures.** Use `data/app.sqlite3` for the
  working database. Resolve that path from the project location so it does not
  change with the terminal's working directory. Only backend code opens it.
- Vue communicates with FastAPI through HTTP requests and JSON responses.
  Vue must not open SQLite or call the model provider with a private key.
- Follow MVC responsibilities: models define data and relationships; views
  display information and accept input; controllers apply business rules and
  coordinate data operations. Keep FastAPI routes small.
- Application code controls the exercise sequence, timers, exits, and support
  route. The conversational model cannot change these rules.

## 2. Put project context in the right place

- `README.md`: purpose, stack, folder map, and verified setup/run instructions.
- `docs/design-pipeline.md`: architecture, request/data flow, behavior contracts,
  design rationale, and decisions that affect implementation.
- `docs/verification.md`: repeatable checks, expected/observed results, and
  anything still unverified.
- `prompts/`: significant instructions worth reusing.
- `handoffs/current.md`: actual current state, unfinished work, checks run, and
  the next task.

Update the relevant document when a decision or behavior changes. Avoid copying
whole conversations or creating several documents that repeat the same facts.

## 3. Inspect, plan, and make small changes

Confirm the project folder, branch, existing files, and uncommitted changes.
Summarize the requested result, affected files, behavior to preserve, and how
success will be checked. Work on one coherent increment at a time.

Use **CHECK → TAKE ACTION → VERIFY** for environment setup. Inspect Python,
Node.js, and declared dependencies first. Before an installation that has not
already been authorized, show the packages, exact commands, and target environment
and obtain approval.

## 4. Protect secrets and define API behavior

Keep provider credentials and other secrets in `backend/.env`. Verify that Git
ignores it before credentials are added. Maintain `backend/.env.example` with
required variable names and empty or dummy values only.

Vue sends HTTP/JSON requests to FastAPI; only the backend calls the model
provider.

Use fictional data for all tests and demonstrations.

## Save conversations and retrieve context with RAG

Persist submitted user messages and actual assistant replies with message and
conversation IDs, role, content, timestamp, and request status. Store exercise
sessions and preferences in related records.

Use the class SQL-based retrieval-augmented generation flow:

1. FastAPI sends the question and relevant schema to a model API to propose a
   retrieval query.
2. Treat proposed SQL as untrusted. Validate a single allowed read-only query
   and execute it through read-only SQLite access.
3. Send only the relevant retrieved records and reviewed skill context in the
   answer-generation call.
4. Save the actual model reply through the normal application save operation.

The model never opens SQLite.

## 5. Preserve the design boundaries

- Keep the chosen skill's steps intact.
- The guided sequence must fit within 90 seconds.
- Keep Stop usable throughout an exercise.
- Keep a clearly identified crisis-support route visible and usable in every
  relevant state, even when the model fails.
- Keep reading, typing, and configuration demands low.
- Use saved preferences transparently.
- Do not infer a diagnosis or emotional state from clicks.
- Keep the coursework label accurate.
- Do not invent therapeutic advice, claim clinical effectiveness, imply
  monitoring, or deploy this as a support service.

## 6. Figma and MCP

Figma work comes after initial setup and design guidelines.

When requested later, use the selected Figma frame as design context, preserve
the agreed application behavior, and verify the running result after changes.

## 7. Verify with evidence

Run appropriate frontend/backend checks and inspect actual SQLite records when
the application exists.

Record actual commands, expected results, observations, and untested behavior
in `docs/verification.md`.

Never report a planned check as passed.

Use mocks for repeatable checks and clearly identify live-model checks.

## 8. Review, checkpoint, and hand off

Use a feature branch for substantial work.

Show the diff and call attention to unexpected files.

Stage only intended files.

Before ending a work session, update design/verification notes and
`handoffs/current.md`.

Keep a curated record of tools, models, important prompts, and failed or revised
approaches for the project's AI-use disclosure.