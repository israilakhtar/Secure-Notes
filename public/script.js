(() => {
  'use strict';

  const TOKEN_KEY = 'secureNotes.token';
  const $ = (id) => document.getElementById(id);

  const el = {
    toast: $('toast'),
    authView: $('auth-view'),
    dashboardView: $('dashboard-view'),
    tabLogin: $('tab-login'),
    tabRegister: $('tab-register'),
    authForm: $('auth-form'),
    nameField: $('name-field'),
    name: $('name'),
    email: $('email'),
    password: $('password'),
    passwordHint: $('password-hint'),
    authError: $('auth-error'),
    authSubmit: $('auth-submit'),
    welcome: $('welcome'),
    logoutBtn: $('logout-btn'),
    noteForm: $('note-form'),
    noteTitle: $('note-title'),
    noteContent: $('note-content'),
    noteError: $('note-error'),
    notesGrid: $('notes-grid'),
    emptyState: $('empty-state')
  };

  let mode = 'login';
  let toastTimer = null;

  // ---------- Helpers ----------
  const getToken = () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  };
  const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
  const clearToken = () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  };

  function showToast(message, type) {
    clearTimeout(toastTimer);
    el.toast.textContent = message; // textContent: never parsed as HTML
    el.toast.className = 'toast ' + type;
    el.toast.hidden = false;
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, 3500);
  }

  function showError(target, message) {
    target.textContent = message;
    target.hidden = !message;
  }

  class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }

  async function api(path, { method = 'GET', body, auth = true } = {}) {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (auth) {
      const token = getToken();
      if (token) headers.Authorization = 'Bearer ' + token;
    }

    let response;
    try {
      response = await fetch('/api' + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
    } catch {
      throw new ApiError('Cannot reach the server. Check your connection.', 0);
    }

    let data = {};
    try { data = await response.json(); } catch { /* empty body */ }

    // An expired or invalid token on a protected call ends the session.
    if (response.status === 401 && auth) {
      endSession(data.message || 'Your session has expired. Please log in again.', true);
      throw new ApiError(data.message || 'Unauthorized', 401);
    }
    if (!response.ok) {
      throw new ApiError(data.message || 'Request failed.', response.status);
    }
    return data;
  }

  // ---------- Views ----------
  function showAuthView() {
    el.dashboardView.hidden = true;
    el.authView.hidden = false;
  }

  function showDashboardView(user) {
    el.authView.hidden = true;
    el.dashboardView.hidden = false;
    el.welcome.textContent = 'Welcome, ' + user.name;
  }

  function setMode(newMode) {
    mode = newMode;
    const isRegister = mode === 'register';
    el.tabLogin.classList.toggle('active', !isRegister);
    el.tabRegister.classList.toggle('active', isRegister);
    el.tabLogin.setAttribute('aria-selected', String(!isRegister));
    el.tabRegister.setAttribute('aria-selected', String(isRegister));
    el.nameField.hidden = !isRegister;
    el.passwordHint.hidden = !isRegister;
    el.password.autocomplete = isRegister ? 'new-password' : 'current-password';
    el.authSubmit.textContent = isRegister ? 'Create account' : 'Log in';
    showError(el.authError, '');
  }

  // Clears everything user-specific, then shows the login screen.
  function endSession(message, isError) {
    clearToken();
    el.welcome.textContent = '';
    el.notesGrid.replaceChildren();
    el.emptyState.hidden = true;
    el.noteForm.reset();
    el.authForm.reset();
    showError(el.noteError, '');
    setMode('login');
    showAuthView();
    if (message) showToast(message, isError ? 'error' : 'success');
  }

  // ---------- Notes ----------
  function renderNotes(notes) {
    el.notesGrid.replaceChildren();
    el.emptyState.hidden = notes.length > 0;

    for (const note of notes) {
      const card = document.createElement('article');
      card.className = 'note';

      const title = document.createElement('h3');
      title.textContent = note.title;

      const body = document.createElement('p');
      body.className = 'note-body';
      body.textContent = note.content;

      const footer = document.createElement('div');
      footer.className = 'note-footer';

      const date = document.createElement('span');
      date.className = 'note-date';
      date.textContent = new Date(note.createdAt).toLocaleString();

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn danger';
      del.textContent = 'Delete';
      del.addEventListener('click', () => deleteNote(note.id));

      footer.append(date, del);
      card.append(title, body, footer);
      el.notesGrid.append(card);
    }
  }

  async function loadNotes() {
    try {
      const data = await api('/notes');
      renderNotes(data.notes);
    } catch (error) {
      if (error.status !== 401) showToast(error.message, 'error');
    }
  }

  async function deleteNote(id) {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    try {
      await api('/notes/' + encodeURIComponent(id), { method: 'DELETE' });
      showToast('Note deleted.', 'success');
      await loadNotes();
    } catch (error) {
      if (error.status !== 401) showToast(error.message, 'error');
    }
  }

  // ---------- Event handlers ----------
  el.tabLogin.addEventListener('click', () => setMode('login'));
  el.tabRegister.addEventListener('click', () => setMode('register'));

  el.authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError(el.authError, '');

    const name = el.name.value.trim();
    const email = el.email.value.trim();
    const password = el.password.value;

    if (mode === 'register' && name.length < 2) {
      return showError(el.authError, 'Enter your full name (at least 2 characters).');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showError(el.authError, 'Enter a valid email address.');
    }
    if (!password) {
      return showError(el.authError, 'Enter your password.');
    }
    if (mode === 'register' && password.length < 8) {
      return showError(el.authError, 'Password must be at least 8 characters.');
    }

    el.authSubmit.disabled = true;
    try {
      if (mode === 'register') {
        await api('/auth/register', { method: 'POST', auth: false, body: { name, email, password } });
        el.authForm.reset();
        setMode('login');
        el.email.value = email;
        showToast('Account created. Log in to continue.', 'success');
      } else {
        const data = await api('/auth/login', { method: 'POST', auth: false, body: { email, password } });
        setToken(data.token);
        el.authForm.reset();
        showDashboardView(data.user);
        await loadNotes();
        showToast('Logged in.', 'success');
      }
    } catch (error) {
      showError(el.authError, error.message);
    } finally {
      el.authSubmit.disabled = false;
    }
  });

  el.noteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError(el.noteError, '');

    const title = el.noteTitle.value.trim();
    const content = el.noteContent.value.trim();

    if (!title || !content) {
      return showError(el.noteError, 'Add a title and some content before saving.');
    }

    try {
      await api('/notes', { method: 'POST', body: { title, content } });
      el.noteForm.reset();
      await loadNotes();
      showToast('Note saved.', 'success');
    } catch (error) {
      if (error.status !== 401) showError(el.noteError, error.message);
    }
  });

  el.logoutBtn.addEventListener('click', () => endSession('You have been logged out.', false));

  // ---------- Session restore on page load ----------
  async function init() {
    if (!getToken()) {
      showAuthView();
      return;
    }
    try {
      const data = await api('/auth/me');
      showDashboardView(data.user);
      await loadNotes();
    } catch (error) {
      // 401 is already handled by api(); other errors fall back to the login screen.
      if (error.status !== 401) {
        clearToken();
        showAuthView();
      }
    }
  }

  init();
})();
