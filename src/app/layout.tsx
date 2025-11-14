import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { Waves } from "@/components/Waves";
import { ToastContainer } from "@/components/Toast";
import { DevUnhandledRejectionLogger } from "@/components/DevUnhandledRejectionLogger";
import PWAInstallPrompt from '@/components/InstallPWA';
import "./globals.css";

export const metadata: Metadata = {
  title: "CareMind",
  description: "Assistente virtual para auxiliar idosos no gerenciamento de medicações e rotinas diárias.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo_coracao.png" />
        <meta name="theme-color" content="#0400BA" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>

      <body suppressHydrationWarning={true}>
        <AuthProvider>
          <LoadingProvider>
            <ProfileProvider>
              <DevUnhandledRejectionLogger />
              {children}
              <Waves />
              <PWAInstallPrompt />
              <ToastContainer />
            </ProfileProvider>
          </LoadingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
