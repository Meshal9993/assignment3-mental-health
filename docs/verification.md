# Part 3.2 verification — October 22, 2026

Only fictional inputs and local sessions were used. No paid live-model calls
are represented by the mock checks. Original design documents were read before
implementation; the downloaded archive had no `.git` directory or application
code. A local `part3-2` branch now preserves the Part 3.1 baseline.

## Commands and observed results

| Check | Expected | Observed |
|---|---|---|
| `backend/.venv/bin/python -m unittest backend.test_app -v` | isolated checks pass without network | 19 passed; see [log](evidence/backend-tests.txt) |
| `pnpm --dir frontend build` | production bundle compiles | passed; see [log](evidence/frontend-build.txt) |
| `git check-ignore backend/.env backend/.venv/bin/python data/app.sqlite3 frontend/node_modules` | all ignored | all four printed as ignored |
| Start FastAPI and Vite on localhost | browser loads Vue and JSON APIs | both running after port-bind permission was granted |
| `backend/.venv/bin/python -m backend.inspect_db` | inspect actual stored records | [snapshot](evidence/database-inspection.json) |

The environment used Python 3.12.14, Node 24.19.0, pnpm 11.25.0. Exact Python
dependencies are pinned in `backend/requirements.txt`; frontend resolution is in
`frontend/pnpm-lock.yaml`. The test runner emits a Starlette warning about future
HTTPX adapter compatibility; all checks still pass. It is not evidence of a
live-provider request.

## Deterministic backend checks

The executable scenarios live in `backend/test_app.py`. Test 8 deliberately
changes a temporary fixture timestamp; it does not measure a real exercise.

| # | Fictional scenario / expected behavior | Observed |
|---|---|---|
| 1 | app introduction; save exact reply and correlated user message | passed |
| 2 | deliberate request failure; save both messages as failed | passed |
| 3 | crisis-related role play; bypass provider even during model failure | passed |
| 4 | stop; persist status and client/server duration | passed |
| 5 | leave page; persist interruption | passed |
| 6 | duplicate finish retry; preserve first terminal result | passed |
| 7 | early completion claim; reject | passed |
| 8 | synthetic 60-second session; accept completion | passed (synthetic) |
| 9 | injection-like question and disallowed SQL; reject SQL and isolate conversations | passed |
| 10 | mocked malicious provider SQL; reject and record proposal | passed |
| 11 | save reduced-motion preference and retrieve it | passed |
| 12 | second active session in same conversation; reject | passed |
| 13 | blank question / nonexistent conversation; reject | passed |
| 14 | server restart with active session; interrupted with duration unknown | passed |
| 15 | ordinary question in mock mode; no live calls | passed |
| 16 | synthetic delayed completion over 90 seconds; interrupted | passed |
| 17 | mocked provider timeout; saved fallback | passed (mocked provider) |
| 18 | mocked unreviewed live text; reject | passed (mocked provider) |
| 19 | sub-millisecond clock/rounding boundary; accept within documented tolerance | passed (synthetic) |

These are backend scenario checks, not the complete Part 3.3 end-to-end or live
evaluation. Part 3.3 still needs its own expected/observed scenario record and
small repeated live selection.

## Browser evidence

- At a narrow viewport, inspected Start, cycle 1, Inhale, countdown, Stop and
  Crisis / Support. The design remained readable without horizontal overflow.
- Sent `Fictional demo: How does Stop work?`. The browser showed the reviewed
  control explanation, labeled `mock · succeeded`. SQLite stored both messages.
- Sent `Fictional demo: introduce this exercise` with failure simulation. The
  browser showed `static_fallback · failed` and left Start/support available.
  [Failure screenshot](evidence/model-failure.png).
- Opened Crisis / Support after failure. Then actually stopped the backend,
  loaded the frontend, observed disabled Start and a Reconnect message, and
  opened the support dialog. [Backend-off support screenshot](evidence/support-backend-off.png).
  Independent phone/SMS/chat destinations were inspected, not contacted.
- Restored the backend and used Reconnect successfully.
- Browser session `6cb5f68e-5391-41a3-bfdd-24ccfa8c7444` was interrupted with
  `page_hidden`: server 26.636 s; browser 26.600 s. A separate stopped session
  `136786b3-69e8-44ca-9d23-cfd7bf5f2052` recorded server 36.599 s and browser
  36.589 s. Further stop checks are visible in the SQLite snapshot.
- Full uninterrupted browser completion after the timing fix: **passed**.
  Session `6b544f67-4d98-4aea-9e86-435fe57da550` ran from
  `2026-10-22T18:20:46.549348+00:00` to `18:21:46.563710+00:00`.
  SQLite recorded **60.014 seconds server elapsed** and **60.001 seconds browser
  elapsed**, status `completed`, reason `finished`. The UI rounded the server
  result to 60.01 seconds and showed Saved to local history.
  [Completion screenshot](evidence/completed-exercise.png).

## Three behavior claims and limits

1. Support does not require the backend/model: confirmed by browser with backend
   stopped. This does not prove the external service is reachable or that the
   frontend can be freshly downloaded without its own server.
2. Retries do not overwrite terminal sessions: confirmed by idempotence check.
   Abrupt device loss and cross-browser storage recovery remain untested.
3. Model failure does not control the skill sequence or remove support: confirmed
   by mocked backend failures, visible fallback, and browser support access.
   Real provider variation remains untested until credentials are configured.

A full browser run reached 60.00 seconds but initially received HTTP 409 at
the exact server/client timing boundary. The browser preserved Save pending.
The implementation now permits 0.5 seconds of server clock tolerance and 50 ms
of browser rounding tolerance while the frontend still targets 60,000 ms. Raw
measurements remain visible. A regression test covers the boundary. Restarting
the backend during investigation correctly reconciled the outstanding session
as interrupted with duration unknown. Retry cleared the pending payload; the
UI was also corrected to clear the old error and show unknown rather than 0.00.

Surprising finding: a tab change interrupted the timed run. The stored reason
made the failure explainable. The implementation intentionally ends the session
instead of assuming guided participation continued in the background.

Unverified: live-provider success/variation and account-specific model access,
clean checkout on another computer, screen-reader use, hard-kill recovery across
all browsers, and actual external crisis-service availability. No clinical
effectiveness or reliable crisis detection has been evaluated. No recording or
remote publication is included yet.

## Focused voice backend checks — October 22, 2026

Command: `backend/.venv/bin/python -m unittest backend.test_voice -v`.
Observed: **18 tests passed**, 0.108 seconds. All outbound requests were
intercepted by HTTPX MockTransport with fictional responses and credentials.
No provider connection, paid call, dependency install, or microphone access
occurred. Stopped after the focused suite; the full application suite and
frontend checks were not rerun for this backend-only increment.

Covered configured/unconfigured discovery, valid response projection, missing
configuration, extra browser policy/identity fields and query parameters,
invalid SDP/JSON/types, SDP and request size bounds including chunked and
multibyte input, HTTP errors and redirects, connection/phase/overall timeouts,
malformed and oversized provider responses, single-attempt behavior, and shared
budget reservation/exhaustion. Tests inspect the outgoing URL, model, prompt,
store setting, absence of delegated tools, and empty event allowlists.

`git diff --check` passed before the focused suite. The only new code files are
`backend/voice.py` and `backend/test_voice.py`; other changes mount the router,
add the disabled-by-default flag to `.env.example`, and document the contract.
The existing Starlette/HTTPX deprecation warning remains; no replacement
dependency was installed.

Live negotiation, model behavior, microphone/UI integration, voice persistence,
and teardown remain untested. The advertised 60-second duration is a future
client limit, not an enforced provider timeout. `store: false` is documented
only as the session retrieval/forking setting, not a general retention claim.


Voice server configuration follow-up: saved the three developer-supplied
settings in ignored `.env`, added public example values, and connected the
model/duration settings to validation and the endpoint duration. Backend model
selection is reserved because no delegated backend exists. Focused command
`backend/.venv/bin/python -m unittest backend.test_voice -v` passed **20 tests**
in 0.120 seconds, including the 300-second setting and invalid server settings.
All provider responses remained mocked; no paid calls occurred.


## Visible voice panel and native transport follow-up

Commands observed:

- `node --test frontend/src/voice.test.js`: **10 passed** (injected fake browser
  media, peer, audio and HTTP objects; no microphone or provider).
- `pnpm --dir frontend build`: production build passed, 13 modules transformed.
- `backend/.venv/bin/python -m unittest backend.test_voice -q`: **20 passed**.

Covered unavailable configuration, denied permission, cancellation followed by
late permission, stale setup responses, failure cleanup without retry,
idempotent disposal, payload containing only SDP, lifecycle readiness/closure,
autoplay rejection, malformed session responses, and expiry at the configured
duration (synthetic clock advancement). The first frontend test run exposed a
fixture arrow-expression syntax error; corrected the fixture and reran the suite.

Browser inspection at `http://127.0.0.1:5173/#voice` showed Voice conversation,
Setup required, the five-minute duration, unchecked consent, disabled Start
voice, and Check setup. [Screenshot](evidence/voice-panel.png). This is the
actual unconfigured state, not a successful live-call screenshot. Microphone
permissions were not requested and paid calls were not made. Real voice output,
provider access, duration behavior in suspended browsers, and voice transcript
persistence remain unverified/incomplete.


## Two-layer voice prompts and Responses delegation

`backend/.venv/bin/python -m unittest backend.test_voice -v`: **22 passed**,
0.131 seconds, entirely using mock HTTP responses. Verified outgoing Live model,
separate prompt fields, server-environment backend model selection, no delegated
tools, rejected browser prompt/delegation overrides, projected public responses,
and absence of audio/transcript writes to conversation/exercise tables.
`store: false` remains on the session, with no broader retention assertion.
Only setup-attempt metadata is written to the existing call ledger; hosted
Responses invocations are not individually accounted there. No provider call,
microphone access, server restart, or dependency installation was performed.
These checks establish configuration and storage boundaries, not that live
speech follows every prompt instruction. The independent support UI was not
modified. The existing deprecation warning remains.


## Explicit voice states and microphone selection

- `node --test frontend/src/voice.test.js`: **17 passed**, 0 failed, 318 ms.
  All media, WebRTC, remote audio and API behavior was injected/mocked.
- `pnpm --dir frontend build`: passed, 13 modules transformed, 57 ms.

Added checks establish: config discovery never requests a microphone;
getUserMedia receives exactly audio true/video false after start; permission
and connecting states precede readiness; oai-events precedes the offer; the
local offer and ICE completion precede the SDP POST; the returned answer is
applied while remaining Connecting; only session.started changes Active;
Mute/Unmute toggles track enabled state; playback rejection exposes a retry
that clears only on successful play; malformed events, failed remote SDP and
connection loss do not auto-retry; refresh cannot overwrite an active session;
repeated close/dispose sends session.close at most once.

Text composer readiness/disabled conditions remain independent of voice errors.
No live browser permission dialog, microphone, provider call, audio/transcript
storage, server restart, or dependency installation was used. No claim of real
voice negotiation or cross-browser autoplay behavior is made. Stopped after
mock checks and the production build, as requested.

## Mute, bounded End, and late-session cleanup — October 22, 2026

Commands run from the project root using this laptop's bundled Node/pnpm PATH:

- `node --test --test-reporter=spec frontend/src/voice.test.js`: **33 passed**,
  0 failed, 369 ms on the focused follow-up run.
- `backend/.venv/bin/python -m unittest backend.test_voice backend.test_voice_cleanup -q`:
  **32 passed**, 0.176 seconds. The existing Starlette/HTTPX deprecation warning
  remains.
- `pnpm --dir frontend build`: passed, 13 modules transformed, 62 ms.

All browser/media/RTC/audio, provider HTTP, and provider WebSocket behavior was
mocked with fictional inputs. No actual microphone, provider connection, paid
call, or server restart occurred. The developer previously approved installing
`websockets==17.3` into `backend/.venv`; it is declared in requirements.txt.
No additional installation was needed for this follow-up.

| Focused check | Expected | Observed with mocks |
| --- | --- | --- |
| Mute/Unmute | Toggle capture enabled flags without stopping playback or closing the session | Track flags toggled; no stop, pause, peer close, close event, or cancellation request |
| Duplicate Start | One permission request and provider attempt | One of each |
| Repeated End | Microphone off immediately; one close; bounded cleanup | Tracks stopped before acknowledgement; one close event; transports cleaned once |
| No session.closed | Release locally after the deadline and ask FastAPI to close | Synthetic deadline released resources; one cancellation; usage shown unconfirmed |
| Late SDP after End | Close late provider session without applying answer or restoring Active | Matching attempt cancellation sent; remote answer never applied; backend close confirmed by mock; setup returned 409 without SDP |
| Aborted HTTP setup | Keep observing provider creation and close its late result | Cancelled ASGI request's provider task survived and its resulting session was closed |
| Cancel before setup / repeated cancellation | No creation after cancellation; no duplicate close | Provider creation blocked; repeated end shared one close task |
| New conversation | Fresh setup with no audio/transcript/history payload | Different attempt token and new setup; only SDP in JSON |
| Old callbacks after a new Start | New resources and active state must survive old results | Distinct microphone tracks/streams, peers, channels and audio objects; old SDP never applied; late closed acknowledgement did not close or change the new conversation |
| Duration limit | Stop microphone and request close | Synthetic clock reached limit; capture stopped and close sent |
| Lifecycle exits | Stop capture/playback, clear transports/timers and cancel without blocking | Controller checks passed for pagehide, beforeunload, popstate, hashchange, Navigation API navigate, hidden visibility, and unmount; page exits used a beacon |
| App exits | Same immediate cleanup for independent actions | Controller checks passed for crisis_support, exercise_start, and chat_collapse; main.js wiring inspected to dispose before opening support |
| Close failure / timeout | Sanitized unconfirmed status, no retry | Unconfirmed returned; one provider close attempt |
| Sideband boundary | Server-owned URL/credentials, close-only send, no retained media/text | Outgoing event and finite settings matched; fictional reflected frames discarded |

Decision from testing: ignoring a late SDP result protects UI state but does
not close its provider session. Added attempt cancellation and an observed,
shielded creation task with server-side closure rather than treating local
track cleanup as sufficient. Existing storage-boundary checks still pass: no
voice audio/transcript writes to conversation or exercise tables. Setup-attempt
ledger metadata remains separate from voice media.

The follow-up found the requested application behavior already in the working
tree. Added the independent-resource/old-callback regression above; no transport
implementation change was necessary. All 33 frontend and 32 backend checks
passed on the follow-up run, alongside the production build.

These are deterministic controller/API checks, not a mounted-browser or live
voice demonstration. Real sideband access/closure, page-exit beacon delivery,
cross-browser lifecycle behavior, hard process loss, and provider final usage
remain unverified. The registry is process-local and expires after ten minutes;
server restart loses it. The local duration is not a provider hard limit, and
hosted delegation calls remain outside the setup-call counter. No paid call is
authorized by these results. Stopped after focused checks and build.

## Full backend and production-browser recheck — October 22, 2026

Observed commands from the project root (bundled runtime PATH from
`docs/local-runtime.md`):

| Command | Observed result |
| --- | --- |
| `backend/.venv/bin/python -m unittest discover -s backend -t . -p 'test_*.py' -v` | **51 passed**, 0.283 s: 19 application, 22 voice API, 10 voice cancellation/sideband checks |
| `node --test --test-reporter=spec frontend/src/voice.test.js` | **33 passed**, 0 failed, 378 ms |
| `pnpm --dir frontend build` | **Passed**, 13 modules, 70 ms |
| Production-browser command below | **6 passed**, 0 failed, 3.676 s, installed headless Chrome |

The backend retains its existing Starlette/HTTPX deprecation warning. No
dependency was installed or changed. All backend provider calls were mocked;
SQLite writes in the backend suite used isolated temporary databases.

Exact optional browser-check command for this laptop:

```sh
PLAYWRIGHT_MODULE_PATH=/Users/alqufaidi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright \
CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
/Users/alqufaidi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  --test --test-reporter=spec frontend/tests/voice-ui.test.js
```

On another machine, use an existing Playwright module/browser and supply their
paths if they are not discoverable. Build first. The script never installs a
browser or package. It serves `frontend/dist` on a temporary localhost port,
opens fresh browser contexts, replaces MediaDevices/RTC/Audio with explicit
fakes, intercepts all API requests, blocks other origins, and closes the browser
and server afterward. It does not contact the running FastAPI process or load
credentials. Text messages/history in this browser check are in-memory mocks;
actual SQLite text persistence is established separately by backend tests.

The first browser invocation was blocked at the setup hook by sandbox
`listen EPERM` on localhost; none of its six cases reached the application.
Reran with permission for the local test server/headless browser: all six
passed. No application fix was needed for that environment failure.

| Requested behavior | Expected | Observed |
| --- | --- | --- |
| Missing configuration | No microphone or provider attempt; text remains usable | Backend rejects unconfigured creation; browser Start disabled, zero media calls, text reply displayed |
| Microphone denial | Error, no setup POST; text remains usable | Browser denial message shown, zero session requests, subsequent text reply displayed |
| Offer/answer success | Answer applied; Active only after session.started | Browser showed Connecting after answer, then Active after explicit mocked event |
| Mute versus End | Mute disables input only; End closes session/resources | Browser track disabled without pause/close; Unmute restored it; End stopped local/remote tracks, detached audio, closed peer/channel and sent one session.close |
| Provider failure | Sanitized error, released capture, no automatic retry | Backend failure/timeout mocks passed; browser 502 case stopped capture and made one setup attempt |
| Text after voice failure | Composer and Send remain usable and show a reply | Typed fictional question after voice 502; observed one /api/chat request and rendered mock reply |
| Independent support after failure | Support can open without waiting for the provider | Browser dialog opened after voice 502 with capture already stopped |
| Repeated Start/End, late results and exits | Idempotent cleanup; no stale UI restoration | All 33 controller mocks and 10 backend cleanup mocks passed, including fresh resources and late closure acknowledgements |

Read-only inspection of working `data/app.sqlite3` used Python sqlite3 with
`mode=ro`, counted approved tables, and inspected message/session column names
without printing content. Observed: 2 conversations, 4 messages, 7 exercise
sessions, 0 preferences, 1 retrieval record, 0 model-call records. Existing
message fields retain IDs, role, content, timestamps, status and source; session
fields retain measured duration/status. No voice media/transcript schema was
added. These counts describe existing fictional data, not new browser-test saves.

Prepared the exact manual <60-second voice checklist in `docs/demo-guide.md`.
**It remains unexecuted**. No microphone, paid provider call, credential edit,
voice opt-in, or application-server restart occurred during this recheck.

Still unverified: account/model access, real SDP/ICE and audio negotiation,
latency and spoken interruption, real permission indicators after End, live
prompt/safety compliance, real provider sideband finalization and billing,
cross-browser and page-exit delivery, hard browser/server termination, and the
total delegated-call limit. The process-local cancellation registry is lost on
restart. `store: false` is only the retrieval/forking setting. No clinical or
real-person distress testing was performed.

## Model IDs, endpoint compatibility and account visibility — October 22, 2026

Reviewed current official documentation:

- [GPT-Live 1](https://developers.openai.com/api/docs/models/gpt-live-1) lists
  `gpt-live-1`; [Live session creation](https://developers.openai.com/api/reference/resources/live/methods/create)
  accepts it in `session.model` for `POST /v1/live/sessions`.
- [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) lists
  `gpt-6-luna` for Responses work. The
  [Live delegation guide](https://developers.openai.com/api/docs/guides/live-delegation)
  explicitly demonstrates this exact pair with `delegation.type=responses`
  and `delegation.responses.model=gpt-6-luna`. No replacement is needed.

Source inspection confirmed `backend/voice.py` maps browser
`POST /api/voice/sessions` to `POST https://api.openai.com/v1/live/sessions`.
`VOICE_LIVE_MODEL` becomes `session.model`. `VOICE_BACKEND_MODEL` becomes
`session.delegation.responses.model`; OpenAI manages those delegated Responses
requests. FastAPI does not issue a separate Responses POST for voice. The
separate text-chat controller calls `POST /v1/responses` through
`backend/model.py` using `OPENAI_MODEL`, not either voice environment variable.
`GET /api/voice/config` and the end-attempt route do not choose another model;
the latter closes an existing session through its authenticated sideband.

Privately read settings using the same environment/file precedence as the
application, printing only equality booleans and presence flags. Both model
settings matched the requested IDs and the duration matched 300. No key value,
prefix, length, provider body or authentication header was printed or saved.

For account visibility, used existing HTTPX with the configured backend key for
two read-only, fixed-host requests, with finite timeouts and redirects disabled:

| Request | Expected | Observed |
| --- | --- | --- |
| `GET https://api.openai.com/v1/models/gpt-live-1` | Metadata with matching ID if visible to this key | HTTP **200**, ID matched |
| `GET https://api.openai.com/v1/models/gpt-6-luna` | Metadata with matching ID if visible to this key | HTTP **200**, ID matched |
| `GET http://127.0.0.1:8000/api/voice/config` without authorization header | Inspect running-process status without provider inference | HTTP **200**, status unconfigured, duration 300 |

The first restricted-network attempt could not complete; the permitted
read-only requests above succeeded. These are real API metadata checks,
**not** mocked results, generated Responses, or a paid Live session. They
establish documented compatibility and visibility to the configured key, not
successful session creation, endpoint-specific execution permissions, available
quota/billing, speech, or prompt behavior. Both model pages mark the free API
tier unsupported. Account/project execution still needs the separately
authorized manual test.

The local file currently has a nonblank key and voice enabled, but the running
process reports unconfigured. A stale process/environment is a likely cause;
restart FastAPI to load the current file before manual testing. No restart,
inference, model substitution or credential edit occurred here. Kept
`VOICE_MAX_SESSION_SECONDS=300` unchanged. Updated the manual checklist to
preserve 300 and use its external End-by-40-seconds cutoff instead of asking
for a temporary 45-second setting. The browser mock's fictional 45-second
fixture does not change the real configuration.

## FastAPI restart and loaded voice configuration — October 22, 2026

The developer explicitly requested restarting FastAPI to load `backend/.env`.
Confirmed the process listening on port 8000 (PID 3701) had this project's
working directory using `lsof`. A fresh backend import verified all of:
`VOICE_ENABLED=true`, a configured voice adapter, and settings equal to
`gpt-live-1`, `gpt-6-luna`, 300. Only booleans/success text were printed;
credentials stayed private.

Sent Ctrl+C to the existing backend terminal session; observed clean application
shutdown and process exit. Restarted from the project root using:

```sh
backend/.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Observed startup complete, new PID **5680**, terminal session **80220**, bound
only to localhost. Local port/network permission was used for startup and
verification. Read-only requests then passed:

- `GET http://127.0.0.1:8000/api/health`: HTTP **200**, status `ok`.
- `GET http://127.0.0.1:8000/api/voice/config`: HTTP **200**,
  `{"status":"configured","duration_seconds":300}`, `Cache-Control: no-store`.
- `GET http://127.0.0.1:5173/api/voice/config` through the frontend proxy:
  HTTP **200**, the same public configuration and cache policy.

Restart resolved the stale-process mismatch. The environment file is read when
`backend/model.py` is imported; the previous process retained its earlier
settings. No configuration-loader code fix, model/duration edit, package
installation, provider request, paid session, or microphone access was needed.
No `.env` contents or key values were printed. Live voice remains untested;
configured means the local requirements loaded, not that a paid session passed.

## Part 3.2 final live Text Chat evidence — October 26, 2026

Scope is Part 3.2 only. The developer explicitly authorized one successful live
Text Chat conversation, SQLite verification, screenshots, and GitHub publication.
The developer owns `report.md`: it was not edited or staged for this work.
No Part 3.3 implementation, evaluation, or recording was undertaken.

Started the real application using its existing environment, with temporary
process overrides only:

```sh
MODEL_MODE=live OPENAI_MODEL=gpt-6-luna LIVE_CALL_LIMIT=4 \
  backend/.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
pnpm --dir frontend dev
```

No `.env` contents were printed or changed. The four-call host ceiling is below
the coursework's fifty-call cap. Voice was not started; its models and
`VOICE_MAX_SESSION_SECONDS=300` were preserved.

Through the running Vue Text Chat interface, submitted exactly this fictional
test input: `Fictional Part 3.2 verification: How does Stop work in this app?`
Observed a successful live reply:

> Start begins the exercise. Stop ends it immediately. Repeat starts a new session only when you choose it.

Expected: approved read-only retrieval, relevant reviewed explanation, actual
user/assistant messages saved with matching IDs, role/content/time/status/source,
and the same records retrieved after restart. Observed: **all passed**.

- Request ID: `ebe388b7-ffa5-40ee-b9b9-b9592c018b0e`.
- User message ID: `70159e8f-5fd5-4559-a7f1-852bd8845f96`.
- Assistant message ID: `75934b64-cc7f-48a1-9d62-e94428e994ae`.
- Both records: `status=succeeded`, `source=live`, matching conversation/request
  IDs. SQL selection was accepted and retrieved two relevant records.
- Two provider-call reservations during this exchange: retrieval and answer,
  using `POST /v1/responses` and `gpt-6-luna`. These were real calls, not mocks.
- UTC timestamps were 2026-10-27 01:56:41.382538 and 01:56:46.559882: October 26
  in America/New_York, approximately 5.177 seconds apart.
- Opened the working SQLite database with `mode=ro` and selected only this
  request's rows. Compared them with the normal saved-history API.
- Stopped the temporary live process, restarted with the unchanged default
  configuration, and rechecked identical message IDs/content/status through
  history. Routine Text Chat returned to mock mode; voice duration remained 300.

Evidence:

- [Actual browser live exchange](evidence/part3-2-live-text-chat.jpg). The crop
  contains only the marked fictional exchange; other conversation content is
  excluded.
- [Actual SQLite records and assertions](evidence/part3-2-live-text-sqlite.json).
  Only the selected fictional request and its call/retrieval metadata are
  exported; the working database and credentials remain ignored.
- [SQLite inspection screenshot](evidence/part3-2-live-sqlite.jpg). This is a
  browser rendering of the actual read-only inspection JSON and query, not a
  mocked application response.

Repeated existing checks for this completed version:

| Command | Observed evidence |
| --- | --- |
| `backend/.venv/bin/python -m unittest discover -s backend -t . -p 'test_*.py' -v` | [51 passed, 0.301 s](evidence/part3-2-backend-tests.txt) |
| `node --test --test-reporter=spec frontend/src/voice.test.js` | [33 passed, 370.6 ms; mocked](evidence/part3-2-voice-mocks.txt) |
| Existing production-browser mock command from above | [6 passed, 6.336 s; mocked](evidence/part3-2-browser-mocks.txt) |
| `pnpm --dir frontend build` | [Passed, 13 modules, 78 ms](evidence/part3-2-frontend-build.txt) |

The existing Starlette/HTTPX deprecation warning remains. No dependencies were
installed and no application-code change was needed for this successful test.
Prior completed-exercise, failure, interrupted/Stop and independent-support
evidence remains available in this directory. Live voice, clinical outcomes,
and a full Part 3.3 evaluation are outside this evidence claim. Publication
checks will be recorded after the GitHub upload; local and remote `report.md`
must remain unchanged throughout.

Publication preflight: the repository is public and the connected account owns
it, but integration write access is missing (Git blob creation returned HTTP
403 Resource not accessible by integration). Git CLI and macOS Keychain have
no GitHub credential, and no SSH identity is available. Browser access to the
public repository succeeds without sign-in. The intended Part 3.2 branch and
evidence are not yet uploaded; do not claim their public links passed until
authentication and push complete. The user selected local Git authentication.
Prepared a remote-main-based publication commit retaining the existing remote
report blob; the local report is preserved byte-for-byte and is excluded from
all new commits. The earlier archive-based local history remains recoverable.
