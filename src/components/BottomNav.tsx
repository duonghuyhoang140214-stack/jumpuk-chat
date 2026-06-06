import { Link, useRouterState } from "@tanstack/react-router";
import { ChatIcon, UserPlusIcon, UserIcon } from "@/components/icons";

const items = [
  { to: "/app", icon: ChatIcon, label: "Chat" },
  { to: "/app/friends", icon: UserPlusIcon, label: "Bạn bè" },
  { to: "/app/profile", icon: UserIcon, label: "Hồ sơ" },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-md justify-around px-2 py-2">
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/app" && pathname.startsWith(to));
          const isExact = to === "/app" && pathname === "/app";
          const isActive = isExact || (to !== "/app" && active);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-5 py-1.5 transition ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon size={24} />
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
