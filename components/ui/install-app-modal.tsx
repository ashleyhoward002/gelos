"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Step = "device" | "iphone" | "android";

interface InstallAppModalProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export function InstallAppModal({ forceShow = false, onClose }: InstallAppModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("device");

  useEffect(() => {
    // If force showing (from settings), always show
    if (forceShow) {
      setIsOpen(true);
      return;
    }

    // Check if already running as PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return; // Already installed, don't show
    }

    // Check if user has already seen/dismissed the modal
    const hasSeenInstallPrompt = localStorage.getItem("gelos_install_prompt_seen");
    if (hasSeenInstallPrompt) {
      return;
    }

    // Check if this is a new user (first login)
    const isFirstLogin = localStorage.getItem("gelos_first_login_complete") !== "true";
    if (isFirstLogin) {
      // Small delay to let the welcome modal show first if applicable
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  function handleClose() {
    localStorage.setItem("gelos_install_prompt_seen", "true");
    localStorage.setItem("gelos_first_login_complete", "true");
    setIsOpen(false);
    setStep("device");
    onClose?.();
  }

  function handleDeviceSelect(device: "iphone" | "android") {
    setStep(device);
  }

  function handleBack() {
    setStep("device");
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {step === "device" && (
            <DeviceSelectionStep
              onSelect={handleDeviceSelect}
              onSkip={handleClose}
            />
          )}
          {step === "iphone" && (
            <IPhoneInstructionsStep onDone={handleClose} onBack={handleBack} />
          )}
          {step === "android" && (
            <AndroidInstructionsStep onDone={handleClose} onBack={handleBack} />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Device Selection Step
function DeviceSelectionStep({
  onSelect,
  onSkip,
}: {
  onSelect: (device: "iphone" | "android") => void;
  onSkip: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <div className="w-16 h-16 bg-electric-cyan/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">📱</span>
      </div>
      <h2 className="text-xl font-heading font-semibold text-slate-dark mb-2">
        Install Gelos on Your Phone
      </h2>
      <p className="text-slate-medium mb-6">
        Get the full app experience - add Gelos to your home screen for quick access!
      </p>

      <p className="text-sm font-medium text-slate-dark mb-4">
        What device are you using?
      </p>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => onSelect("iphone")}
          className="flex-1 p-4 rounded-xl border-2 border-gray-200 hover:border-electric-cyan hover:bg-electric-cyan/5 transition-all group"
        >
          <span className="text-4xl block mb-2">🍎</span>
          <span className="font-medium text-slate-dark group-hover:text-electric-cyan transition-colors">
            iPhone
          </span>
        </button>
        <button
          onClick={() => onSelect("android")}
          className="flex-1 p-4 rounded-xl border-2 border-gray-200 hover:border-electric-cyan hover:bg-electric-cyan/5 transition-all group"
        >
          <span className="text-4xl block mb-2">🤖</span>
          <span className="font-medium text-slate-dark group-hover:text-electric-cyan transition-colors">
            Android
          </span>
        </button>
      </div>

      <button
        onClick={onSkip}
        className="text-slate-medium hover:text-slate-dark transition-colors text-sm"
      >
        Skip for now
      </button>
    </div>
  );
}

// iPhone Instructions Step
function IPhoneInstructionsStep({
  onDone,
  onBack,
}: {
  onDone: () => void;
  onBack: () => void;
}) {
  return (
    <div className="p-6">
      <button
        onClick={onBack}
        className="flex items-center text-slate-medium hover:text-slate-dark transition-colors mb-4"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-electric-cyan/10 rounded-xl flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">🍎</span>
        </div>
        <h2 className="text-xl font-heading font-semibold text-slate-dark">
          Add to Home Screen
        </h2>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-electric-cyan text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
            1
          </div>
          <div>
            <p className="font-medium text-slate-dark">Tap the Share button at the bottom</p>
            <div className="mt-2 inline-flex items-center justify-center w-10 h-10 bg-white rounded-lg border border-gray-200">
              <svg className="w-5 h-5 text-electric-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-electric-cyan text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
            2
          </div>
          <div>
            <p className="font-medium text-slate-dark">Scroll down and tap</p>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
              <svg className="w-5 h-5 text-slate-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">Add to Home Screen</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-electric-cyan text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
            3
          </div>
          <div>
            <p className="font-medium text-slate-dark">Tap "Add" in the top right</p>
          </div>
        </div>
      </div>

      <button onClick={onDone} className="btn-primary w-full">
        Got it!
      </button>
    </div>
  );
}

// Android Instructions Step
function AndroidInstructionsStep({
  onDone,
  onBack,
}: {
  onDone: () => void;
  onBack: () => void;
}) {
  return (
    <div className="p-6">
      <button
        onClick={onBack}
        className="flex items-center text-slate-medium hover:text-slate-dark transition-colors mb-4"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-cosmic-green/10 rounded-xl flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">🤖</span>
        </div>
        <h2 className="text-xl font-heading font-semibold text-slate-dark">
          Add to Home Screen
        </h2>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-cosmic-green text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
            1
          </div>
          <div>
            <p className="font-medium text-slate-dark">Tap the menu icon in the top right</p>
            <div className="mt-2 inline-flex items-center justify-center w-10 h-10 bg-white rounded-lg border border-gray-200">
              <svg className="w-5 h-5 text-slate-dark" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-cosmic-green text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
            2
          </div>
          <div>
            <p className="font-medium text-slate-dark">Tap "Add to Home Screen" or "Install App"</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-cosmic-green text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
            3
          </div>
          <div>
            <p className="font-medium text-slate-dark">Tap "Add" or "Install"</p>
          </div>
        </div>
      </div>

      <button onClick={onDone} className="btn-primary w-full">
        Got it!
      </button>
    </div>
  );
}

export default InstallAppModal;
