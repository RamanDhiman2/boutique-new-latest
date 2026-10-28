import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    async function handleAuthCallback() {
      try {
        if (typeof window === "undefined") return;

        const url = new URL(window.location.href);
        const error = url.searchParams.get("error");

        // 1. Handle provider errors (e.g. user cancelled Google consent).
        // Show a fixed message: error_description is attacker-controllable text.
        if (error) {
          window.history.replaceState(null, "", window.location.pathname);
          const userFriendlyError = "Google sign-in was cancelled or failed. Please try again.";
          setErrorMsg(userFriendlyError);
          toast.error(userFriendlyError);
          setTimeout(() => {
            navigate({ to: "/login" });
          }, 2500);
          return;
        }

        // 2. getSession() waits for the client's initialisation, which detects the
        // ?code= in the URL and exchanges it for a session (PKCE). The URL must stay
        // intact until this has happened.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // 3. Now sanitize the browser URL so codes/tokens are not kept in history
        if (window.location.hash || window.location.search) {
          window.history.replaceState(null, "", window.location.pathname);
        }

        if (session?.user) {
          toast.success("Successfully signed in with Google!");
          navigate({ to: "/profile" });
          return;
        }

        // If session parsing is asynchronous (e.g. implicit hash flow parsed by auth-js), wait for state change
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (newSession?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
            subscription.unsubscribe();
            toast.success("Successfully signed in with Google!");
            navigate({ to: "/profile" });
          }
        });

        // Safe timeout fallback
        setTimeout(() => {
          subscription.unsubscribe();
          supabase.auth.getSession().then(({ data: { session: finalCheck } }) => {
            if (finalCheck?.user) {
              toast.success("Successfully signed in with Google!");
              navigate({ to: "/profile" });
            } else {
              toast.error("Session verification timed out. Please sign in again.");
              navigate({ to: "/login" });
            }
          });
        }, 3000);
      } catch (err: unknown) {
        console.error("Auth callback exception:", err);
        setErrorMsg("An unexpected error occurred during authentication.");
        toast.error("Sign-in verification encountered an unexpected error.");
        setTimeout(() => {
          navigate({ to: "/login" });
        }, 2500);
      }
    }

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      {errorMsg ? (
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-serif text-[#1A1A1A]">Sign-in Notice</h2>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <p className="text-xs text-muted-foreground">Redirecting you to sign in...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="size-8 text-[#6B2C3A] animate-spin" />
          <p className="text-base font-medium text-[#1A1A1A]">Verifying your Google sign-in...</p>
          <p className="text-xs text-muted-foreground">
            Securely finalizing your session. Please wait a moment.
          </p>
        </div>
      )}
    </div>
  );
}
