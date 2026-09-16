"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { UserProfile, LoginApiResponse } from "@daih/types";
import { api, DaihApiClient } from "./client";

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: {
    email: string;
    password: string;
    portal?: "customer" | "admin" | string;
    audience?: "CUSTOMER" | "ADMIN" | string;
  }) => Promise<LoginApiResponse>;
  setSession: (token: string, user: UserProfile) => void;
  register: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    policyVersion?: string;
    consented: boolean;
    referralCode?: string;
  }) => Promise<{ user: UserProfile; verificationSent: boolean }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<UserProfile | null>;
  updateUser: (user: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isTokenExpiringSoon(
  token: string | null,
  bufferSeconds: number = 180,
): boolean {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    if (!payload.exp) return false;
    const currentTimeSeconds = Math.floor(Date.now() / 1000);
    return payload.exp - currentTimeSeconds <= bufferSeconds;
  } catch {
    return true;
  }
}

export function AuthProvider({
  children,
  apiClient = api,
}: {
  children: React.ReactNode;
  apiClient?: DaihApiClient;
}) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("daih_user_profile");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const userRef = React.useRef<UserProfile | null>(user);
  const inFlightRefreshRef = React.useRef<Promise<UserProfile | null> | null>(
    null,
  );

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const updateUserState = useCallback((newUser: UserProfile | null) => {
    userRef.current = newUser;
    setUser(newUser);
    if (typeof window !== "undefined") {
      try {
        if (newUser) {
          localStorage.setItem("daih_user_profile", JSON.stringify(newUser));
        } else {
          localStorage.removeItem("daih_user_profile");
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    apiClient.setOnSessionExpired(() => {
      updateUserState(null);
      setAccessToken(null);
      apiClient.setAccessToken(null);
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login")
      ) {
        window.location.href = "/login";
      }
    });
  }, [apiClient, updateUserState]);

  const refreshSession = useCallback(async (): Promise<UserProfile | null> => {
    if (inFlightRefreshRef.current) {
      return inFlightRefreshRef.current;
    }

    const promise = (async () => {
      try {
        const res = await apiClient.auth.refresh();
        updateUserState(res.user);
        const token = res.accessToken || (res as any).token || null;
        setAccessToken(token);
        if (token) {
          apiClient.setAccessToken(token);
        }
        return res.user;
      } catch (err: any) {
        const status = err?.status ?? err?.statusCode;
        const code = err?.code;
        const isExplicitAuthRejection =
          status === 401 ||
          status === 403 ||
          code === "REFRESH_TOKEN_REUSE_DETECTED" ||
          code === "SESSION_REVOKED" ||
          code === "INVALID_REFRESH_TOKEN" ||
          code === "SESSION_EXPIRED";

        // If the failure is a transient network/server blip (e.g. status 0, 502, 503, 504)
        // and our in-memory token is still unexpired, preserve active session
        if (!isExplicitAuthRejection) {
          try {
            const inMemoryToken = await apiClient.getAccessToken();
            if (inMemoryToken && !isTokenExpiringSoon(inMemoryToken, 15)) {
              if (userRef.current) return userRef.current;
            }
          } catch {}
        }

        // Explicit auth rejection or expired token: clear session
        updateUserState(null);
        setAccessToken(null);
        apiClient.setAccessToken(null);
        return null;
      } finally {
        inFlightRefreshRef.current = null;
      }
    })();

    inFlightRefreshRef.current = promise;
    return promise;
  }, [apiClient, updateUserState]);

  // Initial session restoration on load via silent refresh against HttpOnly cookie
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const existingToken = await apiClient.getAccessToken();
        if (existingToken && !isTokenExpiringSoon(existingToken, 60)) {
          return;
        }
        await refreshSession();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []); // Run strictly once on mount. Deliberately omitting refreshSession to prevent re-triggering on user state changes.

  // Proactive background refresh timer & focus / payment callback listener
  useEffect(() => {
    if (!user) return;

    const checkAndRefreshToken = async () => {
      const currentToken = await apiClient.getAccessToken();
      if (currentToken && isTokenExpiringSoon(currentToken, 180)) {
        await refreshSession();
      }
    };

    // Periodically verify every 60 seconds
    const interval = setInterval(checkAndRefreshToken, 60000);

    // Refresh when returning from external redirects (e.g. Paystack) or switching tabs
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndRefreshToken();
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, apiClient, refreshSession]);

  const setSession = useCallback(
    (token: string, newUser: UserProfile) => {
      setAccessToken(token);
      updateUserState(newUser);
      apiClient.setAccessToken(token);
    },
    [apiClient, updateUserState],
  );

  const login = async (credentials: {
    email: string;
    password: string;
    portal?: "customer" | "admin" | string;
    audience?: "CUSTOMER" | "ADMIN" | string;
  }): Promise<LoginApiResponse> => {
    setIsLoading(true);
    try {
      const res = await apiClient.auth.login(credentials);
      if ("user" in res && "token" in res) {
        updateUserState(res.user as UserProfile);
        const token = (res as any).token || (res as any).accessToken || null;
        setAccessToken(token);
        if (token) {
          apiClient.setAccessToken(token);
        }
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    policyVersion?: string;
    consented: boolean;
    referralCode?: string;
  }) => {
    setIsLoading(true);
    try {
      return await apiClient.auth.register(payload);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.auth.logout();
    } finally {
      updateUserState(null);
      setAccessToken(null);
      apiClient.setAccessToken(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        setSession,
        register,
        logout,
        refreshSession,
        updateUser: updateUserState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
