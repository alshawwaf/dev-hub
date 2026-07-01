import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// When a token is present but expired/invalid, the backend answers 401 "Could not
// validate credentials". The Desktop still renders (public app list), so without
// handling this the user is stuck in a half-broken state — widgets hang on "Loading…"
// and Add/Edit-app shows the credentials error. Instead: drop the dead token and send
// them to /login to re-auth, after which everything works again. Only fires when a
// token exists (anonymous users aren't bounced) and never for the login call itself
// (a bad password there is a normal 401 the form handles).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url || '';
    const isLoginCall = url.includes('auth/login');
    // Clear BOTH keys so we can't end up "logged in" (user present) with no valid
    // token — that state renders the protected desktop but every authed call 401s,
    // leaving widgets stuck on "Loading…". Guard on either key so a half-state still
    // triggers the bounce.
    const wasAuthed = localStorage.getItem('token') || localStorage.getItem('user');
    if (status === 401 && !isLoginCall && wasAuthed) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export default api;
