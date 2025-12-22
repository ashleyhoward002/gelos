"use client";

import { ReactNode } from "react";
import { PlatformProvider } from "./PlatformProvider";
import { InstallPrompt } from "../ui/install-prompt";

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <PlatformProvider>
      {children}
      <InstallPrompt />
    </PlatformProvider>
  );
}

export default AppProvider;
