/* Custom hand-drawn SVG icon set for Jumpuk Chat */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 24): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const SendIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M3 12L21 4l-7 17-3-8-8-1z" fill="currentColor" stroke="none" />
  </svg>
);
export const MicIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
export const PhoneIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z" fill="currentColor" stroke="none" />
  </svg>
);
export const ImageIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10" r="2" fill="currentColor" stroke="none" />
    <path d="M3 17l5-5 4 4 3-3 6 6" />
  </svg>
);
export const VideoIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="2" y="6" width="14" height="12" rx="3" />
    <path d="M16 10l6-3v10l-6-3z" fill="currentColor" />
  </svg>
);
export const PlayIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none" />
  </svg>
);
export const HeartIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" fill="currentColor" stroke="none" />
  </svg>
);
export const BombIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="11" cy="14" r="7" fill="currentColor" stroke="none" />
    <path d="M16 9l3-3M19 6l-1.5-1.5M19 6l1.5 1.5" />
    <circle cx="20.5" cy="4.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
export const ThumbUpIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M7 10v11h10l4-9-2-2h-6V5a2 2 0 0 0-4 0c0 3-2 5-2 5z" fill="currentColor" stroke="none" />
    <rect x="2" y="10" width="4" height="11" rx="1" />
  </svg>
);
export const ThumbDownIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M7 14V3h10l4 9-2 2h-6v6a2 2 0 0 1-4 0c0-3-2-5-2-5z" fill="currentColor" stroke="none" />
    <rect x="2" y="3" width="4" height="11" rx="1" />
  </svg>
);
export const CopyIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);
export const CloseIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6l12 12M6 18L18 6" />
  </svg>
);
export const SettingsIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
export const UserPlusIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21a7 7 0 0 1 14 0" />
    <path d="M19 8v6M16 11h6" />
  </svg>
);
export const ChatIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4V7a2 2 0 0 1 2-2z" />
  </svg>
);
export const UserIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
export const CheckIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M5 12l5 5L20 7" />
  </svg>
);
export const ArrowLeftIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);
export const PlusIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const SpeakerIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none" />
    <path d="M16 8a5 5 0 0 1 0 8" />
  </svg>
);
export const MicMuteIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    <path d="M3 3l18 18" stroke="white" strokeWidth="3" />
    <path d="M3 3l18 18" />
  </svg>
);
export const MenuIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);
export const UsersIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21a7 7 0 0 1 14 0" />
    <circle cx="17" cy="9" r="3" />
    <path d="M22 21a5 5 0 0 0-7-4.5" />
  </svg>
);
export const PenIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M14 4l6 6L9 21H3v-6z" />
  </svg>
);
export const SearchIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);
export const CompassIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9l-2 6-6 2 2-6z" fill="currentColor" stroke="none" />
  </svg>
);
export const TrashIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
);
export const CommentIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
  </svg>
);
export const ShareIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="6" cy="12" r="2.5" fill="currentColor" stroke="none" />
    <circle cx="18" cy="6" r="2.5" fill="currentColor" stroke="none" />
    <circle cx="18" cy="18" r="2.5" fill="currentColor" stroke="none" />
    <path d="M8 11l8-4M8 13l8 4" />
  </svg>
);
export const PhoneMissedIcon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z" fill="currentColor" stroke="none" />
    <path d="M15 3l6 6M21 3l-6 6" stroke="white" strokeWidth="2.5" />
  </svg>
);
