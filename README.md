# Notes App

Minimal Electron desktop notes app.

## Setup
- Install dependencies: `npm install`
- Run the app: `npm start`

## Features
- Create, edit, search, and delete notes
- Notes are saved locally in the app data folder
- Uses a lightweight renderer UI

## Project Files
- `main.js` - Electron app entry point and note storage logic
- `preload.js` - Secure bridge for renderer access
- `renderer/` - UI files for the app
