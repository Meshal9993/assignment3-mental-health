 Mental Health Skills App — Part 3.1

 Repository and commit

Repository: https://github.com/Meshal9993/assignment3-mental-health

Part 3.1 commit: b8630c8526da5c6f5c60eb6f36d4c7b3212edaae

 Implementation

For Part 3.1, I designed a mental health skills application using Paced Breathing (4–6).

The user inhales for 4 seconds and exhales for 6 seconds. The exercise uses six cycles, so it takes about 60 seconds. I chose this design because it is short and does not require much reading or typing.

The main flow is:

Entry - Start - Inhale - Exhale - repeat six cycles - Finish

Stop stays available during the exercise, and Crisis/Support stays visible. The user can stop, leave, repeat, or go back by choice.

The application will control the timer, breathing sequence, Stop button, and support route. The model will not change the breathing steps or create therapeutic advice. Later, the model may give a short neutral introduction or use saved history.

The proposed saved data includes session ID, skill name, start time, duration, completed or stopped status, optional conversation messages, and a recent skill preference.

  Verification

I reviewed the design using the Assignment 3 research findings.

R1 supports keeping the exercise short, so I designed it for about 60 seconds.

R2 and D4 support keeping Crisis/Support easy to reach and visible.

R3 supports keeping Stop available during the exercise.

R4 supports letting the user choose when to start, stop, repeat, or leave.

D1 and D2 support a simple interface that shows one breathing action at a time.

D3 supports using little reading and no required typing during the exercise.

D5 supports light personalization, such as offering a recent skill, without removing the user's choice.

D6 supports simple, neutral, and non-judgmental wording.

I also compared two Entry screen designs in Figma. The baseline had more text and a smaller Start button. The alternative used less text and a larger Start button. I selected the alternative because it reduces reading effort and makes the Start action easier to find.

Figma file: https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K

Entry — baseline: https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K?node-id=2-21

Entry — alternative: https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K?node-id=5-20

Breathing — baseline: https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K?node-id=2-22

Finish — baseline: https://www.figma.com/design/ai95GsZjmQHWntHR9kt85K?node-id=2-23

  Project context and next steps

Project files:

 [README](README.md)
 [AGENTS](AGENTS.md)
 [Design pipeline](docs/design-pipeline.md)
 [Interface sketch](docs/interface-sketch.md)

One limitation is that Part 3.1 is only the research and design stage, so the working application has not been built yet.
