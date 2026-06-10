import { Link, useRouterState } from "@tanstack/react-router";
import { ChatIcon, UserPlusIcon, UserIcon } from "@/components/icons";

const items = [
  { to: "/app", icon: ChatIcon, label: "Tin nhắn" },
  { to: "/app/friends", icon: UserPlusIcon, label: "Bạn bè" },
  { to: "/app/profile", icon: UserIcon, label: "Hồ sơ" },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 safe-bottom pointer-events-none">
      <div className="mx-auto max-w-md px-4 pb-2 pointer-events-auto">
        <div className="glass-strong rounded-[28px] border border-border/60 shadow-card flex items-stretch justify-around px-2 py-1.5">
          {items.map(({ to, icon: Icon, label }) => {
            const isActive = to === "/app" ? pathname === "/app" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1 pressable tap-ring"
              >
                <span
                  className={`flex h-9 min-w-14 items-center justify-center rounded-2xl transition-all duration-200 ${
                    isActive ? "bg-gradient-pink text-primary-foreground shadow-pink scale-105" : "text-muted-foreground"
                  }`}
                >
                  <Icon size={22} />
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
