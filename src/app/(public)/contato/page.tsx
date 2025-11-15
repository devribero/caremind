"use client";

import { Footer } from "@/components/shared/Footer";

export default function ContatoPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <section style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", color: "#0b0b2e" }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, margin: 0 }}>Contato</h1>
          <p style={{ marginTop: 12, color: "#2d3748" }}>Entre em contato conosco — em breve disponibilizaremos canais diretos.</p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
