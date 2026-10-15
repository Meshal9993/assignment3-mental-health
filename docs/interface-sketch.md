# Interface Sketch

## 1. Entry screen

```text
+----------------------------------------+
| Paced Breathing                        |
|                                        |
| Follow six breaths in about one minute.|
|                                        |
| +----------------------------+         |
| |           START            |         |
| +----------------------------+         |
|                                        |
| Crisis/Support                         |
+----------------------------------------+
```

## 2. Breathing screen

Inhale state:

```text
+----------------------------------------+
| Paced Breathing          Cycle 2 of 6  |
|                                        |
|          Inhale - 4 seconds            |
|                                        |
|              .--------.                |
|             (  circle  )               |
|              '--------'                |
|                                        |
| [ Stop ]                               |
| Crisis/Support                         |
+----------------------------------------+
```

Exhale state (shown separately, never at the same time):

```text
+----------------------------------------+
| Paced Breathing          Cycle 2 of 6  |
|                                        |
|          Exhale - 6 seconds            |
|                                        |
|              .--------.                |
|             (  circle  )               |
|              '--------'                |
|                                        |
| [ Stop ]                               |
| Crisis/Support                         |
+----------------------------------------+
```

Reduced-motion mode can keep the circle still and show the phase with a text
countdown instead of animation.

## 3. Finish screen

```text
+----------------------------------------+
| Paced Breathing                        |
|                                        |
| Six cycles finished.                   |
|                                        |
| [ Done ]   [ Repeat ]   [ Back ]       |
|                                        |
| Crisis/Support                         |
+----------------------------------------+
```

This design keeps one action visible at a time and reduces reading effort. Stop
stays available during the exercise, and Crisis/Support stays visible on every
screen.
