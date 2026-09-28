import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 é um módulo nativo (binário compilado): impedimos que o
  // bundler tente empacotá-lo e deixamos o Node.js carregá-lo diretamente.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
