import { createClient, type User, type Session } from "@supabase/supabase-js";
import { categories, products } from "./catalog";

/**
 * Retrieves public environment variables safely across:
 * 1. Browser runtime: window.__ENV__ (injected into HTML by the SSR server)
 * 2. Node.js server runtime: process.env (injected by hosting platform like GoDaddy)
 * 3. Vite build/dev time: import.meta.env
 */
export function getRuntimeEnv(key: string): string {
  // 1. In genuine Node.js runtime (SSR server, Vitest test runner)
  // When process is defined in Node, process.env is authoritative and reflects deletions during tests
  if (typeof process !== "undefined" && process?.release?.name === "node") {
    return process.env?.[key] || "";
  }

  // 2. Browser runtime: Check SSR injected window.__ENV__ first
  if (typeof window !== "undefined") {
    const browserEnv = (window as any).__ENV__;
    if (browserEnv && typeof browserEnv[key] === "string" && browserEnv[key].trim() !== "") {
      return browserEnv[key];
    }
  }

  // 3. Vite build/dev client environment: import.meta.env
  try {
    const buildEnv = (import.meta as any)?.env?.[key];
    if (typeof buildEnv === "string" && buildEnv.trim() !== "") {
      return buildEnv;
    }
  } catch {
    // ignore
  }

  // 4. Fallback for generic environments with process.env
  if (typeof process !== "undefined" && process?.env && process.env[key]) {
    return process.env[key]!;
  }

  return "";
}

function checkIsConfigured(url: string, key: string): boolean {
  return Boolean(url && key && url.startsWith("http") && !url.includes("placeholder"));
}

const buildSupabaseUrl = getRuntimeEnv("VITE_SUPABASE_URL");
const buildSupabaseAnonKey = getRuntimeEnv("VITE_SUPABASE_ANON_KEY");
const isProduction = import.meta.env.PROD;

export const isConfigured = checkIsConfigured(buildSupabaseUrl, buildSupabaseAnonKey);

/**
 * Resolves the canonical OAuth redirect URL.
 * Prioritizes VITE_SITE_URL / VITE_PUBLIC_URL when set (essential for production deployments),
 * and safely falls back to window.location.origin in browser contexts, targeting /auth/callback.
 */
export function getAuthRedirectUrl(): string {
  const envUrl = getRuntimeEnv("VITE_SITE_URL") || getRuntimeEnv("VITE_PUBLIC_URL");
  if (envUrl && envUrl.trim() !== "") {
    const cleanUrl = envUrl.trim().replace(/\/+$/, "");
    return `${cleanUrl}/auth/callback`;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/auth/callback`;
  }

  return "/auth/callback";
}

// Fail-safe client for production when Supabase environment variables are missing.
// Production must NEVER authenticate as a demo user or serve mock data.
function createUnconfiguredProductionClient() {
  const missingError = {
    message:
      "Authentication service is currently unavailable. Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are not configured.",
  };

  return {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null };
      },
      onAuthStateChange(_cb: (event: string, session: Session | null) => void) {
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        };
      },
      async signInWithPassword() {
        return { data: { user: null, session: null }, error: missingError };
      },
      async signUp() {
        return { data: { user: null, session: null }, error: missingError };
      },
      async signInWithOAuth() {
        return { data: { provider: "google", url: null }, error: missingError };
      },
      async exchangeCodeForSession(_code: string) {
        return { data: { user: null, session: null }, error: missingError };
      },
      async signOut() {
        return { error: null };
      },
      async updateUser() {
        return { data: { user: null }, error: missingError };
      },
    },
    from(table: string) {
      return {
        select(_cols?: string) {
          return {
            eq(_col: string, _val: unknown) {
              const runQuery = async () => ({ data: [], error: missingError });
              const promise: any = runQuery();
              promise.order = () => runQuery();
              return promise;
            },
            order(_col: string) {
              return Promise.resolve({ data: [], error: missingError });
            },
            then(onfulfilled?: (val: any) => any, onrejected?: (reason: any) => any) {
              return Promise.resolve({ data: [], error: missingError }).then(
                onfulfilled,
                onrejected,
              );
            },
          };
        },
        insert() {
          const promise: any = Promise.resolve({ data: null, error: missingError });
          promise.select = () => ({
            single: () => Promise.resolve({ data: null, error: missingError }),
            maybeSingle: () => Promise.resolve({ data: null, error: missingError }),
          });
          return promise;
        },
        update() {
          const builder: any = {
            eq() {
              return builder;
            },
            select() {
              return builder;
            },
            single() {
              return Promise.resolve({ data: null, error: missingError });
            },
            then(onf?: any, onr?: any) {
              return Promise.resolve({ data: null, error: missingError }).then(onf, onr);
            },
          };
          return builder;
        },
        delete() {
          const builder: any = {
            eq() {
              return builder;
            },
            select() {
              return builder;
            },
            then(onf?: any, onr?: any) {
              return Promise.resolve({ data: null, error: missingError }).then(onf, onr);
            },
          };
          return builder;
        },
      };
    },
    async rpc(_funcName: string) {
      return { data: null, error: missingError };
    },
    functions: {
      async invoke() {
        return { data: null, error: missingError };
      },
    },
  };
}

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
  apartment?: string;
  is_default?: boolean;
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
  shipping_address?: Partial<AddressRecord> | Record<string, any>;
  total_amount: number;
  status: string;
  payment_status?: string;
  payment_provider_id?: string;
  idempotency_key?: string;
  tracking_number?: string;
  carrier?: string;
  estimated_delivery?: string;
  cancellation_reason?: string;
  created_at: string;
  order_items: OrderItemRecord[];
}

export interface ProductReviewRecord {
  id: string;
  product_id: string;
  user_id?: string | null;
  author_name: string;
  rating: number;
  title?: string;
  comment: string;
  verified_purchase?: boolean;
  created_at: string;
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

  const getSession = (): Session | null => {
    const user = getStorage<User | null>("user", null);
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
        const registeredUsers = getStorage<string[]>("registered_users", ["customer@gmail.com"]);
        if (!registeredUsers.includes(email)) {
          return {
            data: { user: null, session: null },
            error: { message: "Invalid login credentials" },
          };
        }
        const user: User = {
          id: "user-" + btoa(email).slice(0, 8),
          app_metadata: {},
          user_metadata: { full_name: email.split("@")[0] },
          aud: "authenticated",
          created_at: new Date().toISOString(),
          email,
          phone: "",
          role: "authenticated",
          updated_at: new Date().toISOString(),
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
        const registeredUsers = getStorage<string[]>("registered_users", ["customer@gmail.com"]);
        if (registeredUsers.includes(email)) {
          return {
            data: { user: null, session: null },
            error: { message: "User already registered" },
          };
        }
        registeredUsers.push(email);
        setStorage("registered_users", registeredUsers);

        const user: User = {
          id: "user-" + btoa(email).slice(0, 8),
          app_metadata: {},
          user_metadata: { full_name: options?.data?.full_name || email.split("@")[0] },
          aud: "authenticated",
          created_at: new Date().toISOString(),
          email,
          phone: "",
          role: "authenticated",
          updated_at: new Date().toISOString(),
        };
        setStorage("user", user);
        const session = getSession();
        notifyAuthChange("SIGNED_IN", session);
        return { data: { user, session }, error: null as AuthErrorLike | null };
      },
      async signInWithOAuth({
        provider,
      }: {
        provider: string;
        options?: {
          redirectTo?: string | undefined;
          queryParams?: Record<string, string> | undefined;
        };
      }) {
        return {
          data: { provider, url: null },
          error: {
            message: `Google OAuth login is not available because real Supabase authentication credentials are not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable Google sign-in.`,
          },
        };
      },
      async exchangeCodeForSession(_code: string) {
        return {
          data: { user: null, session: null },
          error: {
            message: `Mock OAuth mode does not support code exchange.`,
          },
        };
      },
      async signOut() {
        setStorage("user", null);
        notifyAuthChange("SIGNED_OUT", null);
        return { error: null as AuthErrorLike | null };
      },
      async updateUser({ data }: { data: { full_name?: string } }) {
        const current = getStorage<User | null>("user", null);
        if (!current) {
          return { data: { user: null }, error: { message: "Not authenticated" } };
        }
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
                  const records = getStorage<AddressRecord[]>("addresses", []);
                  const filtered = records.filter(
                    (r) => (r as unknown as Record<string, unknown>)[col] === val,
                  );
                  return { data: filtered as unknown as Record<string, unknown>[], error: null };
                }

                if (table === "orders") {
                  const orders = getStorage<OrderRecord[]>("orders", []);
                  const filtered = orders.filter(
                    (r) => (r as unknown as Record<string, unknown>)[col] === val,
                  );
                  return { data: filtered as unknown as Record<string, unknown>[], error: null };
                }

                let genericList = getStorage<Record<string, unknown>[]>(table, []);

                if (table === "categories" && genericList.length === 0) {
                  genericList = (categories as any[]).map((c, i) => ({
                    slug: c.slug,
                    name: c.name,
                    tagline: c.tagline,
                    description: c.description,
                    image: c.image,
                    display_order: i + 1,
                    is_active: true,
                  }));
                  setStorage("categories", genericList);
                }

                if (table === "products" && genericList.length === 0) {
                  genericList = (products as any[]).map((p) => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    colour: p.colour,
                    category: p.category,
                    images: p.images,
                    sizes: p.sizes,
                    customisable: p.customisable,
                    description: p.description,
                    is_sold_out: Boolean(p.soldOut),
                    is_upcoming: Boolean(p.isUpcoming),
                    is_active: true,
                    stock: p.soldOut ? 0 : 100,
                  }));
                  setStorage("products", genericList);
                }

                if (table === "product_reviews" && genericList.length === 0) {
                  genericList = [
                    {
                      id: "rev_1",
                      product_id: "elegant-maroon-suit",
                      author_name: "Harleen Kaur",
                      rating: 5,
                      title: "Pure Royal Craftsmanship",
                      comment:
                        "The velvet is incredibly rich and the zardozi embroidery is heavy and authentic. The bespoke fit was made to measure perfectly. Everyone at my family wedding complimented it!",
                      verified_purchase: true,
                      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
                    },
                    {
                      id: "rev_2",
                      product_id: "elegant-maroon-suit",
                      author_name: "Priya Sharma",
                      rating: 5,
                      title: "Stunning Bridal Ensemble",
                      comment:
                        "Wore this for my cousin's wedding and received endless compliments. The flare and dupatta finish are top tier.",
                      verified_purchase: true,
                      created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
                    },
                    {
                      id: "rev_3",
                      product_id: "elegant-purple-georgette-suit",
                      author_name: "Simran Gill",
                      rating: 5,
                      title: "Exquisite Aari embroidery",
                      comment:
                        "The shade of purple is so regal. Lightweight georgette yet the work feels premium and luxury.",
                      verified_purchase: true,
                      created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
                    },
                    {
                      id: "rev_4",
                      product_id: "royal-navy-blue-green-suit",
                      author_name: "Jasleen B.",
                      rating: 5,
                      title: "Colour combination is mesmerising",
                      comment:
                        "Navy and green silk blend is stunning in person. Delivery to London was fast and beautifully packaged.",
                      verified_purchase: true,
                      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
                    },
                    {
                      id: "rev_5",
                      product_id: "all-over-black-heavy-handwork-suit",
                      author_name: "Amanpreet K.",
                      rating: 5,
                      title: "Showstopper black velvet suit",
                      comment:
                        "The black velvet with heavy hand embroidery is sensational. Worth every single penny.",
                      verified_purchase: true,
                      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
                    },
                  ];
                  setStorage("product_reviews", genericList);
                }
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
            order(_col: string, _opts?: { ascending?: boolean }) {
              let genericList = getStorage<Record<string, unknown>[]>(table, []);
              if (table === "categories" && genericList.length === 0) {
                genericList = (categories as any[]).map((c, i) => ({
                  slug: c.slug,
                  name: c.name,
                  tagline: c.tagline,
                  description: c.description,
                  image: c.image,
                  display_order: i + 1,
                  is_active: true,
                }));
                setStorage("categories", genericList);
              }
              return Promise.resolve({ data: genericList, error: null });
            },
            then(
              onfulfilled?: ((value: QueryResult<Record<string, unknown>>) => any) | null,
              onrejected?: ((reason: any) => any) | null,
            ) {
              let genericList = getStorage<Record<string, unknown>[]>(table, []);
              if (table === "categories" && genericList.length === 0) {
                genericList = (categories as any[]).map((c, i) => ({
                  slug: c.slug,
                  name: c.name,
                  tagline: c.tagline,
                  description: c.description,
                  image: c.image,
                  display_order: i + 1,
                  is_active: true,
                }));
                setStorage("categories", genericList);
              }
              if (table === "products" && genericList.length === 0) {
                genericList = (products as any[]).map((p) => ({
                  id: p.id,
                  name: p.name,
                  price: p.price,
                  colour: p.colour,
                  category: p.category,
                  images: p.images,
                  sizes: p.sizes,
                  customisable: p.customisable,
                  description: p.description,
                  is_sold_out: Boolean(p.soldOut),
                  is_upcoming: Boolean(p.isUpcoming),
                  is_active: true,
                  stock: p.soldOut ? 0 : 100,
                }));
                setStorage("products", genericList);
              }
              return Promise.resolve({ data: genericList, error: null }).then(
                onfulfilled,
                onrejected,
              );
            },
          };
        },
        insert(recordOrRecords: unknown) {
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

          const result: SingleResult<Record<string, unknown>> = {
            data: newRecord,
            error: null,
          };

          const promise = Promise.resolve(result) as Promise<
            SingleResult<Record<string, unknown>>
          > & {
            select(): {
              single(): Promise<SingleResult<Record<string, unknown>>>;
              maybeSingle(): Promise<SingleResult<Record<string, unknown>>>;
            };
          };

          promise.select = () => ({
            single: () => Promise.resolve(result),
            maybeSingle: () => Promise.resolve(result),
          });

          return promise;
        },
        update(updates: Record<string, unknown>) {
          const filters: Array<{ col: string; val: unknown }> = [];

          const execUpdate = async (): Promise<
            SingleResult<Record<string, unknown>> & { data: any }
          > => {
            const list = getStorage<Record<string, unknown>[]>(table, []);
            let updatedItem: Record<string, unknown> | null = null;
            const updatedList = list.map((item) => {
              const matches = filters.every((f) => item[f.col] === f.val);
              if (matches) {
                updatedItem = { ...item, ...updates };
                return updatedItem;
              }
              return item;
            });
            setStorage(table, updatedList);
            return { data: updatedItem, error: null };
          };

          const builder: any = {
            eq(col: string, val: unknown) {
              filters.push({ col, val });
              return builder;
            },
            select() {
              return builder;
            },
            single() {
              return execUpdate();
            },
            then(onfulfilled?: (val: any) => any, onrejected?: (reason: any) => any) {
              return execUpdate().then(onfulfilled, onrejected);
            },
          };

          return builder;
        },
        delete() {
          const filters: Array<{ col: string; val: unknown }> = [];

          const execDelete = async (): Promise<{ data: any; error: AuthErrorLike | null }> => {
            const list = getStorage<Record<string, unknown>[]>(table, []);
            const updated = list.filter((item) => !filters.every((f) => item[f.col] === f.val));
            setStorage(table, updated);
            return { data: null, error: null };
          };

          const builder: any = {
            eq(col: string, val: unknown) {
              filters.push({ col, val });
              return builder;
            },
            select() {
              return builder;
            },
            then(onfulfilled?: (val: any) => any, onrejected?: (reason: any) => any) {
              return execDelete().then(onfulfilled, onrejected);
            },
          };

          return builder;
        },
      };
    },
    async rpc(funcName: string, args: Record<string, unknown>) {
      if (funcName === "create_order_secure") {
        const rawAddressId = String(args["p_address_id"] || "");
        const session = getSession();
        const userId = session?.user?.id;
        if (!userId) {
          return {
            data: null,
            error: { message: "Unauthorized: Please sign in to place an order" },
          };
        }

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
    functions: {
      async invoke(_funcName: string, _options?: { body?: any }) {
        return {
          data: null,
          error: new Error("Supabase Edge Functions are not available in mock mode"),
        };
      },
    },
  };
}

let cachedClient: any = null;
let lastUrl = "";
let lastKey = "";

export function getSupabaseClient() {
  const currentUrl = getRuntimeEnv("VITE_SUPABASE_URL");
  const currentKey = getRuntimeEnv("VITE_SUPABASE_ANON_KEY");
  const configured = checkIsConfigured(currentUrl, currentKey);

  if (configured) {
    if (!cachedClient || lastUrl !== currentUrl || lastKey !== currentKey) {
      // PKCE: OAuth/email links return ?code=, which the client exchanges itself on
      // initialisation (detectSessionInUrl) before /auth/callback strips the URL.
      cachedClient = createClient(currentUrl, currentKey, { auth: { flowType: "pkce" } });
      lastUrl = currentUrl;
      lastKey = currentKey;
    }
    return cachedClient;
  }

  if (isProduction) {
    return createUnconfiguredProductionClient();
  }

  if (!cachedClient) {
    cachedClient = createMockSupabase();
  }
  return cachedClient;
}

// Client export compatible with Supabase operations used in the app, proxied for dynamic runtime env support
export const supabase = new Proxy({} as ReturnType<typeof createMockSupabase>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = client[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
