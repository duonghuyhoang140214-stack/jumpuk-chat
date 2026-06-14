import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      { title: "Jumpuk Chat — Nhắn tin & gọi online cực dễ thương" },
      { name: "description", content: "Jumpuk Chat: nhắn tin, gọi online, gửi ảnh/video/voice với bạn bè qua ID 7 số." },
      { name: "theme-color", content: "#ff6fa3" },
      { property: "og:title", content: "Jumpuk Chat — Nhắn tin & gọi online cực dễ thương" },
      { name: "twitter:title", content: "Jumpuk Chat — Nhắn tin & gọi online cực dễ thương" },
      { property: "og:description", content: "Jumpuk Chat: nhắn tin, gọi online, gửi ảnh/video/voice với bạn bè qua ID 7 số." },
      { name: "twitter:description", content: "Jumpuk Chat: nhắn tin, gọi online, gửi ảnh/video/voice với bạn bè qua ID 7 số." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/522ddd29-0c9b-4cd7-9638-e23beba4316c/id-preview-1514697f--80d7148b-7f2b-484f-9d69-f163065953e1.lovable.app-1781076712814.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/522ddd29-0c9b-4cd7-9638-e23beba4316c/id-preview-1514697f--80d7148b-7f2b-484f-9d69-f163065953e1.lovable.app-1781076712814.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&family=Nunito:wght@400;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-8 text-center">
      <div>
        <h1 className="text-4xl font-bold text-primary">404</h1>
        <p className="mt-2 text-muted-foreground">Không tìm thấy trang.</p>
        <a href="/" className="mt-4 inline-block rounded-full bg-primary px-6 py-2 text-primary-foreground">Về trang chính</a>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
