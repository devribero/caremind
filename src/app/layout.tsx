import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { Waves } from "@/components/Waves";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareMind",
  description: "Assistente virtual para auxiliar idosos no gerenciamento de medicações e rotinas diárias.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <LoadingProvider>
            <ProfileProvider>
              <Waves />
              {children}
            </ProfileProvider>
          </LoadingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
