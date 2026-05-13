import { BRAND } from "./brand-tokens";

type LogoProps = {
  className?: string;
  showWordmark?: boolean;
  size?: number;
};

export function Logo({ className, showWordmark = true, size = 40 }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={BRAND.companyName}
        role="img"
      >
        <defs>
          <linearGradient id="logo-leaf" x1="14" y1="6" x2="50" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="oklch(0.86 0.18 145)" />
            <stop offset="100%" stopColor="oklch(0.55 0.18 145)" />
          </linearGradient>
          <linearGradient id="logo-stem" x1="30" y1="34" x2="34" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="oklch(0.6 0.15 145)" />
            <stop offset="100%" stopColor="oklch(0.4 0.12 145)" />
          </linearGradient>
        </defs>
        <path
          d="M32 6c8 0 18 6 18 18 0 12-10 18-18 18S14 36 14 24c0-12 10-18 18-18z"
          fill="url(#logo-leaf)"
        />
        <path
          d="M22 24c4-6 10-10 18-12-2 10-6 16-10 20-3 3-7 5-10 4-1 0-2-1-2-3 0-3 1-6 4-9z"
          fill="oklch(0.96 0.04 145)"
          opacity="0.18"
        />
        <path
          d="M32 24v32"
          stroke="url(#logo-stem)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="32" cy="22" r="3" fill="oklch(0.88 0.18 92)" />
      </svg>
      {showWordmark ? (
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Gartengestaltung
          </span>
          <span className="text-base font-bold tracking-tight text-gradient-primary">
            Gaigg
          </span>
        </div>
      ) : null}
    </div>
  );
}
