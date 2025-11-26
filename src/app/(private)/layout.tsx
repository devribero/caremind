"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/shared/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { FullScreenLoader } from "@/components/features/FullScreenLoader";
import { IdosoProvider } from "@/contexts/IdosoContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { Waves } from "@/components/shared/Waves";

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/(auth)/auth");
    }
  }, [loading, user, router]);

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) return null;

  return (
    <ProfileProvider>
      <IdosoProvider>
        <Waves />
        <AppLayout>{children}</AppLayout>
      </IdosoProvider>
    </ProfileProvider>
  );
}
