// @ts-nocheck
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
        "next/navigation": path.resolve(
          __dirname,
          "src/compat/next-navigation.ts",
        ),
        "next/link": path.resolve(__dirname, "src/compat/next-link.tsx"),
        "next/image": path.resolve(__dirname, "src/compat/next-image.tsx"),
        "next/dynamic": path.resolve(__dirname, "src/compat/next-dynamic.tsx"),
        "next/script": path.resolve(__dirname, "src/compat/next-script.tsx"),
        "next/font/local": path.resolve(
          __dirname,
          "src/compat/next-font-local.ts",
        ),
      },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV || mode),
      "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(
        env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || "",
      ),
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "",
      ),
      "process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID": JSON.stringify(
        env.NEXT_PUBLIC_RAZORPAY_KEY_ID || env.VITE_RAZORPAY_KEY_ID || "",
      ),
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:8080",
          changeOrigin: true,
          rewrite: (path) => {
            if (path.startsWith("/api/v1")) {
              return path;
            }

            if (path.startsWith("/api/auth/signup")) {
              return path.replace("/api/auth/signup", "/api/v1/auth/signup");
            }

            if (path.startsWith("/api/auth/signout")) {
              return path.replace("/api/auth/signout", "/api/v1/auth/signout");
            }

            return path.replace(/^\/api/, "/api/v1");
          },
        },
      },
    },
  };
});
