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
