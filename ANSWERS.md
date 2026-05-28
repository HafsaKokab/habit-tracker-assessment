# Assessment Answers

## 1. How to run

This project is made using vanilla HTML, CSS, and JavaScript, so no special installation is required.

### Steps to run:

1. Download or clone the project folder
2. Open the folder
3. Run the `index.html` file in any browser

You can also use VS Code Live Server for a better experience.

### Optional:

If Node.js is installed:

```bash
npx serve .
```

Then open:

```bash
http://localhost:3000
```

## 2. Stack & design choices

I used vanilla HTML, CSS, and JavaScript because I am more comfortable with basic frontend technologies and wanted to keep the project lightweight and simple. Since the app is small, using a large framework felt unnecessary.

### Design Decision 1

I used a grid layout for the weekly tracker instead of a list because it makes it easier for users to quickly see their progress for the whole week. The habits are on the left side and the days are on top, so users can understand everything at a glance.

### Design Decision 2

I highlighted today's column with a different background color so users can easily know which day they are currently tracking. This helps the user focus on today’s tasks faster without checking dates repeatedly.

I decided to start the week from Monday because many productivity and calendar apps also use Monday as the first day of the week.

For streaks, I counted the streak until the latest completed day. If today is not completed yet, the streak still continues from yesterday.

## 3. Responsive & accessibility

### On a 360px phone:

* The layout becomes smaller and scrollable where needed
* Buttons and checkboxes stay large enough to tap
* Text sizes adjust for mobile screens

### On a 1440px laptop:

* The grid uses more screen space
* Everything appears more open and easier to read
* Users can view many habits comfortably

### Accessibility feature I added

I tried to keep button sizes large and added hover/focus effects so users can interact more clearly with the app.

### One thing I skipped

I did not fully implement advanced screen reader support because of time limitations and my beginner-level experience with accessibility features.

## 4. AI usage

I used ChatGPT and GitHub Copilot during development.

### Where I used AI:

* For getting ideas about layout structure
* For fixing JavaScript errors
* For CSS styling suggestions
* For improving responsiveness

One thing I changed from the AI output was the grid layout. The original suggestion did not look good on smaller screens, so I changed the sizing and spacing manually to make it work better on mobile devices.

I also modified colors, spacing, and some UI parts to match the design I wanted.

## 5. Honest gap

One thing that is not fully polished is the animations and visual feedback when completing habits.

If I had one more day, I would:

* Add smoother animations
* Improve the mobile UI more
* Add better streak visuals
* Improve accessibility support further

The main functionality works correctly, but the user experience can still be improved more.
