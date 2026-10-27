# Design Pipeline

## Chosen skill

This project uses Paced Breathing (4–6). The user inhales for 4 seconds and
exhales for 6 seconds. Six cycles take about 60 seconds total.

## Fictional user and task

A fictional user wants a short breathing exercise with very little reading or
typing. This is a coursework scenario, not a real mental health service.

## Main flow

```text
Entry
  |
  v
Start
  |
  v
Inhale 4 seconds
  |
  v
Exhale 6 seconds
  |
  v
Repeat for six cycles
  |
  v
Finish
  |
  +--> Done
  +--> Repeat
  +--> Back
```

The user chooses when to start. Stop is always available during the exercise.
Crisis/support information stays visible and works without the model. The user
can leave without penalty.

## Research-based design decisions

- **R1:** Six 10-second cycles take about 60 seconds, under the 90-second limit.
- **R2:** Keep support access easy to reach.
- **R3:** Keep Stop visible during the exercise.
- **R4:** Let the user start, stop, repeat, or leave by choice.
- **D1:** Use a simpler interface during the exercise.
- **D2:** Show one breathing action at a time.
- **D3:** Require very little reading or typing.
- **D4:** Keep support access visible throughout.
- **D5:** Later personalization may offer a recent skill without removing choice.
- **D6:** Use neutral, simple, non-judgmental wording.

The layout should be calm and readable, work on narrow screens, show keyboard
focus, and offer a reduced-motion alternative if it uses animation.

## Model role and limits

The application controls the breathing sequence and timer. The model cannot
change the breathing steps or create therapeutic advice. Later, it may give a
short neutral introduction or use saved history. Support access must still work
if the model fails.

## Proposed saved data

- `session_id`
- `skill_name`
- `start_time`
- `duration`
- `status`: completed or stopped
- Optional conversation messages
- Recent skill preference

This data supports session history and light personalization, not diagnosis.

## Personalization and user control

Later, the app may show “Use my recent skill.” The user can ignore or change
that suggestion. The app does not infer an emotional state from clicks.

## Alternative considered

I considered a longer entry screen with more instructions. I chose a shorter
entry screen with a clear Start button. The tradeoff is less explanation on the
first screen, but less reading effort and an easier-to-find main action.

## Figma design comparison

- [Figma file](https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K)
- [Entry — baseline](https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K?node-id=2-21)
- [Breathing — baseline](https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K?node-id=2-22)
- [Finish — baseline](https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K?node-id=2-23)
- [Entry — alternative](https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K?node-id=5-20)

The baseline entry screen had more introductory text and a smaller Start
button. The alternative shortened the introduction and made Start wider and
taller. Crisis/Support stayed visible in the same location.

I selected Entry — alternative. It reduces reading effort (D3) and makes the
user's choice to start easier to find (R4). The tradeoff is that the user gets
less explanation before starting.

## Open questions

- What exact support information should be shown in the final app?
- Should the breathing cue use a simple circle animation, text only, or both?
- How should reduced-motion mode show the breathing pace?
- How much conversation history should be shown at once?
- What short model introduction is useful without adding too much reading?

## Part 3.2 implementation decisions

Vue owns the entry/exercise/finish state machine. A monotonic browser clock
drives six 4-second inhale / 6-second exhale cycles. FastAPI starts a session
before the timer starts and checks both server elapsed time and client measured
time before accepting completion. After a real browser run hit HTTP 409 at
the exact timing boundary, verification allowed a 500 ms server-clock tolerance
and 50 ms browser-rounding tolerance; the frontend target stays 60,000 ms and
raw measurements are retained. This establishes software timing, not that a
person followed each cue. A gap above 2 seconds in timer callbacks ends the
session as interrupted, avoiding a falsely guided completion after suspension.

Stop takes effect locally before the save request. Stop also appears inside the
support dialog during an exercise, so modal focus cannot trap the user away
from the exit. Hiding or leaving the page ends the exercise. Page-leave beacons
are best effort; pending payloads are retained locally and retried on return.
Previously active sessions become interrupted after a backend restart, with an
unknown duration rather than an invented measurement.

The entry uses the selected Figma alternative (node 5:20), adapted to Vue and
plain CSS. The initial project had no reusable component code or Code Connect
imports. No static image assets were present in this frame. The gray layout,
short introduction, large primary control, and support placement are retained.
The coursework label and optional expandable sections are implementation
additions. The circle is optional motion; text and a countdown remain usable
with reduced motion. OS reduced-motion preference applies even if animation
is otherwise enabled. The stored checkbox remains transparent and reversible.

FastAPI routes validate requests and delegate chat/session rules to controllers.
Only `backend/db.py` and backend inspection/test tools open SQLite. Conversations
relate messages, sessions, and motion preferences. Messages contain IDs, request
IDs, role, exact displayed content, time, request status, and response source.
The schema also records accepted/rejected retrieval proposals and live-call
reservations. Session durations include server and browser measurements.

For an ordinary live question, the provider chooses one of two read-only SQL
queries using the question and reviewed schema/query context. The backend
validates by exact allowlist equality, binds the current conversation ID, opens
SQLite read-only, and limits results. It then sends only those few records plus
reviewed explanations and the question to the answer call. The returned text
must exactly match one reviewed explanation; otherwise the request fails and
the app saves/displays a clearly labeled fallback. This narrower model role
trades conversational flexibility for predictable coursework behavior. It still
allows relevance selection; mock mode is explicitly not live-model evidence.

Crisis routing uses an explicit, incomplete keyword heuristic. Matching input
bypasses the provider and offers the static support panel. No claim of state
inference or comprehensive detection is made. Independent U.S. support details
were obtained from the connected hotline lookup on October 22, 2026. The panel
is frontend content and opens after backend/provider failure; external calling,
SMS, and web chat depend on their own services. Other countries are not
personalized. No hotline was contacted during tests.

The live provider uses the OpenAI Responses endpoint described in the
[official quickstart](https://developers.openai.com/api/docs/quickstart), with
`store: false`. This does not establish any broader provider retention claim.
Calls are limited to at most 50 per server process testing session and return
to mocked selection at the limit. The UI and stored messages label the source.

History-based tailored wording, additional skills, account management, a full
Part 3.3 evaluation, recordings, and a clean-checkout run remain later work.

## Voice session setup boundary

The first voice backend increment adds only configuration discovery and SDP
session creation; text chat and the Vue interface are unchanged. It uses the
Live sessions API with server-owned `gpt-live-1`, URL, instructions, storage
setting, and empty event allowlists. The browser cannot submit provider policy,
tools, models, or session settings. The current app has no profile/owner records,
so no new identity requirement is invented. There is no delegated backend or
tool executor; application-owned delegation and no triggers expose no tools.

Request/response size limits and SDP-envelope checks are defensive validation,
not a replacement for actual WebRTC negotiation. Session creation counts against
the existing host budget, including failed attempts. HTTP and overall deadlines
are finite and creation is never automatically retried. Only a validated ID,
SDP answer, and server-configured client duration are returned. Actual voice media,
duration enforcement, cleanup, voice persistence, and prompt behavior remain
unverified future integration. The prompt alone does not establish the text
chat's exact-reviewed-output guarantee for voice.

`store: false` is specifically a session retrieval/forking setting; no broader
retention assurance is implied. UI consumers must be implemented before any
data-channel event is allowed. Voice is separately opt-in and disabled by default.


### Browser voice follow-up

The voice panel is now implemented within the existing chat details element,
using its neutral colors, buttons and keyboard focus styling. It displays the
server status and configured five-minute limit and requires an explicit paid
voice consent checkbox before Start voice can be enabled. Configuration checks
alone never access a microphone or create a provider session.

Native WebRTC negotiates the microphone and output audio through the SDP
endpoint. Browser setup has a 30-second deadline, no automatic retries, and a
local duration countdown. Stop shuts off capture and playback immediately,
sends `session.close`, and waits up to three seconds for final closure before
freeing the connection. Unmount/page-hide/page-leave/chat-collapse/exercise/
support transitions also dispose resources. A generation guard stops late
permission grants and stale setup responses from reopening a cancelled session.
Only `session.close`, `session.started`, and `session.closed` are now allowed on
the data channel; there are no configuration, tool, or delegated-response events.
Voice transcripts are not yet saved. This remains an experimental UI with
mocked transport checks, not verified live voice or complete coursework evidence.

Part 3.2 live-model verification on October 26 used the existing Text Chat
scope, not experimental voice. A fictional question about Stop produced a real
`gpt-6-luna` Responses reply after an accepted SQL proposal. The displayed reply
exactly matched the reviewed control explanation. Both messages were saved as
live/succeeded and survived a backend restart. This establishes a real model
selection contribution and persistence for this one exchange; it does not
establish clinical benefit or broad response quality. See the selected-request
JSON and screenshots in `docs/evidence/part3-2-live-*`.


### Separate Live and delegated Responses prompts

The developer requested a short spoken-interaction prompt and a separate
reviewed-scope reasoning prompt. Both are defined in `backend/voice_prompts.py`
and sent only from FastAPI. `session.instructions` handles speaking style and
`<|SpawnThinking|>`; `session.delegation.responses.instructions` handles the app
scope, permission, self-report, missing-context, and crisis boundaries.
`VOICE_BACKEND_MODEL` now selects the hosted Responses reasoning model. Tools
remain empty with tool choice none, no Decisions triggers are enabled, and the
browser event permissions remain limited to session lifecycle. The static
support route, text chat, and breathing timer are unchanged. No audio/transcript
persistence was added and no local records are provided to the voice models.
The setup-call counter does not count provider-hosted delegated invocations;
live testing of that workflow needs a separate usage-control review.


### Explicit microphone selection and voice UI states

The microphone button is now labeled Use microphone. Consent and selecting
that button are required; page mounting only checks configuration. The voice
badge exposes Permission, Connecting, Active, Muted, Closing, Closed, and Error.
Active is set only by `session.started`, never by the SDP response or peer
connection state. Mute toggles microphone track enabled flags without pausing
the remote assistant audio. Enable assistant audio calls audio.play() from its
click handler; another playback rejection leaves that action available. Voice
errors remain in voice state and do not alter the text composer's readiness.
Mock checks verify channel-before-offer, local SDP and ICE-before-POST, applying
the answer, explicit readiness, mute, failure and playback retry. No browser
permission or real provider request was used for this verification increment.

### Idempotent exits and late-session cancellation

Mute changes only microphone track enabled flags. It leaves playback and the
provider session running, so it does not end billing. End stops capture and
playback immediately, allows at most three seconds for `session.closed`, then
clears audio, all timers, the channel, and the peer. A resource guard prevents
duplicate Start; an ending flag makes repeated End inert. Every Start creates
a new peer, media stream, and random attempt token without history payloads.

A generation guard alone prevented stale UI updates but could orphan a paid
provider session created after its HTTP request was aborted. FastAPI now keeps
bounded, ephemeral attempt metadata in `backend/voice_cleanup.py`. The browser
sends `X-Voice-Attempt-ID` with setup and cancels through
`POST /api/voice/attempts/{token}/end`. Cancellation can precede setup; it then
prevents creation. If creation is already in flight, its task remains observed
even after an HTTP disconnect, and a late ID is closed without returning SDP.
Repeated cancellation shares one close task. Tokens cannot select arbitrary
provider IDs. No audio, transcripts, or conversation history enter this registry
or the application database.

FastAPI closes late sessions through the authenticated WebSocket sideband from
the [official server-controls guide](https://developers.openai.com/api/docs/guides/voice-server-controls),
using the explicitly approved project-local `websockets==17.3` dependency.
This was chosen because silently discarding late SDP would only clean up the
browser, and the documented REST hangup route is for SIP. The close-only
sideband discards reflected media/text, suppresses frame logging, has bounded
buffers and a three-second overall deadline, and does not retry. A missing
closure acknowledgement is reported as unconfirmed rather than a usage claim.

The same controller disposes on component unmount, navigation, page exit,
hidden visibility, duration expiry, chat collapse, exercise start, and the
independent support action. Lifecycle exits release local resources immediately;
support does not await a network response. Page exit/navigation prefer a beacon
and otherwise use a keepalive request. Actual delivery is best effort. Process
restart loses the registry; hard browser/server loss and suspended timers cannot
establish a provider lifetime or final billing bound. All new verification uses
mocks; real provider closure remains unverified.
