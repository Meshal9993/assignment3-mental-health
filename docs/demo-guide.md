# Part 3.2 demonstration guide

Use only fictional inputs. Do not include the real `.env` or provider key in a
recording. Start in mock mode and keep both local servers running.

1. Show the coursework label, short entry, Start, and Crisis / Support.
2. Choose Start and keep the tab visible for the complete 60-second sequence.
   Show at least one inhale/exhale transition, cycle count, and finish duration.
3. Expand Session history; identify the completed session. Run
   `backend/.venv/bin/python -m backend.inspect_db` in a terminal and compare its
   ID, completed status, server duration, and client duration.
4. Repeat, choose Stop, and show its stopped record. Repeat again, hide the page,
   return, and show interrupted status. Abrupt closure may reconcile on return.
5. Ask `Fictional demo: How does Stop work?`. Show the reply source and message
   pair in SQLite, including matching request IDs and succeeded status.
6. Check Fail the next model request and send `Fictional demo: introduce this
   exercise`. Show the static fallback and failed message records. Open support
   without contacting the independent service. Start remains available.
7. To prove independence further, stop the backend and open the already-loaded
   support panel. Restore the backend afterward. Explain that a fresh app load
   still requires the frontend server; offline installation is not implemented.
8. Only after configuring a local key, restart in live mode and repeat a small
   ordinary question. Inspect the two provider-call reservations, accepted SQL,
   and the exact saved reply. Show the `live` label. Do not describe mock output
   as a model contribution from a live provider.

Explain generated code: `stop()` in `frontend/src/main.js` first ends the local
timer, creates a terminal record, and stores a retry payload. The server's
`finish()` is idempotent, so a delayed beacon/retry cannot create two completed
sessions or replace a stopped session with completed. Timing checks are tested
with synthetic timestamps; those tests do not replace a real browser duration.

The Part 3.3 process screencast can use the tab-hidden interruption as a failure
investigation: inspect the browser result and the `page_hidden` SQLite reason,
then explain why the implementation records interruption rather than assuming
the user continued. Recording links have not been created yet.

## One live voice conversation — manual only, target under 60 seconds

Prepared checklist, **not executed**. Use fictional software-test dialogue only.
The voice Start control is **Use microphone**, inside Ask about the app. The
large exercise Start button starts the separate 60-second breathing sequence.

Before timing or starting any paid session:

1. Keep other microphone-using tabs/apps closed for a clear capture indicator.
   Keep the app tab visible throughout; hiding it intentionally ends voice.
2. In ignored `backend/.env`, privately configure an available OpenAI API key.
   Preserve other settings. For this one short check, use `MODEL_MODE=mock`,
   `VOICE_ENABLED=true`, `VOICE_LIVE_MODEL=gpt-live-1`,
   `VOICE_BACKEND_MODEL=gpt-6-luna`, `VOICE_MAX_SESSION_SECONDS=300`, and
   `LIVE_CALL_LIMIT=1`. These are manual preparation instructions; this
   verification run has not changed credentials or enabled voice.
   Root `.env` is not the voice configuration file.
3. Restart FastAPI to load current code/settings, and run the frontend using
   the README commands. Open `http://127.0.0.1:5173/#voice`. Choose Check setup
   and confirm Ready and a five-minute limit. Keep that configured limit at
   300 seconds; the stopwatch and manual End below make this a short check.
   Configuration discovery does not
   create a paid session and does not establish provider/account access.
4. Confirm text chat shows Mock model. Select the fictional-audio consent
   checkbox. Have an external stopwatch ready. Do not capture the key, raw SDP,
   real speech, or sensitive browser developer-tool headers as evidence.

Use the external stopwatch from the moment you select Use microphone:

| Time from Start | Exact action | Expected observation to record |
| --- | --- | --- |
| 0 s | Select **Use microphone**; allow microphone permission if prompted | Permission, then Connecting; active capture indicator appears |
| By 10 s | Wait for **Active**. If absent, choose End and record a failed setup; do not retry automatically | Active follows `session.started`, not merely the HTTP answer |
| 10–20 s | Say: “Fictional software test. Say hello slowly in two short sentences.” While it speaks, interrupt: “Please stop. Say ready.” | Whether assistant speech stops and it responds to the interruption; record actual behavior, not an assumed pass |
| 22–25 s | Select **Mute microphone** for about three seconds | Muted badge and Unmute control; microphone track is disabled, but session/playback and billing continue |
| 25–32 s | Select **Unmute microphone**; say “Thank you. Goodbye.” | Active returns and speech input resumes |
| By 40 s | Select **End voice**, even if a reply is still playing | Capture/playback stop immediately; Closing lasts no more than about three seconds, followed by Closed; unconfirmed finalization must be recorded as such |
| By 50 s | Check the browser's active microphone-capture indicator is off, and no assistant sound continues | Capture released. Persistent microphone permission is allowed; it is different from active capture. If capture remains active, close the app tab and record a cleanup failure |
| By 55 s | Record stopwatch duration and the observations above | One attempted conversation, under one minute of the planned interaction; no automatic second session |

If automatic playback is blocked, select **Enable assistant audio** once. Keep
the same End-by-40-seconds cutoff; record any step that could not be completed.
The unchanged 300-second app duration starts after setup returns; it does not
make this a one-minute test automatically. The external cutoff includes setup
time and requires manual End by 40 seconds. Neither local timing nor a Closed UI after timeout proves
a provider-enforced billing limit. A final `session.closed` acknowledges
finalization; a disconnected/expired local wait leaves final usage unconfirmed.

After End, send the fictional text question “How does Stop work?” and confirm
the mock reply and saved text history. This is outside the timed voice segment
and should not make a live text-model request. Restore voice opt-out and the
usual budget after the manual check, keep the duration at 300, then restart in mock
mode. Record the voice outcome in verification only after actually running it.

Record: setup result; Active reached; interruption observed; Mute and Unmute
observed; End time; confirmed/unconfirmed closure; active capture indicator off;
text reply afterward; deviations. Keep every observed field **pending** until
the manual run occurs.

The setup ledger's one-attempt limit does not separately cap provider-hosted
Responses delegation. This greeting check is intended to avoid reasoning work,
but model behavior and delegated call counts are not established by that intent.
The current workflow has not demonstrated the coursework's total live-call
bound for peer testing. `store: false` controls retrieval/forking, not general
provider retention. The app saves no voice audio/transcripts in this increment.
