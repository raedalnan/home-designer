import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default {
  root: "src/",
  publicDir: "../public/",
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    open: !("SANDBOX_URL" in process.env || "CODESANDBOX_HOST" in process.env),
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    sourcemap: true,
  },
};
