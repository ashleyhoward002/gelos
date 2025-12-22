"use client";

import {
  ContactInfo,
  whatsappLink,
  instagramLink,
  snapchatLink,
  phoneCallLink,
  smsLink,
  emailLink,
  hasAnyContactInfo,
} from "@/lib/contact-links";

interface ContactButtonsProps {
  contact: ContactInfo;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  compact?: boolean;
  className?: string;
}

const sizes = {
  sm: { button: "w-8 h-8", icon: "w-4 h-4", text: "text-xs" },
  md: { button: "w-10 h-10", icon: "w-5 h-5", text: "text-sm" },
  lg: { button: "w-12 h-12", icon: "w-6 h-6", text: "text-base" },
};

export function ContactButtons({
  contact,
  size = "md",
  showLabels = false,
  compact = false,
  className = "",
}: ContactButtonsProps) {
  const { button, icon, text } = sizes[size];

  if (!hasAnyContactInfo(contact)) {
    return null;
  }

  const buttonClass = compact
    ? `${button} rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95`
    : `${button} min-w-[44px] rounded-xl flex items-center justify-center gap-2 px-3 transition-all hover:scale-105 active:scale-95`;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Phone Call */}
      {contact.phone && (
        <a
          href={phoneCallLink(contact.phone)}
          className={`${buttonClass} bg-electric-cyan/10 text-electric-cyan hover:bg-electric-cyan hover:text-white`}
          title="Call"
        >
          <svg className={icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          {showLabels && !compact && <span className={text}>Call</span>}
        </a>
      )}

      {/* SMS */}
      {contact.phone && (
        <a
          href={smsLink(contact.phone)}
          className={`${buttonClass} bg-electric-cyan/10 text-electric-cyan hover:bg-electric-cyan hover:text-white`}
          title="Text"
        >
          <svg className={icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {showLabels && !compact && <span className={text}>Text</span>}
        </a>
      )}

      {/* WhatsApp */}
      {contact.whatsapp && (
        <a
          href={whatsappLink(contact.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonClass} text-white hover:opacity-90`}
          style={{ backgroundColor: "#25D366" }}
          title="WhatsApp"
        >
          <svg className={icon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          {showLabels && !compact && <span className={text}>WhatsApp</span>}
        </a>
      )}

      {/* Email */}
      {contact.email && (
        <a
          href={emailLink(contact.email)}
          className={`${buttonClass} bg-electric-cyan/10 text-electric-cyan hover:bg-electric-cyan hover:text-white`}
          title="Email"
        >
          <svg className={icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          {showLabels && !compact && <span className={text}>Email</span>}
        </a>
      )}

      {/* Instagram */}
      {contact.instagram && (
        <a
          href={instagramLink(contact.instagram)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonClass} text-white hover:opacity-90`}
          style={{
            background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
          }}
          title="Instagram"
        >
          <svg className={icon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
          {showLabels && !compact && <span className={text}>Instagram</span>}
        </a>
      )}

      {/* Snapchat */}
      {contact.snapchat && (
        <a
          href={snapchatLink(contact.snapchat)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonClass} hover:opacity-90`}
          style={{ backgroundColor: "#FFFC00", color: "#000" }}
          title="Snapchat"
        >
          <svg className={icon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-.809-.315-1.212-.705-1.212-1.154 0-.36.284-.69.733-.838.165-.061.344-.09.524-.09.12 0 .284.015.465.104.36.18.719.285 1.018.285.204 0 .344-.045.419-.089-.007-.165-.019-.33-.03-.51l-.003-.06c-.104-1.628-.229-3.654.3-4.847 1.582-3.545 4.939-3.821 5.929-3.821h.359z" />
          </svg>
          {showLabels && !compact && <span className={text}>Snapchat</span>}
        </a>
      )}
    </div>
  );
}

// Compact icon-only version for tight spaces
export function ContactIconsCompact({
  contact,
  className = "",
}: {
  contact: ContactInfo;
  className?: string;
}) {
  return <ContactButtons contact={contact} size="sm" compact className={className} />;
}

export default ContactButtons;
