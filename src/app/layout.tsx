import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { ToastContainer } from "@/components/features/Toast";
import { DevUnhandledRejectionLogger } from "@/components/shared/DevUnhandledRejectionLogger";
// PWA DESATIVADO - Não remover, apenas comentado para futura reativação
// import PWAInstallPrompt from '@/components/features/InstallPWA';
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css";

export const metadata: Metadata = {
  title: "CareMind",
  description: "Assistente virtual para auxiliar idosos no gerenciamento de medicações e rotinas diárias.",
  icons: {
    icon: "/icons/logo_coracao.png",
    apple: "/icons/logo_coracao.png",
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
        {/* PWA DESATIVADO - Não remover, apenas comentado para futura reativação */}
        {/* <link rel="manifest" href="/manifest.json" /> */}
        <link rel="icon" href="/icons/logo_coracao.png" />
        <link rel="apple-touch-icon" href="/icons/logo_coracao.png" />
        <meta name="theme-color" content="#0400BA" />
        {/* Script para desregistrar Service Worker antigo do PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (let registration of registrations) {
                    registration.unregister().then(function() {
                      console.log('[SW] Service Worker desregistrado com sucesso');
                    });
                  }
                });
                // Limpar caches do PWA
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    for (let name of names) {
                      caches.delete(name);
                      console.log('[SW] Cache deletado:', name);
                    }
                  });
                }
              }
            `,
          }}
        />
      </head>

      <body suppressHydrationWarning={true}>
        <AuthProvider>
          <LoadingProvider>
            <AccessibilityProvider>
              <DevUnhandledRejectionLogger />
              {children}
              <SpeedInsights />
              <Analytics />
              {/* PWA DESATIVADO - Não remover, apenas comentado para futura reativação */}
              {/* <PWAInstallPrompt /> */}
            </AccessibilityProvider>
          </LoadingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
