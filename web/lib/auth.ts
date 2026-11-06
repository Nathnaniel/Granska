// Mock sign-in. Everything else talks to this interface, so Supabase or Clerk
// can replace mockAuth without touching the components.
export interface Session { email: string; name: string }

export interface AuthClient {
  sendMagicLink(email: string): Promise<void>;
  completeMagicLink(email: string): Promise<Session>;
  signInWithGoogle(): Promise<Session>;
  getSession(): Session | null;
  signOut(): void;
}

const KEY = 'granska.session';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function startSession(email: string): Session {
  const first = email.split('@')[0].split(/[._-]/)[0];
  const session = { email, name: first.charAt(0).toUpperCase() + first.slice(1) };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // The dashboard sends visitors back to sign-in if storage is unavailable.
  }
  return session;
}

const mockAuth: AuthClient = {
  async sendMagicLink() { await wait(500); },
  async completeMagicLink(email) { return startSession(email); },
  async signInWithGoogle() { await wait(300); return startSession('alex@gmail.com'); },
  getSession() {
    try {
      const raw = window.localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },
  signOut() {
    try { window.localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
  },
};

export const auth: AuthClient = mockAuth;
