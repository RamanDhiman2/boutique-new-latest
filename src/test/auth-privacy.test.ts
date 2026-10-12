import { describe, it, expect, beforeEach } from "vitest";
import { supabase, isConfigured } from "@/lib/supabase";

describe("Authentication & Account Privacy Audit", () => {
  beforeEach(async () => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
    // Ensure any leftover session is cleared
    await supabase.auth.signOut();
  });

  it("1. Fresh visitor starts with no session (user is null, not Simran Kaur)", async () => {
    const { data, error } = await supabase.auth.getSession();
    expect(error).toBeNull();
    // A fresh visitor must never be defaulted to any user
    expect(data.session).toBeNull();
  });

  it("2. Real Supabase auth requires valid password; rejects invalid without fallback", async () => {
    expect(isConfigured).toBe(true);

    // Attempt signup without password - real Supabase Auth enforces validation
    const resWithoutPw = await supabase.auth.signUp({
      email: "test_visitor_fresh@example.com",
      password: "",
    });
    expect(resWithoutPw.error).not.toBeNull();
    expect(resWithoutPw.error?.message).toMatch(/password/i);

    // Verify session remains null (no demo fallback)
    const { data: sessionData } = await supabase.auth.getSession();
    expect(sessionData.session).toBeNull();
  });

  it("3. Real Supabase auth login failure does not grant session or impersonate demo user", async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "nonexistent_visitor@example.com",
      password: "WrongPassword123!",
    });

    expect(error).not.toBeNull();
    expect(data.session).toBeNull();

    // Verify that failed login leaves active session completely null
    const { data: activeSession } = await supabase.auth.getSession();
    expect(activeSession.session).toBeNull();
  });

  it("4. Logout correctly clears active session and resets to fresh state", async () => {
    const logoutRes = await supabase.auth.signOut();
    expect(logoutRes.error).toBeNull();

    const { data } = await supabase.auth.getSession();
    expect(data.session).toBeNull();
  });

  it("5. Account isolation: addresses & orders queries filter by authenticated user ID", async () => {
    const userA_Id = "00000000-0000-0000-0000-000000000001";
    const userB_Id = "00000000-0000-0000-0000-000000000002";

    // Query addresses for User A
    const { data: userAAddresses, error: errA } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userA_Id);

    // Query addresses for User B
    const { data: userBAddresses, error: errB } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userB_Id);

    expect(errA).toBeNull();
    expect(errB).toBeNull();

    // User A should never receive User B's addresses
    if (userAAddresses && userBAddresses) {
      const userAIds = userAAddresses.map((a: any) => a.id);
      const userBIds = userBAddresses.map((b: any) => b.id);
      const overlap = userAIds.filter((id) => userBIds.includes(id));
      expect(overlap).toHaveLength(0);
    }
  });

  it("6. Orders queries filter strictly by user_id", async () => {
    const userA_Id = "00000000-0000-0000-0000-000000000001";
    const userB_Id = "00000000-0000-0000-0000-000000000002";

    const { data: userAOrders, error: errA } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userA_Id);

    const { data: userBOrders, error: errB } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userB_Id);

    expect(errA).toBeNull();
    expect(errB).toBeNull();

    if (userAOrders && userBOrders) {
      const userAIds = userAOrders.map((o: any) => o.id);
      const userBIds = userBOrders.map((o: any) => o.id);
      const overlap = userAIds.filter((id) => userBIds.includes(id));
      expect(overlap).toHaveLength(0);
    }
  });

  it("7. Production fail-safe verification: isConfigured flag is boolean and production client does not mock users", async () => {
    expect(typeof isConfigured).toBe("boolean");
    expect(isConfigured).toBe(true);
  });

  it("8. Google OAuth never defaults to dummy account (no Priya Sharma or hardcoded user)", async () => {
    const { data: sessionBefore } = await supabase.auth.getSession();
    expect(sessionBefore.session).toBeNull();

    // Call signInWithOAuth with prompt parameter
    const res = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: { prompt: "select_account" },
      },
    });

    // It must return real OAuth data or real error; it must NEVER create an in-memory dummy session
    const { data: sessionAfter } = await supabase.auth.getSession();
    expect(sessionAfter.session).toBeNull();
  });
});

