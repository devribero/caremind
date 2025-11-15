import React from "react";
import { Waves } from "@/components/shared/Waves";
import { Footer } from "@/components/shared/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Waves />
      <main>{children}</main>
      <Footer />
    </>
  );
}
