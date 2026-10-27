Assignment 3 — Part 3.2: Working Application and Safety
1. Repository Information
GitHub Repository: https://github.com/Meshal9993/assignment3-mental-health

Part 3.2 Branch: https://github.com/Meshal9993/assignment3-mental-health/tree/part3-2

Application and Testing Commit: e2e8454372d1b5150b85a722a2a0d8edaa2ab6c1
2. Application Overview
In Part 3.2, I developed a mental health skills application using Vue, FastAPI, and SQLite. The main goal was to build a working application where users can practice a short breathing exercise.

The app uses the 4–6 breathing technique. Users inhale for four seconds and exhale for six seconds. The exercise repeats for six cycles and takes about one minute.

The app also has a Stop button that lets users end the exercise at any time. It includes a separate Crisis / Support section that users can open without depending on the AI model. This is a coursework prototype and is not a medical or therapy service.
3. AI Chat and Database
The application includes a Text Chat feature connected to an AI model. The model has a limited role: it selects from reviewed explanations rather than giving unrestricted mental health advice. The application controls the breathing timer and safety features separately.

I tested one live Text Chat conversation using gpt-6-luna. The application successfully returned a reviewed explanation about how the Stop feature works.

I also confirmed that SQLite saved both the user's message and the application's response. The messages were still available after I restarted the backend. The database also saves exercise sessions, including their duration and status.
4. Testing and Results
I tested the main features to check how the application works.

The breathing exercise completed successfully. The server recorded 60.014 seconds, and the browser recorded 60.001 seconds. Both measurements were below the required 90-second limit.

I also tested what happens when users press Stop or leave the page during the exercise. These sessions were saved with the correct status. Another test showed that the Crisis / Support section remained available when the backend was stopped, although the exercise could not start without the backend.

The recorded automated test results were:
- 51 backend tests passed.
- 33 voice controller mock tests passed.
- 6 browser mock tests passed.
- The frontend production build passed.
These automated tests used mock behavior and are separate from the one verified live Text Chat conversation. In particular, the voice mock tests do not prove that live voice conversation worked.
5. Problems and Improvements
One problem happened during an early breathing exercise test. The browser reached 60 seconds, but the server rejected the completion because of a small difference between their clocks.

To fix this problem, the completion check was updated to allow a small timing tolerance. After the change, the exercise completed successfully and saved the correct duration.

I also tested how the application handles a failed AI model request. It displayed a fallback message, and the breathing exercise and Crisis / Support information remained accessible. Hiding the page during an exercise was also handled as an interrupted session rather than a completed one.
6. Research and Design Decisions
I used my research findings from Part 3.1 to guide the design of the application.

The 60-second breathing exercise supports R1 because the research showed that short exercises can be easier to complete. The Stop button supports R3 by allowing users to leave without finishing. The Crisis / Support feature supports R2 and D4 by making safety information easy to access.

I also kept the interface simple, with short instructions and one breathing cue at a time. These choices follow the design decisions from Part 3.1 and help reduce unnecessary reading or distractions.
7. Limitations and Remaining Work
The main application features are working, but some parts still need more testing.

I verified one live Text Chat conversation, but I did not verify a complete live voice conversation. The voice tests used mocked responses. I also did not test the application with real users or evaluate its clinical effectiveness. All testing used fictional scenarios.

The project is still a local prototype. Testing on another computer, with screen readers, and under some unexpected shutdown conditions remains incomplete.

For Part 3.3, I plan to continue evaluating the application with more fictional scenarios and prepare the final demonstration. This report covers Part 3.2 only.
8. Verification Evidence
The following paths refer to evidence produced during Part 3.2. The following links provide evidence from Part 3.2, including the live Text Chat conversation, SQLite records, completed breathing exercise, and safety testing.

Live Text Chat Screenshot:
https://github.com/Meshal9993/assignment3-mental-health/blob/part3-2/docs/evidence/part3-2-live-text-chat.jpg

SQLite Conversation Records:
https://github.com/Meshal9993/assignment3-mental-health/blob/part3-2/docs/evidence/part3-2-live-text-sqlite.json

SQLite Inspection Screenshot:
https://github.com/Meshal9993/assignment3-mental-health/blob/part3-2/docs/evidence/part3-2-live-sqlite.jpg

Completed Exercise Screenshot:
https://github.com/Meshal9993/assignment3-mental-health/blob/part3-2/docs/evidence/completed-exercise.png

Independent Support With Backend Stopped:
https://github.com/Meshal9993/assignment3-mental-health/blob/part3-2/docs/evidence/support-backend-off.png

Exercise and Safety Testing Evidence:
https://github.com/Meshal9993/assignment3-mental-health/tree/part3-2/docs/evidence

Verification Notes:
https://github.com/Meshal9993/assignment3-mental-health/blob/part3-2/docs/verification.md
9. Conclusion
In Part 3.2, I completed the main features of my mental health skills application. Users can practice a 60-second breathing exercise, stop whenever they want, use Text Chat, and access Crisis / Support information.

The application also saves conversations and exercise history in SQLite. My tests showed that the main features work, including handling model failures and interrupted exercises.

More evaluation and improvements are still needed for Part 3.3, but the core application is working for this milestone.