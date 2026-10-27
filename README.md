# Mental Health Skills App

IST 402 — Assignment 3 starter

## Purpose

Build a local application that lets someone practice a short skill, stop at any
point, and return to useful session history. The interface should ask for little
reading or typing and keep the person in control. A conversational model can
help introduce the skill and explain the app, using reviewed content and saved
context.

This is a coursework prototype, tested only with fictional scenarios. It must
not diagnose, provide therapy, imply human monitoring, or be offered as a real
mental health support service.

## Current milestone

Part 3.2 now has a local Vue/FastAPI application with SQLite storage. Mock mode
is the default. The selected Figma entry alternative is implemented with
responsive layout, an app-controlled timer, Stop, and an independent support
panel. One real live Text Chat exchange and its SQLite persistence were verified
on October 26, 2026; see the [live evidence](docs/evidence/part3-2-live-text-sqlite.json)
and [browser screenshot](docs/evidence/part3-2-live-text-chat.jpg).

## Your design guidelines

I chose Paced Breathing (4–6) for a fictional user who wants a short, simple
breathing exercise with very little reading or typing. The exercise will take
about 60 seconds: six cycles of inhaling for 4 seconds and exhaling for 6
seconds. This keeps it under the 90-second limit (R1).

### Flow and controls

1. Show an entry screen with a clear Start button.
2. Start breathing only when the user chooses Start.
3. Show “Inhale” for 4 seconds, then “Exhale” for 6 seconds.
4. Repeat that cycle six times.
5. Show a finish screen with Done, Repeat, and Back choices.

Stop stays visible throughout the exercise (R3). Crisis/support information
stays visible and works independently of the model (R2, D4). The user can
stop, leave, repeat, or go back without penalty (R4).

### Interface guidelines and rationale

Show one breathing action at a time in a low-stimulus layout (D1, D2). Use very
little text, require no typing during the exercise, and keep choices simple to
reduce reading and emotional effort (D3). Use calm, readable, neutral, and
non-judgmental language (D6). Keep enough contrast, make keyboard focus visible,
and make the layout work on a narrow screen. If there is a breathing animation,
provide a reduced-motion alternative.

### Model and saved context

The application controls the timer, breathing sequence, Stop control, and
support route. The model must not change the breathing steps or create
therapeutic advice. A later model feature may give a short neutral introduction
or use saved context and history.

Proposed saved context includes a session ID, skill name, start time, duration,
completed or stopped status, optional conversation messages, and a recent skill
preference. Later, the app may offer “Use my recent skill,” but the user can
reject or change that suggestion (D5). Clicks do not show an emotional state or
diagnosis.

### Alternative and tradeoff

I considered a longer entry screen with more instructions. I chose a shorter
entry with a clear Start button because it takes less reading and makes the
user's control easier to see. The first screen gives less explanation, but the
main action is easier to find.

## Technology and separation

- Frontend: Vue with JavaScript, HTML, and CSS. It presents the interface,
  responds to input, and sends HTTP requests to the backend. Node.js provides
  the frontend development tools.
- Backend: Python with FastAPI. It exposes the API, validates requests, applies
  business rules, calls the conversational model, and reads/writes the database.
- Database: SQLite. The planned database is data/app.sqlite3. Only the Python
  backend accesses it; the frontend receives data through the API.

The application runs on localhost.


## Run locally

Prerequisites: Python 3.12+ and Node.js 22.12+ (tested: Python 3.12.14 and
Node 24.19.0), plus pnpm (tested 11.25.0). Standard installations must put
`python3`, `node`, and `pnpm` on PATH. This laptop's bundled runtime commands
are also listed in `docs/local-runtime.md`.

From the project root, set up once:

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
pnpm --dir frontend install --frozen-lockfile
```

Terminal 1:

```sh
backend/.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Terminal 2:

```sh
pnpm --dir frontend dev
```

Open <http://127.0.0.1:5173/>. Keep both terminals running. Bind to localhost
only. Stop servers with Ctrl+C. Vite proxies `/api` to FastAPI; Vue never
opens SQLite or receives the provider key. The backend creates
`data/app.sqlite3` on startup using a project-relative absolute path.

The app uses a browser-local conversation ID to retrieve this browser's
records. SQLite remains on this laptop. Clearing browser storage loses that
browser's link to its records. There are no user accounts or multi-user access
controls; this is a local fictional-data prototype.

## Model modes

Default: mock mode, deterministic responses and no provider calls. The optional
chat demonstrates introduction/control/history explanations without blocking
Start. The checkbox inside the chat section simulates a failed request.

For live mode, copy `backend/.env.example` to `backend/.env` if the file does not
already exist. Set `MODEL_MODE=live`, `OPENAI_API_KEY`, and `OPENAI_MODEL` to a
model available in your own account. Restart the backend. Never put the key in
Vue, Git, a screenshot, a recording, or chat. The real `.env` is ignored.
A successful ordinary chat request uses up to two OpenAI Responses API calls:
one for SQL selection, one for answer selection. A failed request still counts.
At 50 calls per server process (or a lower `LIVE_CALL_LIMIT`) selection falls
back to mock mode and replies are labeled `mock_budget_limit`. Restarting the
server begins a new host testing session and resets that session's counter.

Only fictional questions and a bounded set of local recent records are sent to
the provider. The model chooses among reviewed explanations, rather than
writing unrestricted advice. This is a deliberate limitation. Crisis-related
keyword matches bypass the model and open the independent support panel.
This heuristic is incomplete and does not establish reliable crisis detection.

## Verify and inspect

```sh
backend/.venv/bin/python -m unittest discover -s backend -t . -p 'test_*.py' -v
node --test frontend/src/voice.test.js
pnpm --dir frontend build
backend/.venv/bin/python -m backend.inspect_db
```

Tests use temporary SQLite files and mocks, never the live provider. The
inspection command reads the actual demo database and prints fictional session,
message, retrieval, preference, and call records. Do not run it on real data.
Optional production-browser checks in `frontend/tests/voice-ui.test.js` use an
existing Playwright installation and Chrome, with all APIs and media mocked.
The exact command for this laptop and observed results are in
[verification](docs/verification.md#full-backend-and-production-browser-recheck--october-22-2026).

For browser verification: open the app, inspect the entry and exercise states,
complete one 60-second exercise, stop a second, send a fictional question,
simulate a model failure, then open Crisis / Support. Reload and compare
session/message IDs with SQLite. Hiding the tab ends the exercise; closing the
page uses a best-effort beacon. A later visit reconciles unfinished sessions.
A server restart records unknown durations as interrupted rather than claiming
completion. If a save fails, the browser keeps a retry payload and displays
Save pending. Keep that browser profile until the save succeeds.

See [verification](docs/verification.md), [design decisions](docs/design-pipeline.md),
[demonstration steps](docs/demo-guide.md), and [current handoff](handoffs/current.md).
The Part 3.1 report is preserved at [docs/part3-1-report.md](docs/part3-1-report.md).
No deployment, real-person distress testing, or clinical claim is in scope.

## Voice setup API and browser controls

`GET /api/voice/config` returns only `status` (`configured` or `unconfigured`)
and `duration_seconds` from the server environment (default 60). Configuration means the opt-in flag and a nonblank
key exist; it does not verify provider access or account balance. Set
`VOICE_ENABLED=true` in ignored `backend/.env` only for a later authorized live
run. This is independent of text chat's `MODEL_MODE`; voice is disabled by default.

`POST /api/voice/sessions` accepts JSON containing only `sdp_offer`, at most
64 KiB of SDP in a request body of at most 96 KiB. It requires a basic SDP
envelope with an audio media section. No profile/owner ID is required because
this app has no profile/owner system; extra fields and query parameters are
rejected. Successful responses contain only `session_id`, `sdp_answer`, and
`duration_seconds`. Both endpoints use `Cache-Control: no-store`.

The browser supplies a fresh random UUID in `X-Voice-Attempt-ID` for each
conversation. `POST /api/voice/attempts/{token}/end` cancels that attempt,
including a provider session whose SDP arrives after End. It returns only
`pending`, `closed`, or `unconfirmed` status. Duplicate creation is rejected;
repeated cancellation shares one close attempt. The token is ephemeral cleanup
metadata, not a profile ID or a way to select arbitrary provider sessions.

FastAPI constructs `POST https://api.openai.com/v1/live/sessions` using the
server-owned `gpt-live-1` model, short spoken-interaction prompt, and
`store: false`. Hosted Responses delegation uses `VOICE_BACKEND_MODEL` and a
separate reviewed-scope prompt. Its tools list is empty, tool choice is `none`,
and no application tool executor or Decisions triggers are enabled.
The browser may send only `session.close` and receive only `session.started`
and `session.closed`. These match the native voice controller; model/policy
updates and tool events remain unavailable.

The existing host-session call budget includes voice setup attempts and failures.
There is one provider attempt, no automatic retry or redirects, a 12-second
overall setup deadline, and finite HTTP timeouts. Upstream failures and malformed
responses return sanitized errors; provider bodies and credentials are not
forwarded. Setup failure can still mean the provider initialized a session, so
do not assume retrying is free. The browser enforces the configured duration
locally; it is not a provider-enforced lifetime or a streaming-cost guarantee.

`store: false` controls session retrieval for recording download/forking. It is
not a general statement about provider retention. Contract source:
[official Live create-session reference](https://developers.openai.com/api/reference/resources/live/methods/create).

Focused verification, without a provider connection:

```sh
backend/.venv/bin/python -m unittest backend.test_voice backend.test_voice_cleanup -v
```


Server voice settings: `VOICE_LIVE_MODEL=gpt-live-1` selects the supported Live
model; other values disable voice. `VOICE_MAX_SESSION_SECONDS` accepts 1–300
seconds, with a 60-second fallback when unset. This laptop is configured for
300 seconds. Invalid server settings leave voice unconfigured. This duration
is separate from the fixed 60-second breathing exercise. The browser stops
capture at that limit; provider-enforced timing has not been established. `VOICE_BACKEND_MODEL=gpt-6-luna` selects the hosted Responses model used for
delegated reasoning. It stays server-owned and is never returned to the browser.


Open <http://127.0.0.1:5173/#voice> to see Voice conversation inside Ask about
the app. The panel checks configuration without microphone permission or a
provider call. When configured, the user must explicitly consent and choose
Use microphone. Native MediaDevices and WebRTC carry microphone/spoken audio;
no frontend package or browser speech-recognition service is used. Mute changes
only microphone track enabled flags: assistant playback, the provider session,
and billing continue. End voice stops capture/playback immediately, sends
`session.close` when possible, and waits at most three seconds for
`session.closed`. Page exit, navigation, hiding, unmount, closing the chat
section, starting the exercise, and opening support dispose local resources
immediately and request backend cancellation without blocking the action.
Autoplay rejection offers an Enable assistant audio button that retries audio.play()
from the click gesture. Failure never
reconnects automatically. An interrupted connection can leave final usage
unconfirmed. No live end-to-end voice call has been verified.

FastAPI uses the declared `websockets==17.3` dependency to close late sessions
through an authenticated server-side Live sideband connection. It sends only
`session.close`, discards reflected media/text, has a three-second deadline,
and does not retry. Cancellation metadata stays in bounded process memory;
server restart loses it. Page-exit delivery and closure after network/process
loss are best effort. Local cleanup alone does not confirm provider closure or
final usage. This implementation follows the
[official server-controls guide](https://developers.openai.com/api/docs/guides/voice-server-controls).

Voice audio and transcripts are intentionally not persisted in this increment;
text chat still saves messages through
the existing API. Voice is experimental and does not yet satisfy the coursework
conversation-persistence evidence. Routine transport checks use injected fake
MediaDevices/RTC/audio objects:

```sh
node --test frontend/src/voice.test.js
```


The two exact voice prompt layers live in `backend/voice_prompts.py`:
`LIVE_INSTRUCTIONS` is sent as `session.instructions`; `BACKEND_INSTRUCTIONS`
is sent as `session.delegation.responses.instructions` by `backend/voice.py`.
The Live layer covers conversation style and generating `<|SpawnThinking|>`
when reviewed knowledge or careful reasoning is needed. The delegated layer
contains reviewed scope, permission-before-activity, self-report/interpretation,
missing-context, and crisis boundaries. It has no database or external tools.
No voice audio or transcripts are saved by this increment. The existing setup
budget counts session creation attempts; provider-hosted delegated calls are not
individually counted in that ledger. This does not establish a 50-call bound on
the combined voice/delegation workflow. Prompt behavior and provider access
remain unverified with live calls. Restart FastAPI to load prompt/config changes.


Voice UI states are Permission, Connecting, Active, Muted, Closing, Closed,
and Error (plus configuration discovery/Ready). Loading the page or checking
setup never requests microphone access. Only selecting Use microphone after
consent starts `getUserMedia({ audio: true, video: false })`. The event channel
is created before the offer; the local description and complete ICE gathering
precede the SDP POST. Applying an answer or a connected peer does not mark the
session Active: only `session.started` does. Mute/Unmute changes local track
`enabled` flags while leaving assistant audio available. Voice failure/denial
does not disable the existing text composer or Send flow.

A timed, fictional live voice checklist is in the
[demonstration guide](docs/demo-guide.md#one-live-voice-conversation--manual-only-target-under-60-seconds).
It is prepared for manual use and has not been executed. It includes Start,
spoken interruption, Mute/Unmute, End, and checking active microphone capture.
