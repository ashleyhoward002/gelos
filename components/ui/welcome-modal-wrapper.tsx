"use client";

import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues with localStorage
const WelcomeModal = dynamic(
  () => import("./welcome-modal").then((mod) => mod.WelcomeModal),
  { ssr: false }
);

interface WelcomeModalWrapperProps {
  userName?: string;
}

export function WelcomeModalWrapper({ userName }: WelcomeModalWrapperProps) {
  return <WelcomeModal userName={userName} />;
}

export default WelcomeModalWrapper;
