import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase, type AddressRecord, type OrderRecord } from "@/lib/supabase";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { gbp } from "@/lib/catalog";
import {
  Package,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  Star,
  Home,
  Briefcase,
  MapPin,
  LayoutDashboard,
  Ruler,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { AddressForm, type AddressFormData } from "@/components/address/AddressForm";
import { OrderHistoryView } from "@/components/orders/OrderHistoryView";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const { clear } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [editingAddress, setEditingAddress] = useState<AddressRecord | null>(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const addressFormRef = useRef<HTMLFormElement | null>(null);
  const [savedTailorSlip, setSavedTailorSlip] = useState<{
    refId?: string;
    savedAt?: string;
    fitPreference?: string;
    unit?: string;
    customerName?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sm-tailor-slip");
      if (raw) {
        setSavedTailorSlip(JSON.parse(raw));
      }
    } catch {
      // ignore storage error
    }
  }, []);

  const { data: addresses, refetch: refetchAddresses } = useQuery<AddressRecord[]>({
    queryKey: ["addresses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("addresses").select("*").eq("user_id", user?.id);
      if (error) throw error;
      const all = (data as unknown as AddressRecord[]) ?? [];
      const deletedLocal: string[] = (() => {
        try {
          return JSON.parse(localStorage.getItem(`deleted_addrs_${user?.id}`) || "[]");
        } catch {
          return [];
        }
      })();
      return all.filter((addr: any) => !addr.is_deleted && !deletedLocal.includes(addr.id));
    },
    enabled: !!user,
  });

  const { data: orders, refetch: refetchOrders } = useQuery<OrderRecord[]>({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as OrderRecord[]) ?? [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="p-20 text-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    clear();
    const currentUserId = user?.id;
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      try {
        if (currentUserId) {
          localStorage.removeItem(`deleted_addrs_${currentUserId}`);
          localStorage.removeItem(`default_addr_${currentUserId}`);
        }
        localStorage.removeItem("mock_sb_user");
      } catch {
        // ignore storage errors
      }
    }
    toast.success("Logged out successfully");
    navigate({ to: "/" });
  };

  const startEditAddress = (address: AddressRecord) => {
    setIsAddingAddress(false);
    setEditingAddress(address);
    setConfirmDeleteId(null);
    setTimeout(() => {
      addressFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      const firstInput = addressFormRef.current?.querySelector("input");
      firstInput?.focus();
    }, 50);
  };

  const startAddAddress = () => {
    setEditingAddress(null);
    setIsAddingAddress(true);
    setConfirmDeleteId(null);
    setTimeout(() => {
      addressFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      const firstInput = addressFormRef.current?.querySelector("input");
      firstInput?.focus();
    }, 50);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user) return;
    setDeletingAddressId(addressId);
    try {
      // 1. Try safe backend RPC if available
      const { data: rpcData, error: rpcError } = await supabase.rpc("delete_address_safe", {
        p_address_id: addressId,
      });

      if (!rpcError && rpcData) {
        toast.success("Address removed successfully");
        if (editingAddress?.id === addressId) {
          setEditingAddress(null);
        }
        setConfirmDeleteId(null);
        await queryClient.invalidateQueries({ queryKey: ["addresses"] });
        await refetchAddresses();
        return;
      }

      // 2. Direct hard delete attempt
      const { error: delError } = await supabase.from("addresses").delete().eq("id", addressId);

      if (delError) {
        const errObj = delError as { message?: string; code?: string };
        const isConstraintError =
          errObj.code === "23502" ||
          errObj.code === "23503" ||
          errObj.message?.includes("violates not-null constraint") ||
          errObj.message?.includes("violates foreign key constraint") ||
          errObj.message?.includes("address_id");

        if (isConstraintError) {
          // Relational constraint: this address is attached to past orders.
          // Amazon/Flipkart standard: keep snapshot for past orders while removing from customer address book.
          try {
            await supabase
              .from("addresses")
              .update({ is_deleted: true, is_default: false })
              .eq("id", addressId);
          } catch {
            // ignore if column not present yet
          }

          // Persist removal to local client cache so it disappears immediately
          try {
            const currentDeleted: string[] = JSON.parse(
              localStorage.getItem(`deleted_addrs_${user.id}`) || "[]",
            );
            if (!currentDeleted.includes(addressId)) {
              currentDeleted.push(addressId);
              localStorage.setItem(`deleted_addrs_${user.id}`, JSON.stringify(currentDeleted));
            }
          } catch (e) {
            console.error("Local delete cache error:", e);
          }

          toast.success("Address removed from your saved addresses");
          if (editingAddress?.id === addressId) {
            setEditingAddress(null);
          }
          setConfirmDeleteId(null);
          await queryClient.invalidateQueries({ queryKey: ["addresses"] });
          await refetchAddresses();
          return;
        }

        throw new Error(errObj.message || "Failed to delete address");
      }

      toast.success("Address deleted successfully");
      if (editingAddress?.id === addressId) {
        setEditingAddress(null);
      }
      setConfirmDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ["addresses"] });
      await refetchAddresses();
    } catch (err: any) {
      console.error("Delete address error:", err);
      toast.error(err.message || "Could not delete address");
    } finally {
      setDeletingAddressId(null);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!user) return;
    try {
      // 1. Try safe RPC if migration exists
      const { error: rpcError } = await supabase.rpc("set_default_address", {
        p_address_id: addressId,
      });
      if (rpcError) {
        // Fallback: update is_default directly in table if column exists
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);

        const { error: updateErr } = await supabase
          .from("addresses")
          .update({ is_default: true })
          .eq("id", addressId);

        if (updateErr) {
          localStorage.setItem(`default_addr_${user.id}`, addressId);
        }
      }
      localStorage.setItem(`default_addr_${user.id}`, addressId);
      toast.success("Default address updated");
      await queryClient.invalidateQueries({ queryKey: ["addresses"] });
      await refetchAddresses();
    } catch (err: any) {
      console.error("Set default error:", err);
      localStorage.setItem(`default_addr_${user.id}`, addressId);
      toast.success("Default address updated");
      await refetchAddresses();
    }
  };

  const handleSaveAddress = async (formData: AddressFormData) => {
    if (!user) {
      toast.error("Please login to save addresses");
      return;
    }

    setAddressSubmitting(true);
    try {
      // Base payload compatible with current remote DB table schema
      const combinedStreet = formData.apartment
        ? `${formData.street}, ${formData.apartment}`
        : formData.street;

      const basePayload: Record<string, any> = {
        user_id: user.id,
        type: formData.type || "Home",
        full_name: formData.full_name,
        street: combinedStreet,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        country: formData.country,
        phone: formData.phone,
      };

      // Extended payload if migration was run
      const extendedPayload: Record<string, any> = {
        ...basePayload,
        street: formData.street,
        apartment: formData.apartment || null,
        is_default: Boolean(formData.is_default),
        is_deleted: false,
      };

      if (editingAddress) {
        let updateRes = await supabase
          .from("addresses")
          .update(extendedPayload)
          .eq("id", editingAddress.id);

        // Fallback to base payload if remote schema doesn't have apartment or is_default yet
        if (updateRes.error) {
          const errMsg = updateRes.error.message || "";
          if (
            errMsg.includes("column") ||
            errMsg.includes("schema cache") ||
            (updateRes.error as any).code === "PGRST204"
          ) {
            const updateBase = { ...basePayload };
            delete updateBase["user_id"]; // don't re-assign user_id on update
            updateRes = await supabase
              .from("addresses")
              .update(updateBase)
              .eq("id", editingAddress.id);
          }
        }

        if (updateRes.error) {
          throw new Error(updateRes.error.message || "Failed to update address");
        }

        if (formData.is_default) {
          localStorage.setItem(`default_addr_${user.id}`, editingAddress.id);
        }

        toast.success("Address updated successfully");
        setEditingAddress(null);
        setIsAddingAddress(false);
      } else {
        let insertRes = await supabase.from("addresses").insert(extendedPayload).select().single();

        // Fallback to base payload if remote schema doesn't have new columns yet
        if (insertRes.error) {
          const errMsg = insertRes.error.message || "";
          if (
            errMsg.includes("column") ||
            errMsg.includes("schema cache") ||
            (insertRes.error as any).code === "PGRST204"
          ) {
            insertRes = await supabase.from("addresses").insert(basePayload).select().single();
          }
        }

        if (insertRes.error) {
          throw new Error(insertRes.error.message || "Failed to add address");
        }

        const newId = insertRes.data && (insertRes.data as any).id;
        if (formData.is_default && newId) {
          localStorage.setItem(`default_addr_${user.id}`, newId);
        }

        toast.success("Address added successfully");
        setIsAddingAddress(false);
        setEditingAddress(null);
      }

      await queryClient.invalidateQueries({ queryKey: ["addresses"] });
      await refetchAddresses();
    } catch (err: any) {
      console.error("Save address error:", err);
      toast.error(err.message || "Failed to save address");
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (error && typeof error === "object" && "message" in error) {
      toast.error(String((error as { message: string }).message));
    } else {
      toast.success("Profile updated successfully");
    }
  };

  const displayName = String(user.user_metadata?.["full_name"] || "").trim();
  const initials =
    (displayName || user.email || "?")
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  // Same rule as the order list: abandoned (never paid) checkouts are not real orders
  const placedOrders = (orders || []).filter((o) =>
    ["captured", "refunded"].includes((o.payment_status || "").toLowerCase()),
  );
  const latestOrder = placedOrders[0];
  const defaultAddressId = localStorage.getItem(`default_addr_${user.id}`);

  const navItems = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "orders", label: "My Orders", icon: Package },
    { id: "addresses", label: "Addresses", icon: MapPin },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10 pt-4 pb-20">
      <SiteBreadcrumb items={[{ label: "My Account" }]} />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-12 mt-6 sm:mt-8">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-28 self-start space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-14 shrink-0 rounded-full bg-[#6B2C3A] text-white flex items-center justify-center font-serif text-xl">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Welcome back</p>
              <h1 className="font-serif text-2xl leading-tight truncate">
                {displayName || "My Account"}
              </h1>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          <nav
            aria-label="Account sections"
            className="flex lg:flex-col gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b lg:border-b-0 lg:border-t border-black/10 lg:pt-4 -mx-4 px-4 lg:mx-0 lg:px-0"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2.5 whitespace-nowrap text-sm transition-colors px-1 lg:px-3 py-3 lg:py-2.5 lg:rounded-sm border-b-2 lg:border-b-0 ${
                    isActive
                      ? "border-[#6B2C3A] text-[#6B2C3A] font-medium lg:bg-[#6B2C3A]/[0.06]"
                      : "border-transparent text-muted-foreground hover:text-foreground lg:hover:bg-black/[0.03]"
                  }`}
                >
                  <Icon className="size-4 hidden sm:block" />
                  {item.label}
                </button>
              );
            })}
            <button
              onClick={() => navigate({ to: "/measurements" })}
              className="flex items-center gap-2.5 whitespace-nowrap text-sm px-1 lg:px-3 py-3 lg:py-2.5 lg:rounded-sm border-b-2 lg:border-b-0 border-transparent text-muted-foreground hover:text-foreground lg:hover:bg-black/[0.03]"
            >
              <Ruler className="size-4 hidden sm:block" />
              Measurements
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 whitespace-nowrap text-sm px-1 lg:px-3 py-3 lg:py-2.5 lg:rounded-sm border-b-2 lg:border-b-0 border-transparent text-destructive/80 hover:text-destructive lg:mt-2"
            >
              <LogOut className="size-4 hidden sm:block" />
              Sign out
            </button>
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0">
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              <div>
                <h2 className="font-serif text-3xl">Overview</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your orders, addresses and measurements in one place.
                </p>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {[
                  {
                    label: "Orders",
                    value: String(placedOrders.length),
                    icon: Package,
                    onClick: () => setActiveTab("orders"),
                  },
                  {
                    label: "Addresses",
                    value: String(addresses?.length ?? 0),
                    icon: MapPin,
                    onClick: () => setActiveTab("addresses"),
                  },
                  {
                    label: "Measurements",
                    value: savedTailorSlip ? "Saved" : "Not yet",
                    icon: Ruler,
                    onClick: () => navigate({ to: "/measurements" }),
                  },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <button
                      key={stat.label}
                      onClick={stat.onClick}
                      className="group text-left bg-white border border-black/10 rounded-md p-3 sm:p-5 hover:border-[#6B2C3A]/40 transition-colors flex items-center justify-between gap-2 min-w-0"
                    >
                      <div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                          <Icon className="size-3.5 hidden sm:block shrink-0" />
                          {stat.label}
                        </p>
                        <p className="text-lg sm:text-2xl font-medium mt-1 tabular-nums truncate">
                          {stat.value}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-[#6B2C3A] transition-colors hidden sm:block" />
                    </button>
                  );
                })}
              </div>

              {/* Latest order */}
              {latestOrder && (
                <section className="bg-white border border-black/10 rounded-md p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-serif text-xl">Latest order</h3>
                    <button
                      onClick={() => setActiveTab("orders")}
                      className="text-xs text-[#6B2C3A] hover:underline underline-offset-4"
                    >
                      View all orders
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div>
                      <span className="font-medium">
                        Order #{latestOrder.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        ·{" "}
                        {new Date(latestOrder.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        · {gbp(Number(latestOrder.total_amount))}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-[#6B2C3A]/5 text-[#6B2C3A] border-[#6B2C3A]/20 capitalize">
                      {latestOrder.status === "processing" ? "In production" : latestOrder.status}
                    </span>
                  </div>
                </section>
              )}

              {/* Profile details */}
              <section className="bg-white border border-black/10 rounded-md p-5 sm:p-6">
                <h3 className="font-serif text-xl">Profile details</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-5">
                  This name is used on your orders and invoices.
                </p>
                <form
                  onSubmit={handleUpdateProfile}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <div>
                    <label htmlFor="profile-name" className="block text-xs font-medium mb-1.5">
                      Full name
                    </label>
                    <input
                      id="profile-name"
                      name="name"
                      defaultValue={displayName}
                      className="w-full border border-black/15 px-3 py-2.5 text-sm rounded-sm bg-white focus:outline-none focus:border-[#6B2C3A]"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-email" className="block text-xs font-medium mb-1.5">
                      Email
                    </label>
                    <input
                      id="profile-email"
                      value={user.email}
                      disabled
                      className="w-full border border-black/10 px-3 py-2.5 text-sm rounded-sm bg-black/[0.03] text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button type="submit" className="btn-primary !py-2.5 !px-6 !text-xs">
                      Save changes
                    </button>
                  </div>
                </form>
              </section>

              {/* Measurements */}
              <section className="bg-white border border-black/10 rounded-md p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-xl">Measurements & tailor slip</h3>
                    {savedTailorSlip ? (
                      <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-5 gap-y-1">
                        <span>
                          Ref{" "}
                          <span className="text-foreground font-medium">
                            #{savedTailorSlip.refId || "N/A"}
                          </span>
                        </span>
                        <span>
                          Fit{" "}
                          <span className="text-foreground font-medium capitalize">
                            {savedTailorSlip.fitPreference || "Regular"}
                          </span>
                        </span>
                        <span>
                          Unit{" "}
                          <span className="text-foreground font-medium capitalize">
                            {savedTailorSlip.unit || "inches"}
                          </span>
                        </span>
                        {savedTailorSlip.savedAt && (
                          <span>
                            Saved {new Date(savedTailorSlip.savedAt).toLocaleDateString("en-GB")}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        Save your measurements once and we'll tailor every outfit to fit.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate({ to: "/measurements" })}
                    className={`${savedTailorSlip ? "btn-outline" : "btn-primary"} !py-2.5 !px-5 !text-xs shrink-0`}
                  >
                    {savedTailorSlip ? "Update measurements" : "Add measurements"}
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === "orders" && (
            <div>
              <div className="mb-6">
                <h2 className="font-serif text-3xl">My Orders</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Track your orders, download invoices or get help.
                </p>
              </div>

              <OrderHistoryView orders={orders || []} onOrderCancelled={() => refetchOrders()} />
            </div>
          )}

          {activeTab === "addresses" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
                <div>
                  <h2 className="font-serif text-3xl">Addresses</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Where should we deliver your outfits?
                  </p>
                </div>
                {!isAddingAddress && !editingAddress && addresses?.length ? (
                  <button
                    onClick={startAddAddress}
                    className="btn-primary !py-2.5 !px-5 !text-xs inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
                  >
                    <Plus className="size-3.5" />
                    Add address
                  </button>
                ) : null}
              </div>

              {(isAddingAddress || editingAddress) && (
                <div
                  ref={addressFormRef as any}
                  className="bg-white border border-black/10 rounded-md p-5 sm:p-6 md:p-8 mb-6"
                >
                  <div className="pb-4 mb-6 border-b border-black/5">
                    <h3 className="font-serif text-xl">
                      {editingAddress ? "Edit address" : "New address"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {editingAddress
                        ? `Editing details for ${editingAddress.full_name}`
                        : "Enter the delivery details"}
                    </p>
                  </div>

                  <AddressForm
                    key={editingAddress ? `edit-${editingAddress.id}` : "new-address"}
                    initialData={editingAddress}
                    onSubmit={handleSaveAddress}
                    onCancel={() => {
                      setEditingAddress(null);
                      setIsAddingAddress(false);
                    }}
                    isSubmitting={addressSubmitting}
                    submitLabel={editingAddress ? "Update Address" : "Save Address"}
                  />
                </div>
              )}

              {!addresses?.length ? (
                !isAddingAddress && (
                  <div className="py-14 text-center space-y-3 bg-white border border-dashed border-black/15 rounded-md">
                    <MapPin className="size-8 text-muted-foreground/40 mx-auto" />
                    <h3 className="font-serif text-xl">No saved addresses</h3>
                    <p className="text-xs text-muted-foreground">
                      Add one now to check out faster.
                    </p>
                    <button
                      onClick={startAddAddress}
                      className="btn-primary !py-2.5 !px-5 !text-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="size-3.5" />
                      Add address
                    </button>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((address) => {
                    const isCurrentlyEditing = editingAddress?.id === address.id;
                    const isDeletingThis = deletingAddressId === address.id;
                    const isDefaultAddress =
                      Boolean(address.is_default) || defaultAddressId === address.id;
                    const TypeIcon =
                      address.type === "Home" ? Home : address.type === "Work" ? Briefcase : MapPin;

                    return (
                      <div
                        key={address.id}
                        className={`bg-white border rounded-md p-5 flex flex-col transition-colors ${
                          isCurrentlyEditing
                            ? "border-[#6B2C3A] ring-2 ring-[#6B2C3A]/15"
                            : isDefaultAddress
                              ? "border-[#6B2C3A]/40"
                              : "border-black/10 hover:border-black/25"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                            <TypeIcon className="size-3.5" />
                            {address.type || "Address"}
                          </span>
                          {isDefaultAddress && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#6B2C3A] bg-[#6B2C3A]/[0.07] border border-[#6B2C3A]/20 px-2 py-0.5 rounded-full">
                              <Star className="size-2.5 fill-current" /> Default
                            </span>
                          )}
                        </div>

                        <p className="font-medium">{address.full_name}</p>
                        <div className="text-sm text-muted-foreground leading-relaxed mt-1 flex-1">
                          <p>{address.street}</p>
                          {address.apartment && <p>{address.apartment}</p>}
                          <p>
                            {address.city}
                            {address.state ? `, ${address.state}` : ""} {address.zip}
                          </p>
                          <p>{address.country}</p>
                          {address.phone && (
                            <p className="mt-2 text-xs text-foreground/70">{address.phone}</p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between gap-2 text-xs min-h-[38px]">
                          {confirmDeleteId === address.id ? (
                            <div className="flex items-center justify-between w-full gap-2">
                              <span className="text-destructive font-medium">
                                Remove this address?
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="border border-black/15 px-2.5 py-1 rounded-sm hover:bg-black/5"
                                >
                                  Keep
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAddress(address.id)}
                                  disabled={isDeletingThis}
                                  className="bg-destructive text-white px-2.5 py-1 rounded-sm hover:opacity-90 inline-flex items-center gap-1"
                                >
                                  {isDeletingThis && <Loader2 className="size-3 animate-spin" />}
                                  {isDeletingThis ? "Removing..." : "Remove"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-4 font-medium">
                                <button
                                  type="button"
                                  onClick={() => startEditAddress(address)}
                                  className="text-[#6B2C3A] hover:underline underline-offset-4 inline-flex items-center gap-1"
                                >
                                  <Edit2 className="size-3" />
                                  {isCurrentlyEditing ? "Editing" : "Edit"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(address.id)}
                                  className="text-destructive/80 hover:text-destructive hover:underline underline-offset-4 inline-flex items-center gap-1"
                                >
                                  <Trash2 className="size-3" />
                                  Remove
                                </button>
                              </div>
                              {!isDefaultAddress && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAddress(address.id)}
                                  className="text-muted-foreground hover:text-foreground underline underline-offset-4"
                                >
                                  Set as default
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
