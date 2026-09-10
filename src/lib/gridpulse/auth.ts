export interface LocalUser {
  id: string;
  email: string;
  full_name: string;
  org_name: string;
}

interface StoredUser extends LocalUser {
  password: string;
}

const USERS_KEY = "gridpulse.local.users.v1";
const SESSION_KEY = "gridpulse.local.session.v1";
const AUTH_EVENT = "gridpulse-auth-change";

function makeId(prefix = "user") {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  if (typeof window !== "undefined") localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function emitAuthChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_EVENT));
}

export function getCurrentUser(): LocalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LocalUser) : null;
  } catch {
    return null;
  }
}

export function subscribeAuth(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(AUTH_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function signUpLocal(input: {
  email: string;
  password: string;
  full_name: string;
  org_name?: string;
}): LocalUser {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!email) throw new Error("Please enter an email address.");
  if (password.length < 4) throw new Error("Password must be at least 4 characters.");

  const users = readUsers();
  if (users.some((user) => user.email === email)) {
    throw new Error("An account with this email already exists. Please sign in.");
  }

  const user: StoredUser = {
    id: makeId(),
    email,
    password,
    full_name: input.full_name.trim(),
    org_name: input.org_name?.trim() || "Demo Fleet Operations",
  };

  users.push(user);
  writeUsers(users);
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  emitAuthChange();
  return user;
}

export function signInLocal(emailInput: string, password: string): LocalUser {
  const email = emailInput.trim().toLowerCase();
  const user = readUsers().find((candidate) => candidate.email === email);
  if (!user || user.password !== password) {
    throw new Error("Email or password is incorrect.");
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  emitAuthChange();
  return user;
}

export function signOutLocal() {
  localStorage.removeItem(SESSION_KEY);
  emitAuthChange();
}

export function updateLocalProfile(input: { full_name?: string; org_name?: string }) {
  const current = getCurrentUser();
  if (!current) throw new Error("Not signed in");

  const users = readUsers();
  const index = users.findIndex((user) => user.id === current.id);
  if (index < 0) throw new Error("Operator account not found.");
  const existing = users[index];
  if (!existing) throw new Error("Operator account not found.");

  const updated = {
    ...existing,
    full_name: input.full_name?.trim() || existing.full_name,
    org_name: input.org_name?.trim() || "Demo Fleet Operations",
  };
  users[index] = updated;
  writeUsers(users);
  localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  emitAuthChange();
  return updated;
}
