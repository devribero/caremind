"use client";

import { Footer } from "@/components/Footer";

export default function PoliticaPrivacidadePage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <section style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", color: "#0b0b2e" }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, margin: 0 }}>Política de Privacidade</h1>
          <p style={{ marginTop: 12, color: "#2d3748" }}>Documento de privacidade em preparação.</p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
