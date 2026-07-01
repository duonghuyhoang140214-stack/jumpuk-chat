import { Link, useRouterState } from "@tanstack/react-router";
import { ChatIcon, UserPlusIcon, UserIcon, CompassIcon, PlusIcon } from "@/components/icons";

const items = [
  { to: "/app", icon: ChatIcon, label: "Tin nhắn" },
  { to: "/app/friends", icon: UserPlusIcon, label: "Bạn bè" },
  { to: "/app/post-story", icon: PlusIcon, label: "Đăng", accent: true },
  { to: "/app/stories", icon: CompassIcon, label: "Lướt" },
  { to: "/app/profile", icon: UserIcon, label: "Hồ sơ" },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 safe-bottom pointer-events-none">
      <div className="mx-auto max-w-md px-3 pb-2 pointer-events-auto">
        <div className="glass-strong rounded-[28px] border border-border/60 shadow-card flex items-stretch justify-around px-1.5 py-1.5">
          {items.map(({ to, icon: Icon, label, accent }: any) => {
            const isActive = to === "/app" ? pathname === "/app" : pathname.startsWith(to);
            if (accent) {
              return (
                <Link
                  key={to}
                  to={to}
                  className="relative flex flex-col items-center justify-end px-1 pressable"
                  aria-label={label}
                >
                  <span className="-mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-pink text-primary-foreground shadow-pink ring-4 ring-background">
                    <Icon size={26} />
                  </span>
                  <span className="text-[10px] font-bold text-primary mt-0.5">{label}</span>
                </Link>
              );
            }
            return (
              <Link
                key={to}
                to={to}
                className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1 pressable tap-ring"
              >
                <span
                  className={`flex h-8 min-w-12 items-center justify-center rounded-xl transition-all duration-200 ${
                    isActive ? "bg-gradient-pink text-primary-foreground shadow-pink scale-105" : "text-muted-foreground"
                  }`}
                >
                  <Icon size={20} />
                </span>
                <span className={`text-[10px] font-bold tracking-tight ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
