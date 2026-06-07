interface Props {
  size?: number;
  className?: string;
  color?: string;
}

/** Minimal 3-stroke pig head (snout circle + two ears) */
export function PigLogo({ size = 48, className, color = "currentColor" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke={color}
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Jumpuk"
    >
      {/* Stroke 1: left ear triangle flick */}
      <path d="M16 22 L20 12 L26 20" />
      {/* Stroke 2: right ear triangle flick */}
      <path d="M48 22 L44 12 L38 20" />
      {/* Stroke 3: round snout / face with two nostril dots */}
      <path d="M14 34 a18 14 0 1 0 36 0 a18 14 0 1 0 -36 0" />
      <circle cx="27" cy="36" r="1.6" fill={color} stroke="none" />
      <circle cx="37" cy="36" r="1.6" fill={color} stroke="none" />
    </svg>
  );
}
