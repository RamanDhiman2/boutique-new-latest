// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type Plugin } from "vite";
import { processPaymentIntentCreation, processPaymentConfirmation } from "./src/server/payment";

function stripeDevApiPlugin(): Plugin {
  return {
    name: "stripe-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) {
          return next();
        }

        const nodeEnv = process.env["NODE_ENV"] || "development";
        const env = loadEnv(nodeEnv, process.cwd(), "");

        if (req.url === "/api/create-payment-intent" && req.method === "POST") {
          try {
            const buffers: Buffer[] = [];
            for await (const chunk of req) {
              buffers.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            }
            const body = JSON.parse(Buffer.concat(buffers).toString("utf8"));
            const authHeader = req.headers["authorization"] || null;

            const result = await processPaymentIntentCreation({
              authHeader,
              address_id: body.address_id,
              items: body.items,
              idempotency_key: body.idempotency_key,
              env,
            });

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
            return;
          } catch (err: any) {
            console.error("Payment intent creation error:", err);
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message || "Failed to create payment intent" }));
            return;
          }
        }

        if (req.url === "/api/confirm-payment" && req.method === "POST") {
          try {
            const buffers: Buffer[] = [];
            for await (const chunk of req) {
              buffers.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            }
            const body = JSON.parse(Buffer.concat(buffers).toString("utf8"));
            const authHeader = req.headers["authorization"] || null;

            const result = await processPaymentConfirmation({
              authHeader,
              payment_intent_id: body.payment_intent_id,
              order_id: body.order_id,
              env,
            });

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
            return;
          } catch (err: any) {
            console.error("Payment confirmation error:", err);
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message || "Failed to confirm payment" }));
            return;
          }
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [stripeDevApiPlugin()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      host: "0.0.0.0",
      port: 3000,
    },
  },
});
