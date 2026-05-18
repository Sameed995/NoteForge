# Notes App

Simple Electron desktop notes app for writing and managing local notes.

## What It Does
- Create new notes
- Edit note title and content
- Search notes quickly
- Delete notes when no longer needed

## Tech Stack
- Electron
- Vanilla JavaScript
- HTML and CSS

## Setup
- Install dependencies: `npm install`
- Run the app: `npm start`

## Data Storage
- Notes are saved locally in Electron user data storage
- Data is stored as `notes.json`
- Notes stay on the machine and are not synced anywhere

## Project Structure
- `main.js` - Electron main process and file storage logic
- `preload.js` - secure bridge between main and renderer
- `renderer/index.html` - app layout
- `renderer/app.js` - renderer logic
- `renderer/style.css` - app styling

## Features
- Create, edit, search, and delete notes
- Notes are saved locally in the app data folder
- Uses a lightweight renderer UI

## Notes
- Built as a lightweight desktop app
- Designed to stay simple and fast
