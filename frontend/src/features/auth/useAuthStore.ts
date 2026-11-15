import { create } from "zustand";
import {
  AuthUser,
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  AuthSession,
} from "./types/auth.types";
import { authApi } from "@/api/authApi";
import { TOKEN_STORAGE_KEY } from "@/api/client";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  isSubmitting: false,
  error: null,
  rememberMe: true,

  restoreSession: async (): Promise<boolean> => {
    try {
      set({ isLoading: true });
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        set({
          user: null,
          token: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return false;
      }

      const res = await authApi.getMe();
      const rawUser = res.user;
      const user: AuthUser = {
        id: rawUser.id,
        name: rawUser.name,
        email: rawUser.email,
        role: "Analyst",
        createdAt: rawUser.createdAt,
      };

      const session: AuthSession = {
        token,
        user,
        rememberMe: true,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      set({
        user,
        token,
        session,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      set({
        user: null,
        token: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    }
  },

  login: async (credentials: LoginCredentials): Promise<AuthUser> => {
    try {
      set({ isSubmitting: true, error: null });
      const res = await authApi.login({
        email: credentials.email,
        password: credentials.password,
      });

      const token = res.token || (res as any).accessToken || "";
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      }

      const rawUser = res.user;
      const user: AuthUser = {
        id: rawUser.id,
        name: rawUser.name,
        email: rawUser.email,
        role: "Analyst",
        createdAt: rawUser.createdAt,
      };

      const session: AuthSession = {
        token,
        user,
        rememberMe: credentials.rememberMe ?? true,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      set({
        user,
        token,
        session,
        isAuthenticated: true,
        rememberMe: credentials.rememberMe ?? true,
        isSubmitting: false,
        error: null,
      });
      return user;
    } catch (err: any) {
      set({
        isSubmitting: false,
        error: err.message || "Failed to sign in. Please verify credentials.",
      });
      throw err;
    }
  },

  register: async (credentials: RegisterCredentials): Promise<AuthUser> => {
    try {
      set({ isSubmitting: true, error: null });
      const res = await authApi.register({
        name: credentials.name,
        email: credentials.email,
        password: credentials.password,
      });

      const token = res.token || (res as any).accessToken || "";
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      }

      const rawUser = res.user;
      const user: AuthUser = {
        id: rawUser.id,
        name: rawUser.name,
        email: rawUser.email,
        role: "Analyst",
        createdAt: rawUser.createdAt,
      };

      const session: AuthSession = {
        token,
        user,
        rememberMe: true,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      set({
        user,
        token,
        session,
        isAuthenticated: true,
        isSubmitting: false,
        error: null,
      });
      return user;
    } catch (err: any) {
      set({
        isSubmitting: false,
        error: err.message || "Failed to create account.",
      });
      throw err;
    }
  },

  logout: async (): Promise<void> => {
    try {
      set({ isSubmitting: true });
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } finally {
      set({
        user: null,
        token: null,
        session: null,
        isAuthenticated: false,
        isSubmitting: false,
        error: null,
      });
    }
  },

  initialize: async () => {
    const restore = useAuthStore.getState().restoreSession;
    await restore();
  },

  clearError: () => set({ error: null }),
}));
