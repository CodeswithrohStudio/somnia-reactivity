import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      // Some viem/wagmi deps expect Node.js globals
      process: "process/browser",
    },
  },
  optimizeDeps: {
    include: ["@somnia-chain/reactivity"],
  },
});
