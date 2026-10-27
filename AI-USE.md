# AI-use disclosure — Part 3.2

Codex generated the Vue/FastAPI/SQLite implementation, tests, and documentation
with the developer's authorization. The chat runtime identifies itself as
GPT-6-based; an exact model identifier was not exposed. No live application
model is claimed until a configured provider request is verified.

Key prompts: implement Part 3.2 using the selected 4–6 paced breathing design;
keep the sequence in application code; save conversations and sessions; use
read-only, validated SQL retrieval; demonstrate failures and independent support.
The reusable model contracts are in `prompts/model-contract.md` and executable
instructions in `backend/model.py`.

Tools used: local shell/Python, apply_patch, pnpm, Git, browser automation,
Figma design context (selected entry alternative), official OpenAI documentation,
and the connected hotline lookup for reviewed U.S. support details.

Revised approaches and limitations:

- The downloaded folder contained no Git repository; created a local Part 3.1
  baseline on `part3-2`. It is not the original remote commit history.
- System Python was 3.9.6 and Node was absent from PATH. Used bundled runtimes
  and project-local dependencies, after explicit installation approval.
- Network installation and localhost port binding required sandbox escalation.
- Browser runs demonstrated stopped/interrupted records and a completed
  60-second session. An initial HTTP 409 timing boundary led to documented
  clock/rounding tolerances and a regression check; the subsequent completed
  session recorded server 60.014 s and browser 60.001 s.
- Used exact reviewed model output selection instead of free-form advice.
- No real distressed person, diagnosis, clinical-effectiveness claim, deployment,
  or hotline contact was used for verification.

The developer should review generated code and be prepared to explain timer
ownership, save retries, idempotent terminal updates, and SQL allowlisting.

Voice backend increment: the developer explicitly requested the two voice API
routes, `gpt-live-1`, server-owned policy, strict bounded SDP input, sanitized
output/errors, and mock-only checks. Codex consulted the official Live
create-session contract and generated the isolated adapter/router and focused
tests. No voice frontend, microphone access, dependency install, or paid provider
call is included. The final validation command and outcome are recorded in
`docs/verification.md`.


The subsequent run/show-voice request added the visible native WebRTC controls
and mockable transport lifecycle. The implementation consulted the official
GPT-Live WebRTC example for SDP, media tracks, and `session.close`/`session.closed`
semantics. It adds no dependency. Browser evidence shows the true unconfigured
state; no microphone or paid voice request was used. Voice persistence remains
explicitly unfinished.


Prompt-layer increment: the developer specified warm, natural, brief and
interruptible Live speech plus `<|SpawnThinking|>` when reviewed knowledge or
reasoning is needed. Generated separate server-only Live and delegated prompts
and wired hosted Responses delegation to VOICE_BACKEND_MODEL with no tools.
Consulted official Live prompting/delegation documentation. Verification used
22 mocked backend checks; no audio/transcript storage or paid call was added.


Explicit voice-state increment: updated the existing native controller and
Chat controls for the requested state names, microphone selection, mute, and
user-gesture playback retry. Extended injected browser/API tests to 17 cases;
production build passed. All behavior checks remained mocked and no paid call,
microphone access, or audio/transcript persistence was introduced.

Exit/cancellation increment: generated idempotent Mute/End and lifecycle cleanup,
fresh attempt tokens, and a close-only FastAPI WebSocket adapter for sessions
created after cancellation. Reviewed the official Live server-controls guide;
the SIP REST hangup endpoint was not used for WebRTC. A stale-result UI guard
alone was insufficient to close a provider session, so creation remains observed
after HTTP cancellation and its eventual ID is closed server-side. After the
developer explicitly approved the exact command, installed `websockets==17.3`
in backend/.venv and pinned it in requirements.txt. Final focused checks passed:
32 frontend mocks, 32 backend mocks, and production build. No live microphone,
provider request, audio/transcript persistence, or server restart was used.

Mute/End follow-up: reviewed the existing implementation rather than replacing
it. Added a regression with independent native-resource fakes proving old SDP
and close acknowledgements cannot affect a newly active conversation. Reconciled
the current handoff with implemented cancellation and delegation. Observed
33 frontend and 32 backend mock checks passing, plus the production build;
no additional install, microphone access, provider call, or storage change.

Full-check/live-checklist request: ran all 51 backend checks, 33 voice controller
mocks and the production build. Added six browser mocks against the actual
production bundle using existing bundled Playwright and installed Chrome. They
demonstrate usable text chat and independent support after voice failure, plus
configuration, denial, readiness and Mute/End controls. The initial local test
server was denied by the sandbox (EPERM); permitted local execution passed.
Inspected working SQLite counts/schema read-only and wrote a timed manual
fictional live conversation checklist. No production code, packages, credentials,
provider calls or actual microphone/audio were changed or used in this request.

Model-availability verification: consulted official OpenAI model, Live creation,
and delegation documentation; inspected the server-owned model mapping. Used
two real, read-only GET model metadata requests (both 200) and the local config
endpoint. The key stayed in process memory and was never printed or saved in
evidence. No paid session/generation, model replacement or credential edit was
made. Preserved duration 300 and corrected the manual checklist to retain it.

Authorized backend restart: verified a fresh import loads the existing private
environment, gracefully stopped the older Uvicorn process, and restarted the
README command. Direct and frontend-proxied config checks both returned
configured/300, and health returned ok. Restart resolved the stale settings;
no loader code, credentials, models or duration were changed. No provider call
or microphone access was used.

October 26 Part 3.2 completion: the developer explicitly authorized a real live
Text Chat test, SQLite inspection, screenshots, and GitHub publication, while
forbidding edits to report.md and excluding Part 3.3. Used temporary process
settings for gpt-6-luna with a four-call ceiling. The marked fictional Stop
question succeeded through the running Vue UI with two real Responses calls.
Exported only its actual saved records, compared API/SQLite data and verified
persistence after restart. Returned Text Chat to mock mode. Saved two screenshots
and reran the existing 51 backend, 33 controller, six browser-mock checks and
production build. No production-code, dependency, credential, voice-model or
300-second duration change was needed. Publication preserves the existing
remote report and main-branch history.

Publication access finding: integration blob creation returned 403 despite the
account's repository push permission. Git initially had no stored credential.
The user authenticated existing Git locally and pushed the prepared publication
branch; no Homebrew or GitHub CLI was installed. Git ls-remote and the connected
GitHub branch API confirmed the published SHA. Anonymous standard-library HTTP
checks verified 33 public URLs and compared 15 raw downloads with local files.
Reinspected only the selected fictional SQLite request and previous exercise
records read-only and compared API history. Recorded results in verification,
handoff and publication evidence. No additional model call or application-code
change occurred. Local and remote report content and original history remain
unchanged. Part 3.3 and the user's report writing remain outside this task.

Evidence update: inspected the two supplied images, confirmed the exam-stress
exchange was fictional with the user, copied that PNG without editing it, and
removed the selected model-failure screenshot. Updated verification/handoff
references while retaining the matching original Stop-question SQLite proof.
No generated replacement image, application-code change, paid call or report
edit was involved.

Report preparation: at the user's new explicit request, used their pasted
nine-section Part 3.2 report as the main draft. Simplified English, corrected
the submitted application/evidence version, explained reviewed model selection,
distinguished mocks from the verified live exchange, and narrowed claims about
failure, interruption, research findings and untested voice. Verified the
original Part 3.1 report was already preserved byte-for-byte. Checked 17 existing
report URLs anonymously, compared 15 raw files and reinspected selected SQLite
records read-only. Added factual review evidence and a stable final-report tag
reference to avoid a circular commit hash. Preserved the supplied draft and
previous local history in ignored work/. No paid call, application-code change,
Part 3.3 work or Canvas submission was involved.
