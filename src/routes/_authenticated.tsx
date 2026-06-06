import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { PigLogo } from "@/components/PigLogo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Protected,
});

function Protected() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PigLogo size={80} className="animate-bounce" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <Outlet />;
}
