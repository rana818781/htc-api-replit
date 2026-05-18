import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { queryClient } from "@/lib/queryClient";

interface AuthUser {
  id: number;
  username: string;
  isAdmin: boolean;
  isReseller: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "veoflowapi_token";
const USER_KEY = "veoflowapi_user";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiCall(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }
  return data as { token: string; user: AuthUser };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as AuthUser;
        setToken(savedToken);
        setUser(parsed);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }

      fetch(`${BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Invalid token");
          return res.json();
        })
        .then((data) => {
          setUser({ id: data.id, username: data.username, isAdmin: data.isAdmin, isReseller: data.isReseller });
        })
        .catch(() => {
          setToken(null);
          setUser(null);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        })
        .finally(() => setIsLoaded(true));
    } else {
      setIsLoaded(true);
    }
  }, []);

  const handleAuth = useCallback(async (path: string, username: string, password: string) => {
    const data = await apiCall(path, { username, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const login = useCallback((username: string, password: string) => {
    return handleAuth("login", username, password);
  }, [handleAuth]);

  const register = useCallback((username: string, password: string) => {
    return handleAuth("register", username, password);
  }, [handleAuth]);

  const signOut = useCallback(() => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (currentToken) {
      fetch(`${BASE_URL}/api/extension/token`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${currentToken}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("__veoflowapi_token__");
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  useEffect(() => {
    const handler = () => {
      const currentToken = localStorage.getItem(TOKEN_KEY);
      if (currentToken) {
        fetch(`${BASE_URL}/api/extension/token`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${currentToken}` },
        }).catch(() => {});
      }
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem("__veoflowapi_token__");
      queryClient.clear();
      const path = window.location.pathname;
      if (path !== "/sign-in" && path !== "/sign-up" && path !== "/" && path !== "/plans") {
        window.location.href = "/sign-in";
      }
    };
    window.addEventListener("veoflowapi:unauthorized", handler);
    return () => window.removeEventListener("veoflowapi:unauthorized", handler);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoaded, isSignedIn: !!user, login, register, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
