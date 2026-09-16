# Plannerdoro

A course planner that doubles as your daily to-do list, with a built-in Pomodoro timer for focused study sessions.

**Live app: [plannerdoro.vercel.app](https://plannerdoro.vercel.app)** — no install needed. Open it on your laptop to plan your semester, or on your phone to check off today's tasks between classes. It works the same on both.

## How to use it

1. **Add your lectures as courses.** Create a course for each class on your schedule (e.g. "Operating Systems", "AI for Software Engineering"), then add tasks under it — lectures, tutorials, assignments, readings — with a due date and priority if they need one.
2. **Build your daily to-do list.** Switch to the **Today** tab each morning and pull in whatever you're tackling that day: pick straight from your existing course tasks, or jot down a quick one-off task that isn't tied to any course. Check things off as you go — it stays in sync with the course planner either way.
3. **Focus with the Pomodoro timer.** Switch to the **Focus** tab to run timed study sessions (45 minutes by default, fully customizable), with short and long breaks handled automatically. A stopwatch and full session history/stats are built in too.

Everything is saved in your browser automatically, so it's there the next time you open the page — on the same device.

## Features

- **Course planner** — courses, tasks, due dates, priority levels, and notes
- **Today's list** — a daily to-do list assembled from existing tasks or new quick ones
- **Pomodoro timer** — customizable focus/break durations, sound + on-screen notifications
- **Stopwatch** — for open-ended work sessions, with lap tracking
- **Session history & stats** — total sessions, hours tracked, and a day-streak counter
- **Export/share** — download or copy your whole planner (including today's list) as clean plain text
- **Light/dark theme**, keyboard shortcuts, and a fully responsive layout for desktop and mobile

## Tech stack

Vite + React, no backend — all data is stored locally in your browser via `localStorage`.

## Running it locally

```bash
npm install
npm run dev
```

```bash
npm run build   # production build
npm run lint    # oxlint
```

Deploys to [Vercel](https://vercel.com) with zero configuration.
