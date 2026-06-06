interface Props {
  size?: number;
  className?: string;
}

export function PigLogo({ size = 64, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-label="Jumpuk pig"
    >
      <defs>
        <radialGradient id="pigBody" cx="50%" cy="40%">
          <stop offset="0%" stopColor="oklch(0.92 0.1 350)" />
          <stop offset="100%" stopColor="oklch(0.78 0.18 0)" />
        </radialGradient>
      </defs>
      {/* ears */}
      <path d="M22 28 Q18 12 32 22 Z" fill="oklch(0.75 0.2 0)" />
      <path d="M78 28 Q82 12 68 22 Z" fill="oklch(0.75 0.2 0)" />
      {/* head */}
      <ellipse cx="50" cy="55" rx="34" ry="30" fill="url(#pigBody)" />
      {/* snout */}
      <ellipse cx="50" cy="63" rx="16" ry="12" fill="oklch(0.85 0.14 0)" />
      <circle cx="44" cy="63" r="2.5" fill="oklch(0.4 0.12 350)" />
      <circle cx="56" cy="63" r="2.5" fill="oklch(0.4 0.12 350)" />
      {/* eyes */}
      <circle cx="38" cy="48" r="3.5" fill="oklch(0.2 0.05 350)" />
      <circle cx="62" cy="48" r="3.5" fill="oklch(0.2 0.05 350)" />
      <circle cx="39" cy="47" r="1.2" fill="white" />
      <circle cx="63" cy="47" r="1.2" fill="white" />
      {/* cheeks */}
      <circle cx="30" cy="60" r="3.5" fill="oklch(0.78 0.18 10 / 0.5)" />
      <circle cx="70" cy="60" r="3.5" fill="oklch(0.78 0.18 10 / 0.5)" />
      {/* smile */}
      <path d="M44 72 Q50 76 56 72" stroke="oklch(0.4 0.12 350)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
