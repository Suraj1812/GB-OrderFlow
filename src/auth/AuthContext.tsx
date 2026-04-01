/* eslint-disable react-refresh/only-export-components */
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
  AuthResponse,
  DealerLoginInput,
  HeadOfficeLoginInput,
  SessionUser,
  UserRole,
} from "../../shared/contracts";
import { apiClient, getApiErrorMessage, setCsrfToken } from "../api/client";

interface AuthContextValue {
  session: SessionUser | null;
  bootstrapping: boolean;
  loginDealer: (input: DealerLoginInput) => Promise<void>;
  loginHeadOffice: (input: HeadOfficeLoginInput) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllSessions: () => Promise<void>;
  getDefaultRoute: (role?: UserRole | null) => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function readSessionFromServer() {
  const response = await apiClient.post<AuthResponse>("/auth/refresh", undefined, {
    skipAuthRefresh: true,
  });

  setCsrfToken(response.data.csrfToken);
  return response.data.user;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function restore() {
      try {
        const user = await readSessionFromServer();
        if (mounted) {
          setSession(user);
        }
      } catch {
        if (mounted) {
          setSession(null);
          setCsrfToken(null);
        }
      } finally {
        if (mounted) {
          setBootstrapping(false);
        }
      }
    }

    void restore();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleExpiry = () => {
      setSession(null);
      setCsrfToken(null);
      toast.error("Your session has expired. Please sign in again.");
    };

    window.addEventListener("gb:session-expired", handleExpiry);

    return () => {
      window.removeEventListener("gb:session-expired", handleExpiry);
    };
  }, []);

  async function loginDealer(input: DealerLoginInput) {
    const response = await apiClient.post<AuthResponse>("/auth/login/dealer", input, {
      skipAuthRefresh: true,
    });
    setCsrfToken(response.data.csrfToken);
    setSession(response.data.user);
  }

  async function loginHeadOffice(input: HeadOfficeLoginInput) {
    const response = await apiClient.post<AuthResponse>("/auth/login/head-office", input, {
      skipAuthRefresh: true,
    });
    setCsrfToken(response.data.csrfToken);
    setSession(response.data.user);
  }

  async function logout() {
    try {
      await apiClient.post(
        "/auth/logout",
        undefined,
        {
          skipAuthRefresh: true,
        },
      );
    } catch (error) {
      if (getApiErrorMessage(error) !== "Authentication required.") {
        throw error;
      }
    } finally {
      setSession(null);
      setCsrfToken(null);
    }
  }

  async function logoutAllSessions() {
    try {
      await apiClient.post(
        "/auth/logout-all",
        undefined,
        {
          skipAuthRefresh: true,
        },
      );
    } catch (error) {
      if (getApiErrorMessage(error) !== "Authentication required.") {
        throw error;
      }
    } finally {
      setSession(null);
      setCsrfToken(null);
    }
  }

  function getDefaultRoute(role?: UserRole | null) {
    return role === "head_office" ? "/head-office/dashboard" : "/dealer/catalog";
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      bootstrapping,
      loginDealer,
      loginHeadOffice,
      logout,
      logoutAllSessions,
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
