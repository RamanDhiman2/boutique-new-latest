import { createClient, type User, type Session } from "@supabase/supabase-js";
import { products } from "./catalog";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"];
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"];

const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith("http") &&
  !supabaseUrl.includes("placeholder"),
);

export interface AddressRecord {
  id: string;
  user_id: string;
  type: string;
  full_name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  created_at?: string;
}

export interface OrderItemRecord {
  id: string;
  product_id: string;
  size: string;
  quantity: number;
  price: number;
}

export interface OrderRecord {
  id: string;
  user_id: string;
  address_id?: string;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: OrderItemRecord[];
}

export interface AuthErrorLike {
  message: string;
}

export interface QueryResult<T = Record<string, unknown>> {
  data: T[];
  error: AuthErrorLike | null;
}

export interface SingleResult<T = Record<string, unknown>> {
  data: T | null;
  error: AuthErrorLike | null;
}

// In-memory / localStorage fallback for seamless local & preview execution
function createMockSupabase() {
  const isBrowser = typeof window !== "undefined";

  const getStorage = <T>(key: string, defaultValue: T): T => {
    if (!isBrowser) return defaultValue;
    try {
      const val = localStorage.getItem(`mock_sb_${key}`);
      return val ? (JSON.parse(val) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const setStorage = (key: string, value: unknown) => {
    if (!isBrowser) return;
    try {
      localStorage.setItem(`mock_sb_${key}`, JSON.stringify(value));
    } catch {
      // ignore storage error
    }
  };

  type AuthListener = (event: string, session: Session | null) => void;
  const authListeners: AuthListener[] = [];

  const defaultUser: User = {
    id: "demo-user-123",
    app_metadata: {},
    user_metadata: { full_name: "Simran Kaur" },
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    email: "simran@sohnimutiyaar.co.uk",
    phone: "",
    role: "authenticated",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  const getSession = (): Session | null => {
    const user = getStorage<User | null>("user", defaultUser);
    if (!user) return null;
    return {
      access_token: "mock-access-token",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh-token",
      user,
    };
  };

  const notifyAuthChange = (event: string, session: Session | null) => {
    authListeners.forEach((l) => l(event, session));
  };

  return {
    auth: {
      async getSession() {
        return { data: { session: getSession() }, error: null };
      },
      onAuthStateChange(cb: AuthListener) {
        authListeners.push(cb);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                const idx = authListeners.indexOf(cb);
                if (idx !== -1) authListeners.splice(idx, 1);
              },
            },
          },
        };
      },
      async signInWithPassword({ email }: { email: string; password?: string }) {
        if (!email) {
          return { data: { user: null, session: null }, error: { message: "Email is required" } };
        }
        const registeredUsers = getStorage<string[]>("registered_users", ["simran@sohnimutiyaar.co.uk", "customer@gmail.com"]);
        if (!registeredUsers.includes(email)) {
          return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
        }
        const user: User = {
          ...defaultUser,
          id: "user-" + btoa(email).slice(0, 8),
          email,
          user_metadata: { full_name: email.split("@")[0] },
        };
        setStorage("user", user);
        const session = getSession();
        notifyAuthChange("SIGNED_IN", session);
        return { data: { user, session }, error: null as AuthErrorLike | null };
      },
      async signUp({
        email,
        options,
      }: {
        email: string;
        password?: string;
        options?: { data?: { full_name?: string } };
      }) {
        if (!email) {
          return { data: { user: null, session: null }, error: { message: "Email is required" } };
        }
        const registeredUsers = getStorage<string[]>("registered_users", ["simran@sohnimutiyaar.co.uk", "customer@gmail.com"]);
        if (registeredUsers.includes(email)) {
          return { data: { user: null, session: null }, error: { message: "User already registered" } };
        }
        registeredUsers.push(email);
        setStorage("registered_users", registeredUsers);
        
        const user: User = {
          ...defaultUser,
          id: "user-" + btoa(email).slice(0, 8),
          email,
          user_metadata: { full_name: options?.data?.full_name || email.split("@")[0] },
        };
        setStorage("user", user);
        const session = getSession();
        notifyAuthChange("SIGNED_IN", session);
        return { data: { user, session }, error: null as AuthErrorLike | null };
      },
      async signInWithOAuth({
        provider,
        options,
      }: {
        provider: string;
        options?: {
          redirectTo?: string | undefined;
          queryParams?: Record<string, string> | undefined;
        };
      }) {
        const user: User = {
          ...defaultUser,
          id: "oauth-google-user",
          email: "customer@gmail.com",
          user_metadata: { full_name: `Priya Sharma (${provider})` },
        };
        setStorage("user", user);
        const session = getSession();
        notifyAuthChange("SIGNED_IN", session);
        const oauthUrl: string | null = options?.redirectTo ? null : null;
        return {
          data: { provider, url: oauthUrl },
          error: null as AuthErrorLike | null,
        };
      },
      async signOut() {
        setStorage("user", null);
        notifyAuthChange("SIGNED_OUT", null);
        return { error: null as AuthErrorLike | null };
      },
      async updateUser({ data }: { data: { full_name?: string } }) {
        const current = getStorage<User>("user", defaultUser);
        const updated: User = {
          ...current,
          user_metadata: { ...current.user_metadata, ...data },
        };
        setStorage("user", updated);
        const session = getSession();
        notifyAuthChange("USER_UPDATED", session);
        return { data: { user: updated }, error: null as AuthErrorLike | null };
      },
    },
    from(table: string) {
      return {
        select(_cols?: string) {
          return {
            eq(col: string, val: unknown) {
              const runQuery = async (): Promise<QueryResult<Record<string, unknown>>> => {
                if (table === "addresses") {
                  let records = getStorage<AddressRecord[]>("addresses", []);
                  if (records.length === 0) {
                    records = [
                      {
                        id: "addr_1",
                        user_id: String(val),
                        full_name: "Simran Kaur",
                        street: "14 Belgrave Road",
                        city: "Leicester",
                        state: "Leicestershire",
                        zip: "LE4 6AS",
                        country: "United Kingdom",
                        phone: "+44 7739 307042",
                        type: "Shipping",
                      },
                    ];
                    setStorage("addresses", records);
                  }
                  const filtered = records.filter(
                    (r) => (r as unknown as Record<string, unknown>)[col] === val,
                  );
                  return { data: filtered as unknown as Record<string, unknown>[], error: null };
                }

                if (table === "orders") {
                  let orders = getStorage<OrderRecord[]>("orders", []);
                  if (orders.length === 0) {
                    orders = [
                      {
                        id: "ord_91823a7",
                        user_id: String(val),
                        total_amount: 890,
                        status: "processing",
                        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
                        order_items: [
                          {
                            id: "item_1",
                            product_id: "Rani Bridal Suit",
                            size: "M",
                            quantity: 1,
                            price: 890,
                          },
                        ],
                      },
                    ];
                    setStorage("orders", orders);
                  }
                  const filtered = orders.filter(
                    (r) => (r as unknown as Record<string, unknown>)[col] === val,
                  );
                  return { data: filtered as unknown as Record<string, unknown>[], error: null };
                }

                const genericList = getStorage<Record<string, unknown>[]>(table, []);
                const filtered = genericList.filter((r) => r[col] === val);
                return { data: filtered, error: null };
              };

              const promise = runQuery() as Promise<QueryResult<Record<string, unknown>>> & {
                order(
                  orderCol: string,
                  opts?: { ascending?: boolean },
                ): Promise<QueryResult<Record<string, unknown>>>;
              };

              promise.order = (_orderCol: string, _opts?: { ascending?: boolean }) => runQuery();
              return promise;
            },
          };
        },
        insert(recordOrRecords: unknown) {
          const runInsert = async (): Promise<SingleResult<Record<string, unknown>>> => {
            const list = getStorage<Record<string, unknown>[]>(table, []);
            const payload = Array.isArray(recordOrRecords)
              ? ((recordOrRecords[0] as Record<string, unknown>) ?? {})
              : (recordOrRecords as Record<string, unknown>);
            const newRecord: Record<string, unknown> = {
              id: "rec_" + Math.random().toString(36).substring(2, 9),
              created_at: new Date().toISOString(),
              ...payload,
            };
            list.push(newRecord);
            setStorage(table, list);
            return {
              data: newRecord,
              error: null,
            };
          };

          const promise = runInsert() as Promise<SingleResult<Record<string, unknown>>> & {
            select(): { single(): Promise<SingleResult<Record<string, unknown>>> };
          };

          promise.select = () => ({
            single: () => runInsert(),
          });

          return promise;
        },
        update(updates: Record<string, unknown>) {
          return {
            eq(col: string, val: unknown) {
              return (async (): Promise<SingleResult<Record<string, unknown>>> => {
                const list = getStorage<Record<string, unknown>[]>(table, []);
                let found: Record<string, unknown> | null = null;
                const updatedList = list.map((item) => {
                  if (item[col] === val) {
                    found = { ...item, ...updates };
                    return found;
                  }
                  return item;
                });
                setStorage(table, updatedList);
                return { data: found, error: null };
              })();
            },
          };
        },
        delete() {
          return {
            eq(col: string, val: unknown) {
              return (async (): Promise<{ error: AuthErrorLike | null }> => {
                const list = getStorage<Record<string, unknown>[]>(table, []);
                const updated = list.filter((r) => r[col] !== val);
                setStorage(table, updated);
                return { error: null };
              })();
            },
          };
        },
      };
    },
    async rpc(funcName: string, args: Record<string, unknown>) {
      if (funcName === "create_order_secure") {
        const rawAddressId = String(args["p_address_id"] || "");
        const session = getSession();
        const userId = session?.user?.id || "demo-user-123";

        // Validate address
        const addresses = getStorage<AddressRecord[]>("addresses", []);
        const address = addresses.find((a) => a.id === rawAddressId);
        if (!address && addresses.length > 0) {
          return { data: null, error: { message: "Invalid or unauthorized address" } };
        }

        const rawItems =
          (args["p_items"] as Array<{ product_id: string; size: string; quantity: number }>) || [];

        if (rawItems.length === 0) {
          return { data: null, error: { message: "Order must contain at least one item" } };
        }

        // Authoritative pricing: Look up prices directly from verified catalog
        const orderItems: OrderItemRecord[] = [];
        for (let i = 0; i < rawItems.length; i++) {
          const it = rawItems[i];
          if (!it) continue;
          const quantity = Number(it.quantity) || 1;
          if (quantity < 1 || quantity > 100) {
            return {
              data: null,
              error: { message: `Invalid quantity for product: ${it.product_id}` },
            };
          }

          const catalogItem = products.find((p) => p.id === it.product_id);
          if (!catalogItem) {
            return { data: null, error: { message: `Invalid product ID: ${it.product_id}` } };
          }

          orderItems.push({
            id: `item_${i + 1}`,
            product_id: catalogItem.name,
            size: it.size || "Standard",
            quantity,
            price: catalogItem.price,
          });
        }

        const authoritativeTotal = orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
        const orderId = "ord_" + Math.random().toString(36).substring(2, 9);
        const orders = getStorage<OrderRecord[]>("orders", []);

        const newOrder: OrderRecord = {
          id: orderId,
          user_id: userId,
          address_id: rawAddressId,
          total_amount: authoritativeTotal,
          status: "processing",
          created_at: new Date().toISOString(),
          order_items: orderItems,
        };
        orders.unshift(newOrder);
        setStorage("orders", orders);
        return { data: orderId, error: null };
      }

      if (funcName === "cancel_order_secure") {
        const orders = getStorage<OrderRecord[]>("orders", []);
        const order = orders.find((o) => o.id === args["order_id"]);
        if (order) {
          order.status = "cancelled";
          setStorage("orders", orders);
        }
        return { error: null };
      }

      return { data: null, error: null };
    },
  };
}

// Client export compatible with Supabase operations used in the app
export const supabase = (isConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : createMockSupabase()) as unknown as ReturnType<typeof createMockSupabase>;
