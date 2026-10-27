# Reviewed model contract

The exact executable prompts are in `backend/model.py`.

Retrieval: provide the fictional question and two allowed query strings. The
model returns exactly one query. Validate by exact allowlist equality; bind
the current conversation ID in backend code; run against read-only SQLite.
No arbitrary SQL, tables, columns, joins, additional statements, or literals.

Answer: provide the fictional question, bounded retrieved records and four
reviewed app explanations. Require the model to return one explanation
verbatim. Reject everything else and save/display a static failure reply.
This deliberately demonstrates model selection of relevant content rather than
open-ended counselling. Mock mode uses a deterministic keyword selection.

The model cannot write the database, set a timer, alter skill steps, start a
session, end a session, change preferences, or operate support links. An explicit
crisis-related keyword route bypasses the model. It is incomplete by design and
must not be described as reliable crisis detection.


## Voice prompt layers

The text-chat contract above is unchanged. Voice uses separate FastAPI-owned
constants in `backend/voice_prompts.py`: `LIVE_INSTRUCTIONS` for warm, brief,
interruptible speech and explicit `<|SpawnThinking|>` delegation; and
`BACKEND_INSTRUCTIONS` for reviewed app scope, permissions, context honesty,
and limits on diagnosis/therapy/medical advice/monitoring claims. The exact
strings are wired separately in `backend/voice.py`. Responses delegation reads
`VOICE_BACKEND_MODEL`, uses no tools, and has a 400-token output ceiling.
No records are supplied from SQLite. No audio or transcripts are persisted.
The independent support UI remains application-owned and unchanged.
