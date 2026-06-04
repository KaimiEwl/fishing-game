import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  build: {
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");
          if (!normalizedId.includes("/node_modules/")) return undefined;

          if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom|@tanstack[\\/]react-query)[\\/]/.test(normalizedId)) {
            return "vendor-react";
          }

          if (/[\\/]node_modules[\\/](@rainbow-me|@reown|@walletconnect|@coinbase|@metamask|@safe-global|wagmi|viem|abitype|ox)[\\/]/.test(normalizedId)) {
            return "vendor-wallet";
          }

          if (/[\\/]node_modules[\\/](@radix-ui|lucide-react|class-variance-authority|clsx|cmdk|tailwind-merge|vaul)[\\/]/.test(normalizedId)) {
            return "vendor-ui";
          }

          if (/[\\/]node_modules[\\/](date-fns|embla-carousel-react|react-day-picker|recharts)[\\/]/.test(normalizedId)) {
            return "vendor-tools";
          }

          return "vendor";
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
