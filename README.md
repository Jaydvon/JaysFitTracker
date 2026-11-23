# JaysFitTracker

## Open the app

In VS Code, open `assets/html/tracker.html` with **Live Server** (the project is configured for port 5501). You can also serve this folder with `python -m http.server 5501`, then visit `http://localhost:5501`. No build step or external packages are required.

## Implemented features

- Dashboard with total workouts, active minutes, logged calorie estimates, and current streak.
- Add, edit, delete, search, and filter workouts; record activity, date, duration, calories, intensity, and notes.
- Weekly workout, minute, and calorie goals with immediate progress updates.
- Monday–Sunday calendar and historical weekly summaries with activity charts.
- Motivational messages and six achievements based on workout history.
- Responsive dark interface, keyboard-accessible forms, and a custom neon-green SVG logo in `assets/images/logo.svg`.

Data is saved in this browser's local storage. It is not synced between devices or browsers, and clearing site data removes it. Use the same browser and server address to retain your records. No account or backend is required. Calories are manually entered estimates; blank calorie entries count as zero. Changing goals changes comparisons for all weeks. Achievements are recalculated when workouts are changed or removed. The current streak includes consecutive activity through today, or through yesterday if today has no workout yet.

## Project files

- `assets/html/tracker.html`: page structure and workout dialogs
- `assets/css/style.css`: layout, colors, and responsive styles
- `assets/js/script.js`: navigation, storage, workout management, goals, and statistics
- `index.html`: forwards the project root to the app

## Verification

Checked JavaScript syntax and tested in a browser: logging a workout, persistence after refresh, editing duration, searching, changing a goal, milestone unlock, current streak, weekly totals, historical-week navigation, and deleting the test workout. Checked the dashboard at a 390px mobile viewport with no horizontal overflow. No browser errors were reported. Test data was removed and default goals restored.

## Original concept

I am going to create a fitness tracking application called Jay's Fit Tracker that helps people stay motivated,
organized, and consistent with their workout routines. This application will allow users to set personal goals for
the week and be able to track the goal progress in real time whether its calories burned or exercise durations. The
dashboard displays workout stats, weekly activity, and progress to each goal creating a well-organized
environment for the user to see information in one place. The goal I want is to keep people motivated when
starting to workout or lose weight, so I will add helpful motivationals to promote consistency. One common
problem people face when working out is staying consistent and keeping track of their progress. Without an
organized system, it can be difficult to remember previous workouts, measure improvements, or stay motivated.
Jay's Fit Tracker addresses this problem by allowing users to record their workouts, view progress over time, and
set achievable goals. This application is designed for all people whether that is a beginner starting their fitness
journey or experienced individuals that wants to track workouts easily. This application will be useful to all
fitness people.

## Goal-aware 90-day plans

Use **90-day plan → Edit plan** to add age, the calorie-equation sex setting, and overall activity (including planned workouts). Existing plans keep their dates and saved weights. Gain plans prioritize three nonconsecutive strength sessions and two mobility days; loss plans combine three cardio days and two strength days. Weekends are rest days. Week one uses 75% of session time, week two 85%, then 100%, capped at 45/60/90 minutes for beginner/regular/experienced levels. Weekly goals count warm-up, training and cooldown time.

Calorie estimates use Mifflin–St Jeor × the selected activity factor, with a 300 kcal surplus for gain or a deficit capped at 300 kcal / 15% for loss. Outputs are rounded to 50 kcal. Logged exercise is not added again. Estimates are withheld for missing profiles, ages outside 18–78, selected clinical exclusions, low current/target BMI, or low calculated intake. These estimates are not guarantees or medical prescriptions. Current intake is shown for comparison, and weigh-ins refresh the estimate.

Nature additions include a local lakeside illustration, botanical accents and nature-break/recovery cards; they require no external image service. Schedule and calorie logic checked across 36 goal/fitness/time combinations, including rest days, time accounting, and calorie exclusions. JavaScript syntax and whitespace checks pass; these changes have not yet been visually browser-tested.
