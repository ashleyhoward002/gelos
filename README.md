# Gelos

A full-stack group planning and memory-keeping app for friend groups, families, trip crews, and study groups. Built with Next.js, TypeScript, and Supabase, with a Capacitor-wrapped mobile app for iOS and Android.

**Live demo:** https://gelos-nu.vercel.app

## What It Does

Groups pick a type — Social, Trip Planning, Study, Family, or Custom — which determines which features are active. From there, a group can plan events on a shared calendar, run polls to make decisions, split expenses fairly, save toward a shared goal, share photos, take collaborative notes, and turn outings into scrapbook pages afterward.

## Features

- **Calendar & RSVPs** — shared event calendar with going / maybe / can't-make-it responses
- **Polls** — multiple choice, ranked-choice, date-picker availability, and lottery/random draw
- **Expense splitting** — equal, custom-amount, or percentage splits, including guests who aren't app members, with a personal balance dashboard and private payment reminders
- **Receipt scanning** — OCR-based receipt parsing (Tesseract.js) to speed up expense entry
- **Contribution pools** — shared savings goals for trip planning, with progress tracking
- **Photo galleries** — per-outing photo uploads and organization
- **Scrapbook** — a canvas-based page builder for turning outings into keepsake pages
- **Shared notes, flashcards, and a whiteboard** — collaborative study tools for study groups
- **Group feed and outings** — a timeline that ties planning (before) and memories (after) to a single event

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** Next.js server actions/API routes, Supabase (PostgreSQL, Auth, Storage)
- **Mobile:** Capacitor (iOS + Android wrappers) with native camera, push notifications, and haptics
- **Other:** Tesseract.js for receipt OCR, Vercel Speed Insights

## Status

This is an active personal project. Some features, like the study tools and whiteboard, were added after the initial MVP and are still evolving.
