"use client";

import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues with localStorage and window
const InstallAppModal = dynamic(
  () => import("./install-app-modal").then((mod) => mod.InstallAppModal),
  { ssr: false }
);

interface InstallAppModalWrapperProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export function InstallAppModalWrapper({ forceShow, onClose }: InstallAppModalWrapperProps) {
  return <InstallAppModal forceShow={forceShow} onClose={onClose} />;
}

export default InstallAppModalWrapper;
