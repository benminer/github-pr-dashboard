// Cookie-based session management for Cloudflare Workers
// No Node.js crypto - uses Web Crypto API

const SESSION_COOKIE = "gh_session";

interface SessionData {
  accessToken?: string;
  login?: string;
  avatarUrl?: string;
}

function encodeSession(data: SessionData): string {
  return btoa(JSON.stringify(data));
}

function decodeSession(cookie: string): SessionData {
  try {
    return JSON.parse(atob(cookie));
  } catch {
    return {};
  }
}

export function getSession(request: Request): SessionData {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return {};
  return decodeSession(decodeURIComponent(match[1]));
}

export function setSessionCookie(data: SessionData): string {
  const encoded = encodeURIComponent(encodeSession(data));
  return `${SESSION_COOKIE}=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
