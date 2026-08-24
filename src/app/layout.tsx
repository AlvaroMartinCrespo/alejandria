import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: { default: "Alejandría", template: "%s | Alejandría" },
  description: "Alejandría: tu biblioteca personal para organizar cada lectura",
  applicationName: "Alejandría",
  appleWebApp: { capable: true, title: "Alejandría", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#b8f34a",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body><PwaRegister /><AppShell>{children}</AppShell></body>
    </html>
  );
}
