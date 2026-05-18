/* renderer/app.js — renderer logic */

// state
let notes = [];          // all notes loaded from backend
let activeNoteId = null; // currently open note id
let searchQuery = '';    // active search filter
let saveTimer = null;    // debounce timer
let toastTimer = null;   // toast hide timer

// dom references
const notesList      = document.getElementById('notes-list');
const emptyState     = document.getElementById('empty-state');
const noResults      = document.getElementById('no-results');
const noteCount      = document.getElementById('note-count');
const searchInput    = document.getElementById('search-input');
const clearSearch    = document.getElementById('clear-search');
const noteTitle      = document.getElementById('note-title');
const noteContent    = document.getElementById('note-content');
const noteDate       = document.getElementById('note-date');
const wordCount      = document.getElementById('word-count');
const editorMeta     = document.getElementById('editor-meta');
const deletBtn       = document.getElementById('delete-note-btn');
const saveIndicator  = document.getElementById('save-indicator');
const welcomeScreen  = document.getElementById('welcome-screen');
const toast          = document.getElementById('toast');

// utility functions

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffD   = Math.floor(diffMs / 86400000);

  if (diffMin < 1)  return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH   < 24) return `${diffH}h ago`;
  if (diffD   < 7)  return `${diffD}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function debounce(fn, delay) {
  return function (...args) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const re = new RegExp(`(${escapeRe(query)})`, 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function showToast(msg, duration = 2000) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 200);
  }, duration);
}

function flashSaved() {
  saveIndicator.classList.remove('hidden', 'visible');
  void saveIndicator.offsetWidth; // reflow
  saveIndicator.classList.add('visible');
  setTimeout(() => saveIndicator.classList.remove('visible'), 2000);
}

// sidebar rendering

function getFilteredNotes() {
  if (!searchQuery) return notes;
  const q = searchQuery.toLowerCase();
  return notes.filter(n =>
    n.title.toLowerCase().includes(q) ||
    n.content.toLowerCase().includes(q)
  );
}

function renderList() {
  const filtered = getFilteredNotes();

  notesList.innerHTML = '';

  const total = notes.length;
  noteCount.textContent = `${total} ${total === 1 ? 'note' : 'notes'}`;

  emptyState.classList.toggle('hidden', total > 0 || !!searchQuery);
  noResults.classList.toggle('hidden', !(searchQuery && filtered.length === 0));
  notesList.classList.toggle('hidden', filtered.length === 0);

  filtered.forEach((note, i) => {
    const li = document.createElement('li');
    li.className = 'note-item' + (note.id === activeNoteId ? ' active' : '');
    li.dataset.id = note.id;
    li.style.animationDelay = `${i * 18}ms`;

    const previewText = note.content.replace(/\n/g, ' ').slice(0, 60);

    li.innerHTML = `
      <div class="note-item-title">${highlight(note.title || 'Untitled', searchQuery)}</div>
      <div class="note-item-preview">${highlight(previewText || '—', searchQuery)}</div>
      <div class="note-item-date">${formatDate(note.updatedAt)}</div>
    `;

    li.addEventListener('click', () => selectNote(note.id));
    notesList.appendChild(li);
  });
}

// Select / load note into editor 

function selectNote(id) {
  // Flush any pending save for previous note
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (activeNoteId) flushSave();
  }

  activeNoteId = id;
  const note = notes.find(n => n.id === id);
  if (!note) return;

  noteTitle.value   = note.title;
  noteContent.value = note.content;
  noteDate.textContent  = `Updated ${formatDate(note.updatedAt)}`;
  wordCount.textContent = `${countWords(note.content)} words`;

  editorMeta.classList.remove('hidden');
  deletBtn.classList.remove('hidden');
  welcomeScreen.classList.add('hidden');

  renderList(); // re-render to reflect active state
  noteTitle.focus();
}

//Create new note 

function createNote() {
  const note = {
    id:        generateId(),
    title:     '',
    content:   '',
    updatedAt: new Date().toISOString(),
  };
  notes.unshift(note);
  renderList();
  selectNote(note.id);
  // Title field is focused; user can start typing immediately
  noteTitle.focus();
}

// ── Save note ──────────────────────────────────────────────────

function buildCurrentNote() {
  const note = notes.find(n => n.id === activeNoteId);
  if (!note) return null;
  return {
    ...note,
    title:     noteTitle.value.trim() || 'Untitled',
    content:   noteContent.value,
    updatedAt: new Date().toISOString(),
  };
}

async function flushSave() {
  const updated = buildCurrentNote();
  if (!updated) return;
  // Update in-memory
  const idx = notes.findIndex(n => n.id === updated.id);
  if (idx >= 0) notes[idx] = updated;
  // Sort by updatedAt desc
  notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  renderList();
  await window.notesAPI.saveNote(updated);
  flashSaved();
  // Update meta
  noteDate.textContent  = `Updated ${formatDate(updated.updatedAt)}`;
  wordCount.textContent = `${countWords(updated.content)} words`;
}

const debouncedSave = debounce(flushSave, 500);

// Delete note 

async function deleteActiveNote() {
  if (!activeNoteId) return;
  const id = activeNoteId;
  const noteTitle_ = notes.find(n => n.id === id)?.title || 'Untitled';

  // Clear pending save
  clearTimeout(saveTimer);
  saveTimer = null;

  notes = notes.filter(n => n.id !== id);
  activeNoteId = null;

  // Reset editor
  noteTitle.value   = '';
  noteContent.value = '';
  editorMeta.classList.add('hidden');
  deletBtn.classList.add('hidden');
  welcomeScreen.classList.remove('hidden');

  renderList();
  await window.notesAPI.deleteNote(id);
  showToast(`"${noteTitle_ || 'Untitled'}" deleted`);

  // Auto-select first remaining note
  if (notes.length > 0) {
    setTimeout(() => selectNote(notes[0].id), 50);
  }
}

//  Search 

function handleSearch(e) {
  searchQuery = e.target.value.trim();
  clearSearch.classList.toggle('hidden', !searchQuery);
  renderList();
}

function clearSearchHandler() {
  searchInput.value = '';
  searchQuery = '';
  clearSearch.classList.add('hidden');
  renderList();
  searchInput.focus();
}

// Keyboard shortcuts 

document.addEventListener('keydown', e => {
  const mod = e.metaKey || e.ctrlKey;

  if (mod && e.key === 'n') {
    e.preventDefault();
    createNote();
  }
  if (mod && e.key === 'f') {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
  if (mod && e.key === 'Backspace' && activeNoteId) {
    e.preventDefault();
    deleteActiveNote();
  }
  // Escape from search
  if (e.key === 'Escape' && document.activeElement === searchInput) {
    clearSearchHandler();
  }
});

// event listeners

document.getElementById('new-note-btn').addEventListener('click', createNote);
document.getElementById('welcome-new-btn').addEventListener('click', createNote);
deletBtn.addEventListener('click', deleteActiveNote);
searchInput.addEventListener('input', handleSearch);
clearSearch.addEventListener('click', clearSearchHandler);

noteTitle.addEventListener('input', () => {
  if (!activeNoteId) return;
  // Update in-memory title preview immediately
  const note = notes.find(n => n.id === activeNoteId);
  if (note) note.title = noteTitle.value.trim() || 'Untitled';
  debouncedSave();
});

noteContent.addEventListener('input', () => {
  if (!activeNoteId) return;
  wordCount.textContent = `${countWords(noteContent.value)} words`;
  debouncedSave();
});

// Prevent accidental tab-out from textarea; insert tab instead
noteContent.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = noteContent.selectionStart;
    const end   = noteContent.selectionEnd;
    noteContent.value = noteContent.value.slice(0, start) + '  ' + noteContent.value.slice(end);
    noteContent.selectionStart = noteContent.selectionEnd = start + 2;
    debouncedSave();
  }
});

// Flush save before window closes
window.addEventListener('beforeunload', () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    flushSave();
  }
});

// Init 

async function init() {
  notes = await window.notesAPI.getNotes();
  // Sort newest-first
  notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  renderList();

  if (notes.length > 0) {
    selectNote(notes[0].id);
  }
}

init();