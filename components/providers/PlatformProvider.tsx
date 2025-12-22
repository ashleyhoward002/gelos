"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App } from "@capacitor/app";

interface PlatformContextType {
  isNative: boolean;
  platform: "ios" | "android" | "web";
  isIOS: boolean;
  isAndroid: boolean;
  isReady: boolean;
}

const PlatformContext = createContext<PlatformContextType>({
  isNative: false,
  platform: "web",
  isIOS: false,
  isAndroid: false,
  isReady: false,
});

interface PlatformProviderProps {
  children: ReactNode;
}

export function PlatformProvider({ children }: PlatformProviderProps) {
  const [platformState, setPlatformState] = useState<PlatformContextType>({
    isNative: false,
    platform: "web",
    isIOS: false,
    isAndroid: false,
    isReady: false,
  });

  useEffect(() => {
    const initPlatform = async () => {
      const p = Capacitor.getPlatform() as "ios" | "android" | "web";
      const isNativePlatform = Capacitor.isNativePlatform();

      setPlatformState({
        isNative: isNativePlatform,
        platform: p,
        isIOS: p === "ios",
        isAndroid: p === "android",
        isReady: true,
      });

      // Native platform initialization
      if (isNativePlatform) {
        try {
          // Set status bar style
          await StatusBar.setStyle({ style: Style.Dark });

          if (p === "android") {
            await StatusBar.setBackgroundColor({ color: "#FFF8F0" });
          }

          // Hide splash screen after a short delay
          setTimeout(async () => {
            await SplashScreen.hide();
          }, 500);
        } catch (error) {
          console.error("Platform init error:", error);
        }
      }
    };

    initPlatform();
  }, []);

  // Handle back button on Android
  useEffect(() => {
    if (!platformState.isAndroid) return;

    let listenerHandle: Awaited<ReturnType<typeof App.addListener>> | null = null;

    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, [platformState.isAndroid]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    if (!platformState.isNative) return;

    let listenerHandle: Awaited<ReturnType<typeof App.addListener>> | null = null;

    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        console.log("App is active");
      } else {
        console.log("App is in background");
      }
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, [platformState.isNative]);

  return (
    <PlatformContext.Provider value={platformState}>
      {children}
    </PlatformContext.Provider>
  );
}

export const usePlatform = () => useContext(PlatformContext);

export default PlatformProvider;
