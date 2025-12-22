import { Capacitor, PluginListenerHandle } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Share } from "@capacitor/share";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { PushNotifications } from "@capacitor/push-notifications";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Browser } from "@capacitor/browser";

// ============================================
// PLATFORM DETECTION
// ============================================

export const isNative = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform(); // 'ios', 'android', 'web'
export const isIOS = () => Capacitor.getPlatform() === "ios";
export const isAndroid = () => Capacitor.getPlatform() === "android";

// ============================================
// CAMERA - For photo uploads
// ============================================

export async function takePhoto() {
  if (!isNative()) return null;

  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt, // Let user choose camera or gallery
    });

    return photo;
  } catch (error) {
    console.error("Camera error:", error);
    return null;
  }
}

export async function pickFromGallery() {
  if (!isNative()) return null;

  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,
    });

    return photo;
  } catch (error) {
    console.error("Gallery error:", error);
    return null;
  }
}

// ============================================
// CLIPBOARD - For copying links, text, etc.
// ============================================

export async function copyToClipboard(text: string): Promise<{ success: boolean; showPrompt?: boolean }> {
  try {
    // Try modern clipboard API first (works on HTTPS and localhost)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return { success: true };
    }

    // Fallback for mobile / non-secure contexts using deprecated execCommand
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Make the textarea invisible but still focusable
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    textArea.style.opacity = "0";
    textArea.setAttribute("readonly", ""); // Prevent keyboard on mobile

    document.body.appendChild(textArea);

    // iOS specific handling
    if (isIOS() || /iphone|ipad|ipod/i.test(navigator.userAgent)) {
      const range = document.createRange();
      range.selectNodeContents(textArea);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textArea.setSelectionRange(0, 999999);
    } else {
      textArea.focus();
      textArea.select();
    }

    const successful = document.execCommand("copy");
    textArea.remove();

    if (successful) {
      return { success: true };
    }

    // If execCommand failed, indicate we need to show a prompt
    return { success: false, showPrompt: true };
  } catch (error) {
    console.error("Clipboard error:", error);
    return { success: false, showPrompt: true };
  }
}

// ============================================
// SHARE - For sharing trips, events, etc.
// ============================================

export async function shareContent(
  title: string,
  text: string,
  url?: string
): Promise<boolean> {
  try {
    if (isNative()) {
      await Share.share({ title, text, url });
      return true;
    } else if (navigator.share) {
      await navigator.share({ title, text, url });
      return true;
    } else {
      // Fallback: copy to clipboard using our robust method
      const shareText = url || text;
      const result = await copyToClipboard(shareText);
      return result.success;
    }
  } catch (error) {
    // User cancelled share or share failed
    console.error("Share error:", error);
    return false;
  }
}

// ============================================
// HAPTICS - For button feedback
// ============================================

export async function hapticFeedback(
  style: "light" | "medium" | "heavy" = "medium"
) {
  if (!isNative()) return;

  try {
    const impactStyle = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };

    await Haptics.impact({ style: impactStyle[style] });
  } catch (error) {
    // Haptics may not be available on all devices
  }
}

export async function hapticNotification(
  type: "success" | "warning" | "error" = "success"
) {
  if (!isNative()) return;

  try {
    const notificationTypes: Record<string, NotificationType> = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };

    await Haptics.notification({ type: notificationTypes[type] });
  } catch (error) {
    // Haptics may not be available on all devices
  }
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================

export async function registerPushNotifications(): Promise<string | null> {
  if (!isNative()) return null;

  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== "granted") {
      return null;
    }

    await PushNotifications.register();

    // Get the token
    return new Promise((resolve) => {
      PushNotifications.addListener("registration", (token) => {
        resolve(token.value);
      });

      PushNotifications.addListener("registrationError", () => {
        resolve(null);
      });
    });
  } catch (error) {
    console.error("Push notification error:", error);
    return null;
  }
}

export function onPushNotification(
  callback: (notification: { title?: string; body?: string; data?: unknown }) => void
): () => void {
  if (!isNative()) return () => {};

  let listenerHandle: PluginListenerHandle | null = null;

  PushNotifications.addListener("pushNotificationReceived", callback).then(
    (handle) => {
      listenerHandle = handle;
    }
  );

  return () => {
    listenerHandle?.remove();
  };
}

export function onPushNotificationTap(
  callback: (notification: { title?: string; body?: string; data?: unknown }) => void
): () => void {
  if (!isNative()) return () => {};

  let listenerHandle: PluginListenerHandle | null = null;

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    callback(action.notification);
  }).then((handle) => {
    listenerHandle = handle;
  });

  return () => {
    listenerHandle?.remove();
  };
}

// ============================================
// STATUS BAR
// ============================================

export async function setStatusBarStyle(dark: boolean = true) {
  if (!isNative()) return;

  try {
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
  } catch (error) {
    // Status bar not available
  }
}

export async function setStatusBarColor(color: string) {
  if (!isNative() || !isAndroid()) return;

  try {
    await StatusBar.setBackgroundColor({ color });
  } catch (error) {
    // Status bar color not available
  }
}

export async function hideStatusBar() {
  if (!isNative()) return;

  try {
    await StatusBar.hide();
  } catch (error) {
    // Status bar not available
  }
}

export async function showStatusBar() {
  if (!isNative()) return;

  try {
    await StatusBar.show();
  } catch (error) {
    // Status bar not available
  }
}

// ============================================
// APP STATE & LIFECYCLE
// ============================================

export function onAppStateChange(callback: (isActive: boolean) => void): () => void {
  if (!isNative()) return () => {};

  let listenerHandle: PluginListenerHandle | null = null;

  App.addListener("appStateChange", ({ isActive }) => {
    callback(isActive);
  }).then((handle) => {
    listenerHandle = handle;
  });

  return () => {
    listenerHandle?.remove();
  };
}

export function onBackButton(callback: () => void): () => void {
  if (!isNative() || !isAndroid()) return () => {};

  let listenerHandle: PluginListenerHandle | null = null;

  App.addListener("backButton", callback).then((handle) => {
    listenerHandle = handle;
  });

  return () => {
    listenerHandle?.remove();
  };
}

// ============================================
// DEEP LINKING
// ============================================

export function onDeepLink(callback: (url: string) => void): () => void {
  if (!isNative()) return () => {};

  let listenerHandle: PluginListenerHandle | null = null;

  App.addListener("appUrlOpen", ({ url }) => {
    callback(url);
  }).then((handle) => {
    listenerHandle = handle;
  });

  return () => {
    listenerHandle?.remove();
  };
}

// ============================================
// BROWSER - Open external links
// ============================================

export async function openInBrowser(url: string) {
  try {
    if (isNative()) {
      await Browser.open({ url });
    } else {
      window.open(url, "_blank");
    }
  } catch (error) {
    console.error("Browser error:", error);
    window.open(url, "_blank");
  }
}

export async function closeBrowser() {
  if (!isNative()) return;

  try {
    await Browser.close();
  } catch (error) {
    // Browser may not be open
  }
}

// ============================================
// UTILITY: Convert photo to blob for upload
// ============================================

export async function photoToBlob(
  webPath: string
): Promise<Blob | null> {
  try {
    const response = await fetch(webPath);
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error("Photo conversion error:", error);
    return null;
  }
}
