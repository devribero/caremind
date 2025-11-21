import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { ToastContainer } from "@/components/features/Toast";
import { DevUnhandledRejectionLogger } from "@/components/shared/DevUnhandledRejectionLogger";
import PWAInstallPrompt from '@/components/features/InstallPWA';
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css";

export const metadata: Metadata = {
  title: "CareMind",
  description: "Assistente virtual para auxiliar idosos no gerenciamento de medicações e rotinas diárias.",
  icons: {
    icon: "/icons/logo_coracao_rounded.png",
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
        <link rel="icon" href="/icons/logo_coracao_rounded.png" />
        <meta name="theme-color" content="#0400BA" />
      </head>

      <body suppressHydrationWarning={true}>
        <AuthProvider>
          <LoadingProvider>
            <AccessibilityProvider>
              <DevUnhandledRejectionLogger />
              {children}
              <SpeedInsights />
              <Analytics />
              <PWAInstallPrompt />
            </AccessibilityProvider>
          </LoadingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
