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
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const errorDesc = url.searchParams.get("error_description");

        // 1. Immediately sanitize browser URL so tokens are never retained in browser history
        if (window.location.hash || window.location.search) {
          window.history.replaceState(null, "", window.location.pathname);
        }

        // 2. Handle provider errors (e.g. user cancelled Google consent)
        if (error) {
          const userFriendlyError = errorDesc
            ? decodeURIComponent(errorDesc).replace(/\+/g, " ")
            : "Google authentication was cancelled or failed.";
          setErrorMsg(userFriendlyError);
          toast.error(userFriendlyError);
          setTimeout(() => {
            navigate({ to: "/login" });
          }, 2500);
          return;
        }

        // 3. Exchange PKCE code for session if present
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("OAuth code exchange failure:", exchangeError.message);
            setErrorMsg(
              "Authentication session could not be completed. Please try signing in again.",
            );
            toast.error("Google sign-in could not be completed.");
            setTimeout(() => {
              navigate({ to: "/login" });
            }, 2500);
            return;
          }
        }

        // 4. Verify authenticated session
        const {
          data: { session },
        } = await supabase.auth.getSession();

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
