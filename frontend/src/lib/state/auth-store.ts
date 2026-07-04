// Client auth state (Zustand + localStorage persistence).
//
// Holds only the access token + cached user. Non-hook accessors (getToken /
// clearToken) let the API client read the token without React.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserOut } from "@/lib/api/types";

interface AuthState {
  token: string | null;
  user: UserOut | null;
  setAuth: (token: string, user?: UserOut | null) => void;
  setUser: (user: UserOut | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user = null) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: "sephela-auth" },
  ),
);

// Non-reactive accessors used by the API client.
export function getToken(): string | null {
  return useAuthStore.getState().token;
}

export function clearToken(): void {
  useAuthStore.getState().logout();
}
