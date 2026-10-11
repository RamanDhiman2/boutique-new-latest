import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { processPaymentIntentCreation, processPaymentConfirmation } from "./server/payment";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/create-payment-intent" && request.method === "POST") {
        try {
          const body = await request.json();
          const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
          const environment = (env as Record<string, string>) || process.env;

          const result = await processPaymentIntentCreation({
            authHeader,
            address_id: body.address_id,
            items: body.items,
            idempotency_key: body.idempotency_key,
            env: environment,
          });

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("Payment intent creation error:", err);
          return new Response(JSON.stringify({ error: err.message || "Failed to create payment intent" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      if (url.pathname === "/api/confirm-payment" && request.method === "POST") {
        try {
          const body = await request.json();
          const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
          const environment = (env as Record<string, string>) || process.env;

          const result = await processPaymentConfirmation({
            authHeader,
            payment_intent_id: body.payment_intent_id,
            order_id: body.order_id,
            env: environment,
          });

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("Payment confirmation error:", err);
          return new Response(JSON.stringify({ error: err.message || "Failed to confirm payment" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
