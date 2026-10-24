import { defineConfig } from "@playwright/test";

// This suite owns its server; it must never attach to a personal or hosted app.
const port = process.env.E2E_PORT ?? "3100";
if (!/^\d{4,5}$/.test(port) || Number(port) < 1000 || Number(port) > 65535) {
  throw new Error("E2E_PORT must be a numeric local port between 1000 and 65535.");
}
const baseURL = `http://127.0.0.1:${port}`;
const channel = process.env.E2E_BROWSER_CHANNEL;
if (channel && channel !== "chrome" && channel !== "msedge") {
  throw new Error("E2E_BROWSER_CHANNEL may only select installed chrome or msedge.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 30_000,
  reporter: "list",
  outputDir: "output/playwright",
  use: {
    baseURL,
    browserName: "chromium",
    ...(channel ? { channel } : {}),
    viewport: { width: 1440, height: 1000 },
    locale: "tr-TR",
    colorScheme: "dark",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_APP_URL: baseURL,
      NEXT_PUBLIC_ENABLE_ANALYTICS: "false",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      GOOGLE_WEB_RISK_API_KEY: "",
      RESEND_API_KEY: "",
      RESEND_FROM: "",
      SUPPORT_EMAIL: "",
    },
  },
});
