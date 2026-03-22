import { Instagram, Youtube, Twitter, Linkedin, Facebook } from "lucide-react";

// TikTok doesn't exist in lucide — use a simple SVG
export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.52V6.75a4.85 4.85 0 01-1.02-.06z" />
    </svg>
  );
}

export { Instagram, Youtube, Twitter, Linkedin, Facebook };

import type { Platform } from "@/types/calendar";

export function PlatformIcon({
  platform,
  className,
}: {
  platform: Platform;
  className?: string;
}) {
  switch (platform) {
    case "instagram": return <Instagram className={className} />;
    case "youtube":   return <Youtube className={className} />;
    case "tiktok":    return <TikTokIcon className={className} />;
    case "twitter":   return <Twitter className={className} />;
    case "linkedin":  return <Linkedin className={className} />;
    case "facebook":  return <Facebook className={className} />;
  }
}
