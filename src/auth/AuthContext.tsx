import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import toast from "react-hot-toast";
import type {
  AuthSession,
  DealerLoginInput,
  HeadOfficeLoginInput,
  UserRole,
} from "../../shared/contracts";

import { apiClient, setClientToken } from "../api/client";

const storageKey = "gb-orderflow-session";

interface AuthContextValue {
  session: AuthSession | null;
  bootstrapping: boolean;
  loginDealer: (input: DealerLoginInput) => Promise<void>;
  loginHeadOffice: (input: HeadOfficeLoginInput) => Promise<void>;
  logout: () => void;
  getDefaultRoute: (role?: UserRole | null) => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession() {
  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    setClientToken(session?.token ?? null);

    if (session) {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(storageKey);
    }
  }, [session]);

  useEffect(() => {
    let active = true;

    async function restore() {
      const storedSession = readStoredSession();
      if (!storedSession) {
        setBootstrapping(false);
        return;
      }

      setClientToken(storedSession.token);

      try {
        await apiClient.get("/auth/me");
        if (active) {
          setSession(storedSession);
        }
      } catch {
        if (active) {
          setSession(null);
          setClientToken(null);
        }
      } finally {
        if (active) {
          setBootstrapping(false);
        }
      }
    }

    restore();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleExpiry = () => {
      setSession(null);
      setClientToken(null);
      toast.error("Your session ended. Please sign in again.");
    };

    window.addEventListener("gb:session-expired", handleExpiry);

    return () => {
      window.removeEventListener("gb:session-expired", handleExpiry);
    };
  }, []);

  async function loginDealer(input: DealerLoginInput) {
    const response = await apiClient.post<AuthSession>("/auth/login/dealer", input);
    setSession(response.data);
  }

  async function loginHeadOffice(input: HeadOfficeLoginInput) {
    const response = await apiClient.post<AuthSession>(
      "/auth/login/head-office",
      input,
    );
    setSession(response.data);
  }

  function logout() {
    setSession(null);
    setClientToken(null);
  }

  function getDefaultRoute(role?: UserRole | null) {
    if (role === "head_office") {
      return "/head-office/dashboard";
    }

    return "/dealer/catalog";
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      bootstrapping,
      loginDealer,
      loginHeadOffice,
      logout,
      getDefaultRoute,
    }),
    [bootstrapping, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}

