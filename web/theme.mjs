// Keep appearance separate from the workspace and its import/export lifecycle.
const STORAGE_KEY = 'astral-travel.theme';
const root = document.documentElement;

function storedTheme() {
  try { return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
}

function applyTheme(theme, persist = false) {
  const isDark = theme === 'dark';
  const value = isDark ? 'dark' : 'light';
  root.dataset.theme = value;
  root.style.colorScheme = value;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#080a16' : '#ffffff');

  for (const button of document.querySelectorAll('[data-action="toggle-theme"]')) {
    button.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    button.title = `Switch to ${isDark ? 'light' : 'dark'} mode`;
    // The stable role is a dark-mode toggle; pressed means dark is enabled.
    button.setAttribute('aria-pressed', String(isDark));
    const icon = button.querySelector('[data-theme-icon]');
    const label = button.querySelector('[data-theme-label]');
    if (icon) { icon.textContent = isDark ? '☾' : '☀'; icon.setAttribute('aria-hidden', 'true'); }
    if (label) label.textContent = isDark ? 'Dark' : 'Light';
    if (!icon && !label) button.textContent = isDark ? '☾ Dark' : '☀ Light';
  }

  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, value); }
    catch { /* Theme still works for this tab when browser storage is unavailable. */ }
  }
}

applyTheme(storedTheme());
document.addEventListener('click', event => {
  if (event.target instanceof Element && event.target.closest('[data-action="toggle-theme"]')) {
    applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
  }
});

// Keep an open second tab in sync without reloading or touching its memory.
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) applyTheme(storedTheme());
});
