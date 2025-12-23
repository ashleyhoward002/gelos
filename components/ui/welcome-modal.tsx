"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface WelcomeModalProps {
  userName?: string;
}

export function WelcomeModal({ userName }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Check if user has seen the welcome modal
    const hasSeenWelcome = localStorage.getItem("gelos_welcome_seen");
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  function handleClose() {
    localStorage.setItem("gelos_welcome_seen", "true");
    setIsOpen(false);
  }

  function handleNext() {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  }

  if (!isOpen) return null;

  const steps = [
    {
      title: `Welcome to Gelos${userName ? `, ${userName}` : ""}!`,
      description: "Your new home for coordinating with friends, family, and any group you care about.",
      icon: (
        <div className="w-16 h-16 bg-neon-purple/10 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      ),
    },
    {
      title: "Set Up Your Profile",
      description: "Add your contact info and choose what to share with group members. They'll be able to reach you easier!",
      icon: (
        <div className="w-16 h-16 bg-electric-cyan/10 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-electric-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      ),
      action: (
        <Link
          href="/profile"
          onClick={handleClose}
          className="btn-outline text-sm py-2 px-4"
        >
          Edit Profile
        </Link>
      ),
    },
    {
      title: "Create or Join a Group",
      description: "Start a new group or accept an invite to join an existing one. You're all set!",
      icon: (
        <div className="w-16 h-16 bg-cosmic-green/10 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-cosmic-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      ),
      action: (
        <Link
          href="/groups/new"
          onClick={handleClose}
          className="btn-outline text-sm py-2 px-4"
        >
          Create Group
        </Link>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
        <div className="p-6 text-center">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-2 text-slate-medium hover:text-slate-dark hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? "bg-neon-purple" : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="flex flex-col items-center">
            {currentStep.icon}
            <h2 className="text-xl font-heading font-semibold text-slate-dark mb-2">
              {currentStep.title}
            </h2>
            <p className="text-slate-medium mb-6">
              {currentStep.description}
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              {currentStep.action}
              <button
                onClick={handleNext}
                className="btn-primary text-sm py-2 px-6"
              >
                {step < 2 ? "Next" : "Get Started"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeModal;
