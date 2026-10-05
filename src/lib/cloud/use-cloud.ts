"use client";

import { useSyncExternalStore } from "react";
import { getCloudStatus, getServerCloudStatus, subscribeCloudStatus } from "./status";

/** Firebase pesa: sólo se descarga al iniciar sesión o si ya hay una sesión abierta. */
const loadEngine = () => import("./engine");

export const cloudActions = {
  boot: async () => (await loadEngine()).bootCloud(),
  signInWithGoogle: async () => (await loadEngine()).signInWithGoogle(),
  signInWithEmail: async (email: string, password: string) => (await loadEngine()).signInWithEmail(email, password),
  createAccount: async (email: string, password: string) => (await loadEngine()).createAccount(email, password),
  resetPassword: async (email: string) => (await loadEngine()).resetPassword(email),
  signOut: async () => (await loadEngine()).signOutCloud(),
  deleteAccount: async (password?: string) => (await loadEngine()).deleteCloudAccount(password),
  errorMessage: async (error: unknown) => (await loadEngine()).cloudErrorMessage(error),
};

/** Estado de la cuenta y la sincronización (se actualiza solo). */
export function useCloudStatus() {
  return useSyncExternalStore(subscribeCloudStatus, getCloudStatus, getServerCloudStatus);
}
