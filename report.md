# Mental Health Skills App — Part 3.1

## Repository and commit

Repository: [ADD GITHUB REPOSITORY URL]

Part 3.1 commit: **ADD FINAL COMMIT HASH**

## Proposed design

I chose Paced Breathing (4–6) for a fictional user who wants a short exercise
with little reading or typing. The user inhales for 4 seconds and exhales for
6 seconds. Six cycles take about 60 seconds total.

Flow: Entry → Start → Inhale → Exhale → repeat six cycles → Finish.

The proposed design keeps Stop available during the exercise and
Crisis/Support visible throughout. This is a fictional coursework prototype,
not a real mental health support service.

## Research and design decisions

- **R1:** About 60 seconds keeps the exercise under the 90-second limit.
- **R2:** Support access is easy to reach.
- **R3:** Stop remains available during the exercise.
- **R4:** The user controls starting, stopping, repeating, and leaving.
- **D1:** The exercise interface stays simple.
- **D2:** It shows one breathing action at a time.
- **D3:** It needs little reading and no required typing during the exercise.
- **D4:** Support stays visible.
- **D5:** Later personalization may offer a recent skill without removing choice.
- **D6:** The wording stays simple, neutral, and non-judgmental.

The Entry baseline had more introductory text and a smaller Start button. The
Entry alternative shortened the text and made Start larger. I selected
**Entry — alternative** because it reduces reading effort (D3) and makes the
user's choice to start easier to find (R4). The tradeoff is less explanation
before starting, but an easier main action.

## Model, saved data, and personalization

The application will control the timer, breathing sequence, Stop, and support
route. The model cannot change the breathing steps or create therapeutic
advice. Later, it may give a short neutral introduction or use saved history.

Proposed saved data:

- Session ID
- Skill name
- Start time
- Duration
- Completed or stopped status
- Optional conversation messages
- Recent skill preference

Later, the app may offer “Use my recent skill.” The user can ignore or change
it. Clicks will not be used to infer an emotional state or diagnosis.

## Design evidence

- [Design pipeline](docs/design-pipeline.md)
- [Interface sketch](docs/interface-sketch.md)
- [Figma file](https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K)
- [Entry — baseline](https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K?node-id=2-21)
- [Entry — alternative](https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K?node-id=5-20)
- [Breathing — baseline](https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K?node-id=2-22)
- [Finish — baseline](https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K?node-id=2-23)

The working application has not been built yet because Part 3.1 is a research
and design milestone.

## Open questions

- What exact support information should the working version show?
- Should the breathing cue use text, a circle, or both?
- How should reduced-motion mode show the pace?
- How much saved history should be shown?
- What exact role should the model introduction have?
