import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  linkTo?: string;
  className?: string;
}

const sizes = {
  sm: { icon: 32, text: "text-xl" },
  md: { icon: 40, text: "text-2xl" },
  lg: { icon: 56, text: "text-3xl" },
};

export function Logo({
  size = "md",
  showText = true,
  linkTo,
  className = "",
}: LogoProps) {
  const { icon, text } = sizes[size];

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/icons/icon-192x192.png"
        alt="Gelos"
        width={icon}
        height={icon}
        className="rounded-full"
        priority
      />
      {showText && (
        <span className={`font-heading font-bold text-neon-purple ${text}`}>
          Gelos
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

export default Logo;
