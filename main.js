const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function getNotesFilePath() {
  return path.join(app.getPath('userData'), 'notes.json');
}

function readNotes() {
  const filePath = getNotesFilePath();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]), 'utf-8');
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeNotes(notes) {
  const filePath = getNotesFilePath();
  fs.writeFileSync(filePath, JSON.stringify(notes, null, 2), 'utf-8');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 700,
    minHeight: 500,
    backgroundColor: '#0f0f0f',
    titleBarStyle: 'hiddenInset',
    frame: process.platform !== 'darwin',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

// IPC Handlers

ipcMain.handle('notes:getAll', () => {
  return readNotes();
});

ipcMain.handle('notes:save', (event, note) => {
  const notes = readNotes();
  const idx = notes.findIndex(n => n.id === note.id);
  if (idx >= 0) {
    notes[idx] = note;
  } else {
    notes.unshift(note);
  }
  writeNotes(notes);
  return { success: true };
});

ipcMain.handle('notes:delete', (event, id) => {
  let notes = readNotes();
  notes = notes.filter(n => n.id !== id);
  writeNotes(notes);
  return { success: true };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});