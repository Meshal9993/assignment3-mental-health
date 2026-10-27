# Assignment 3 — Part 3.2: Working Application and Safety

## 1. Repository Information

- **Repository and branch:** [assignment3-mental-health, part3-2](https://github.com/Meshal9993/assignment3-mental-health/tree/part3-2)
- **Application and evidence commit:** [a72120dc513ba3da83b3aacf344b93b2ccf4353f](https://github.com/Meshal9993/assignment3-mental-health/commit/a72120dc513ba3da83b3aacf344b93b2ccf4353f)
- **Final report submission reference:** [part3-2-submission](https://github.com/Meshal9993/assignment3-mental-health/tree/part3-2-submission)

The application and evidence commit identifies the version reviewed for this
report. The submission tag identifies the final commit containing this report.
Using a stable tag avoids changing the report again to insert its own commit
hash. All work for this submission is on `part3-2`; `main` is unchanged.

The [original Part 3.1 report](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/docs/part3-1-report.md)
is preserved separately in `docs/part3-1-report.md`.

## 2. Application Overview

For Part 3.2, I developed a local coursework skills prototype using Vue,
FastAPI, and SQLite. My chosen skill is Paced Breathing (4–6). The interface
guides six cycles: inhale for four seconds and exhale for six seconds. The
target duration is 60 seconds, below the 90-second limit.

The user chooses Start, follows one cue at a time, and can use Stop at any
point. Afterward, they can repeat or return to the entry screen. The app
controls the sequence, timer, exits, and independent Crisis / Support panel.
It does not diagnose, provide therapy or medical advice, or imply that a person
is monitoring the user. Testing used only fictional scenarios.

## 3. AI Chat and Database

Text Chat has a limited model role. FastAPI asks the model to choose a retrieval
query, checks it against an exact read-only SQL allowlist, and retrieves only
recent records for the current conversation. It then sends the relevant records
and reviewed explanations to the answer call. The model selects a reviewed
explanation; it cannot change the exercise rules or provide unrestricted advice.
Only the backend accesses SQLite and the private provider key.

One documented live Text Chat exchange used `gpt-6-luna` through the OpenAI
Responses API. The fictional input was: “Fictional Part 3.2 verification: How
does Stop work in this app?” The actual reply was:

> Start begins the exercise. Stop ends it immediately. Repeat starts a new session only when you choose it.

The exchange used two real calls: retrieval and answer selection. SQLite saved
both messages with message, request, and conversation IDs, roles, content,
timestamps, and `live / succeeded` labels. Read-only database inspection and
the saved-history API returned the same records after a backend restart.
Exercise sessions also store status and measured duration. Routine Text Chat
was returned to mock mode after verification.

## 4. Testing and Results

I checked the core flow in the running browser and inspected the saved SQLite
records. These are the observed results:

| Check | Result |
| --- | --- |
| Complete the breathing exercise | Saved as completed: 60.014 seconds server time and 60.001 seconds browser time. |
| Use Stop | A browser session was saved as stopped: 36.599 seconds server time. |
| Hide the page during the exercise | Saved as interrupted with reason `page_hidden`: 26.636 seconds server time. |
| Simulate a failed model request | Displayed and saved a fallback; Start and Crisis / Support remained available. |
| Stop the backend | Start was unavailable, but the independent support panel still opened. |
| Restart the backend | The verified live conversation remained in SQLite and the history API. |

The recorded automated checks passed: **51 backend tests, 33 voice controller
mock tests, six browser mock tests, and the frontend production build**.
Automated checks used temporary data and mocked provider or browser behavior.
They are separate from the real live Text Chat exchange and the measured
browser exercise. Passing voice mocks does not verify real spoken interaction.
The backend checks still produced a Starlette/HTTPX deprecation warning.

## 5. Problems and Improvements

During an early breathing test, the browser reached 60 seconds, but the server
rejected completion because of a small clock difference. The pending-save
message and stored timing evidence helped explain the problem.

The completion check now allows 0.5 seconds of server-clock tolerance and
0.05 seconds of browser-rounding tolerance. The browser still targets 60
seconds, and raw measurements are retained. A regression test covers the
boundary, and a later browser run completed and saved successfully.

Page hiding ends an exercise as interrupted. Page-exit saving is best effort;
pending saves can be retried, and a backend restart marks unfinished sessions
as interrupted with unknown duration. This avoids claiming an exercise finished
when the app cannot confirm it.

## 6. Research and Design Decisions

I used the Part 3.1 findings to guide the design. R1 led me to choose a short
exercise below 90 seconds. Stop supports R3 and user choice in R4. Keeping
Crisis / Support available supports R2 and D4. One cue at a time follows D1/D2,
short text reduces reading and typing demands in D3, and neutral wording
follows D6. A saved reduced-motion preference can be changed by the user.

I chose the Figma entry alternative with less text and a larger Start button.
The tradeoff is less explanation before starting. The model's reviewed replies
also trade conversational flexibility for predictable behavior. Crisis-related
keyword matches bypass the model and offer the independent support route.
This simple rule cannot reliably detect every crisis-related input.

## 7. Limitations and Remaining Work

- One documented live Text Chat exchange supports a narrow claim about model
  selection and persistence. Broad response quality and variation were not evaluated.
- Live voice remains experimental. Its tests used mocks, and audio and
  transcripts are not stored. Real voice operation and provider closure remain unverified.
- The app is a local prototype with no user accounts. A clean checkout on
  another laptop, screen-reader use, and hard browser/device loss need more testing.
- External support services were not contacted. No real person in distress
  took part, and the tests do not establish clinical effectiveness.
- Further personalization, wider evaluation, and the final demonstration are
  later work. This submission does not claim Part 3.3 is complete.

## 8. Verification Evidence

These public links identify the application and evidence version used in this
report. Screenshots and database records show different parts of the same
working application.

- [Live Stop-question conversation screenshot](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/docs/evidence/part3-2-live-text-chat.jpg)
- [Actual SQLite conversation records and assertions](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/docs/evidence/part3-2-live-text-sqlite.json)
- [SQLite inspection screenshot](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/docs/evidence/part3-2-live-sqlite.jpg)
- [Additional fictional exam-stress chat screenshot](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/docs/evidence/part3-2-live-exam-chat.png)
- [Completed exercise screenshot](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/docs/evidence/completed-exercise.png)
- [Saved exercise sessions and mocked failure records](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/docs/evidence/database-inspection.json)
- [Independent support panel with backend stopped](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/docs/evidence/support-backend-off.png)
- [Backend test results](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/docs/evidence/part3-2-backend-tests.txt)
- [Voice mock results](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/docs/evidence/part3-2-voice-mocks.txt)
- [Browser mock results](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/docs/evidence/part3-2-browser-mocks.txt)
- [Frontend production build](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/docs/evidence/part3-2-frontend-build.txt)
- [Verification notes, expected results, and observations](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/docs/verification.md)
- [Design decisions](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/docs/design-pipeline.md)
- [Setup and run instructions](https://github.com/Meshal9993/assignment3-mental-health/blob/a72120dc513ba3da83b3aacf344b93b2ccf4353f/README.md)
- [AI-use disclosure for this submission](https://github.com/Meshal9993/assignment3-mental-health/blob/part3-2-submission/AI-USE.md)

The exam-stress image is an additional fictional test screenshot. The
Stop-question screenshot and its matching SQLite JSON provide the documented
live-conversation persistence evidence. Mocked failure records and tests remain
available even though the separate failure screenshot was removed.

## 9. Conclusion

The core Part 3.2 experience works: a fictional user can complete or stop the
chosen skill, use Text Chat, review saved activity, and open independent support.
The evidence shows measured timing, a real model contribution, persistence,
and observed failure and interruption behavior. Wider evaluation and the
limitations above remain unfinished.
