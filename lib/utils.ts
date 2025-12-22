import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// File utilities
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(fileType: string): string {
  if (fileType.startsWith("image/")) return "🖼️";
  if (fileType === "application/pdf") return "📕";
  if (fileType.includes("word")) return "📘";
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "📗";
  if (fileType === "text/plain") return "📄";
  return "📎";
}
