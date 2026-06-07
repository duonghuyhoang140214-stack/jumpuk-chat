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
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border glass safe-bottom">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
        {items.map(({ to, icon: Icon, label }) => {
          const isActive = to === "/app" ? pathname === "/app" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5"
            >
              <span
                className={`flex h-9 w-14 items-center justify-center rounded-2xl transition ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon size={22} />
              </span>
              <span className={`text-[10px] font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
