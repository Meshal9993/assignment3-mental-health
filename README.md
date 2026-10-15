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

## Startup scope

Create the base folders, README.md, and AGENTS.md. This step establishes project
context. The application capabilities below are plans for later implementation.
There is no selected interface design or running application yet.

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
