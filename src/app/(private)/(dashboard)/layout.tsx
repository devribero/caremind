"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/shared/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { FullScreenLoader } from "@/components/features/FullScreenLoader";
import { IdosoProvider } from "@/contexts/IdosoContext";
import { useProfile } from "@/contexts/ProfileContext";
import { Waves } from "@/components/shared/Waves";

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { profile } = useProfile();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [loading, user, router]);

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) return null;

  const accountType = (profile?.tipo || user.user_metadata?.account_type)?.toLowerCase();
  // Sempre envolve com IdosoProvider para garantir que componentes que usam useIdoso tenham contexto,
  // mesmo quando a conta não for familiar (o provider já trata esse caso internamente).
  return (
    <IdosoProvider>
      <Waves />
      <AppLayout>{children}</AppLayout>
    </IdosoProvider>
  );
}
