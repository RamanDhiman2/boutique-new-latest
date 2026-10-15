import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase, type AddressRecord, type OrderRecord } from "@/lib/supabase";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { Download, Package, CheckCircle, Truck, XCircle, Edit2, Trash2, Plus, Loader2, Star, Home, Briefcase, MapPin } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
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

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    const { error } = await supabase.rpc("cancel_order_secure", { order_id: orderId });
    if (error && typeof error === "object" && "message" in error) {
      toast.error(String((error as { message: string }).message));
    } else {
      toast.success("Order cancelled securely");
      refetchOrders();
    }
  };

  const handleExportPdf = (order: OrderRecord) => {
    const doc = new jsPDF();
    doc.text(`Order Invoice #${order.id.slice(0, 8)}`, 14, 18);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 14, 26);
    doc.text(`Payment: ${(order.payment_status || "unpaid").toUpperCase()}`, 14, 34);
    doc.text(`Fulfillment: ${order.status.toUpperCase()}`, 14, 42);
    
    autoTable(doc, {
      startY: 50,
      head: [["Item", "Size", "Quantity", "Price", "Total"]],
      body: order.order_items.map((it) => [
        it.product_id,
        it.size,
        it.quantity,
        `£${it.price}`,
        `£${it.price * it.quantity}`,
      ]),
      foot: [["", "", "", "Total", `£${order.total_amount}`]],
    });

    doc.save(`Order_${order.id.slice(0, 8)}.pdf`);
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
      const { error: delError } = await supabase
        .from("addresses")
        .delete()
        .eq("id", addressId);

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
              localStorage.getItem(`deleted_addrs_${user.id}`) || "[]"
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
      const { error: rpcError } = await supabase.rpc("set_default_address", { p_address_id: addressId });
      if (rpcError) {
        // Fallback: update is_default directly in table if column exists
        await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);

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
          if (errMsg.includes("column") || errMsg.includes("schema cache") || (updateRes.error as any).code === "PGRST204") {
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
        let insertRes = await supabase
          .from("addresses")
          .insert(extendedPayload)
          .select()
          .single();

        // Fallback to base payload if remote schema doesn't have new columns yet
        if (insertRes.error) {
          const errMsg = insertRes.error.message || "";
          if (errMsg.includes("column") || errMsg.includes("schema cache") || (insertRes.error as any).code === "PGRST204") {
            insertRes = await supabase
              .from("addresses")
              .insert(basePayload)
              .select()
              .single();
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

  const renderTimeline = (status: string) => {
    const s = status.toLowerCase();
    const isCancelled = s === "cancelled";
    
    const steps = [
      { id: "processing", label: "Processing", icon: Package },
      { id: "shipped", label: "Shipped", icon: Truck },
      { id: "delivered", label: "Delivered", icon: CheckCircle },
    ];

    if (isCancelled) {
      return (
        <div className="flex items-center gap-4 text-destructive p-4 border border-destructive/20 rounded-md bg-destructive/5 mt-6">
          <XCircle className="size-6" />
          <div>
            <div className="font-semibold uppercase tracking-wider text-sm">Order Cancelled</div>
            <div className="text-sm opacity-80 mt-1">This order has been cancelled and will not be fulfilled.</div>
          </div>
        </div>
      );
    }

    let currentStepIdx = 0;
    if (s === "shipped") currentStepIdx = 1;
    if (s === "delivered") currentStepIdx = 2;

    return (
      <div className="mt-4 mb-2 relative">
        <div className="absolute top-5 left-0 w-full h-0.5 bg-border -z-10 hidden sm:block"></div>
        <div className="flex flex-col sm:flex-row justify-between gap-6 sm:gap-0">
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex sm:flex-col items-center gap-4 sm:gap-3 text-center bg-card">
                <div 
                  className={`size-10 rounded-full flex items-center justify-center border-2 shrink-0 ${
                    isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="size-5" />
                </div>
                <div>
                  <div className={`font-medium text-sm ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </div>
                  {isCurrent && <div className="text-xs text-primary mt-1">Current Status</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10 pt-4 pb-20">
      <SiteBreadcrumb items={[{ label: "My Account" }]} />
      <h1 className="text-3xl sm:text-4xl mt-4 sm:mt-6 mb-2">My Account</h1>
      <p className="text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-10">
        Welcome back, {user.user_metadata?.["full_name"] || user.email}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-10">
        <div className="flex md:flex-col overflow-x-auto gap-2 no-scrollbar pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`whitespace-nowrap px-4 py-3 text-xs sm:text-sm rounded-sm text-left ${activeTab === "dashboard" ? "bg-muted font-medium" : "hover:bg-muted transition-colors"}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`whitespace-nowrap px-4 py-3 text-xs sm:text-sm rounded-sm text-left ${activeTab === "orders" ? "bg-muted font-medium" : "hover:bg-muted transition-colors"}`}
          >
            Order History
          </button>
          <button
            onClick={() => setActiveTab("addresses")}
            className={`whitespace-nowrap px-4 py-3 text-xs sm:text-sm rounded-sm text-left ${activeTab === "addresses" ? "bg-muted font-medium" : "hover:bg-muted transition-colors"}`}
          >
            Addresses
          </button>
          <button
            onClick={handleLogout}
            className="whitespace-nowrap px-4 py-3 text-xs sm:text-sm rounded-sm text-left hover:bg-muted transition-colors text-destructive"
          >
            Logout
          </button>
        </div>
        <div className="md:col-span-3 border p-4 sm:p-6 md:p-10 rounded-sm bg-card">
          {activeTab === "dashboard" && (
            <>
              <h2 className="text-2xl mb-6">Dashboard</h2>
              <p className="text-muted-foreground mb-8">
                From your account dashboard you can view your recent orders, manage your shipping
                and billing addresses, and edit your password and account details.
              </p>

              <h3 className="text-xl mb-4">Edit Profile</h3>
              <form onSubmit={handleUpdateProfile} className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input
                    name="name"
                    defaultValue={String(user.user_metadata?.["full_name"] || "")}
                    className="w-full border p-2 rounded-sm"
                    placeholder="Your Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    value={user.email}
                    disabled
                    className="w-full border p-2 rounded-sm bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </form>

              {/* Saved Bespoke Measurements / Tailor Slip */}
              <div className="mt-10 border-t pt-8">
                <h3 className="text-xl mb-4">Saved Measurements & Tailor Slip</h3>
                {savedTailorSlip ? (
                  <div className="border p-6 rounded-lg bg-card space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        Tailor Reference #{savedTailorSlip.refId || "N/A"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {savedTailorSlip.savedAt
                          ? new Date(savedTailorSlip.savedAt).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-6">
                      <div>
                        Fit:{" "}
                        <span className="font-medium text-foreground capitalize">
                          {savedTailorSlip.fitPreference || "Regular"}
                        </span>
                      </div>
                      <div>
                        Unit:{" "}
                        <span className="font-medium text-foreground capitalize">
                          {savedTailorSlip.unit || "inches"}
                        </span>
                      </div>
                      {savedTailorSlip.customerName && (
                        <div>
                          Customer:{" "}
                          <span className="font-medium text-foreground">
                            {savedTailorSlip.customerName}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => navigate({ to: "/measurements" })}
                        className="btn-outline !py-1.5 !px-3 !text-xs"
                      >
                        Review / Update Measurements
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed p-6 rounded-lg text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      No bespoke measurement slip saved yet.
                    </p>
                    <button
                      onClick={() => navigate({ to: "/measurements" })}
                      className="btn-primary !py-2 !px-4 !text-xs"
                    >
                      Create Custom Measurement Slip
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "orders" && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h2 className="text-2xl font-serif">Order History</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Track shipments, view detailed invoice receipts, and manage your orders
                  </p>
                </div>
              </div>

              <OrderHistoryView
                orders={orders || []}
                onOrderCancelled={() => refetchOrders()}
              />
            </>
          )}

          {activeTab === "addresses" && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-serif">Saved Addresses</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage your delivery and billing addresses</p>
                </div>
                {!isAddingAddress && (
                  <button
                    onClick={startAddAddress}
                    className="btn-primary !py-2.5 !px-4 !text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto"
                  >
                    <Plus className="size-3.5" />
                    + Add New Address
                  </button>
                )}
              </div>

              {(isAddingAddress || editingAddress) && (
                <div
                  ref={addressFormRef as any}
                  className="border p-4 sm:p-6 md:p-8 rounded-lg mb-8 bg-card shadow-sm max-w-2xl transition-all"
                >
                  <div className="flex items-center justify-between pb-4 mb-6 border-b">
                    <div>
                      <h3 className="font-serif font-medium text-lg sm:text-xl">
                        {editingAddress ? `Edit Address` : "Add New Delivery Address"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {editingAddress ? `Editing details for ${editingAddress.full_name}` : "Enter delivery destination details"}
                      </p>
                    </div>
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
                <div className="p-6 sm:p-8 border rounded-lg text-center bg-card">
                  <p className="text-sm text-muted-foreground mb-4">You haven't saved any addresses yet.</p>
                  {!isAddingAddress && (
                    <button
                      onClick={startAddAddress}
                      className="btn-primary !py-2.5 !px-4 !text-xs w-full sm:w-auto"
                    >
                      + Add Your First Address
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {addresses.map((address) => {
                    const isCurrentlyEditing = editingAddress?.id === address.id;
                    const isDeletingThis = deletingAddressId === address.id;
                    const isDefaultAddress = Boolean(address.is_default) || localStorage.getItem(`default_addr_${user.id}`) === address.id;

                    return (
                      <div
                        key={address.id}
                        className={`border p-6 rounded-lg relative group bg-card transition-all ${
                          isCurrentlyEditing
                            ? "border-primary ring-2 ring-primary/20 shadow-md"
                            : isDefaultAddress
                            ? "border-[#6B2C3A]/40 ring-1 ring-[#6B2C3A]/20"
                            : "hover:border-primary/40"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-base flex items-center gap-2">
                            <span>{address.full_name}</span>
                            {isDefaultAddress && (
                              <span className="text-[10px] font-semibold tracking-wider uppercase bg-[#6B2C3A] text-white px-2 py-0.5 rounded flex items-center gap-1">
                                <Star className="size-2.5 fill-current" /> Default
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isCurrentlyEditing && (
                              <span className="text-[10px] font-medium uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                Editing
                              </span>
                            )}
                            <span className="text-xs uppercase bg-muted px-2 py-1 rounded flex items-center gap-1">
                              {address.type === "Home" ? <Home className="size-3" /> : address.type === "Work" ? <Briefcase className="size-3" /> : <MapPin className="size-3" />}
                              {address.type}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>{address.street}</p>
                          {address.apartment && (
                            <p className="text-xs opacity-90">{address.apartment}</p>
                          )}
                          <p>
                            {address.city}, {address.state} {address.zip}
                          </p>
                          <p>{address.country}</p>
                          <p className="mt-2 text-foreground/80 font-mono text-xs">
                            Phone: {address.phone}
                          </p>
                        </div>

                        <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm min-h-[42px]">
                          {confirmDeleteId === address.id ? (
                            <div className="flex items-center justify-between w-full bg-destructive/5 border border-destructive/20 p-2 rounded">
                              <span className="text-xs text-destructive font-medium">Delete address?</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAddress(address.id)}
                                  disabled={isDeletingThis}
                                  className="text-xs bg-destructive text-destructive-foreground px-2.5 py-1 rounded hover:opacity-90 font-medium flex items-center gap-1"
                                >
                                  {isDeletingThis && <Loader2 className="size-3 animate-spin" />}
                                  {isDeletingThis ? "Deleting..." : "Yes, Delete"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-xs border px-2 py-1 rounded hover:bg-muted font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-4">
                                <button
                                  type="button"
                                  onClick={() => startEditAddress(address)}
                                  className={`text-sm font-medium flex items-center gap-1.5 transition-colors ${
                                    isCurrentlyEditing ? "text-primary font-semibold" : "text-primary hover:underline"
                                  }`}
                                >
                                  <Edit2 className="size-3.5" />
                                  {isCurrentlyEditing ? "Editing..." : "Edit"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(address.id)}
                                  className="text-destructive hover:underline text-sm font-medium flex items-center gap-1.5"
                                >
                                  <Trash2 className="size-3.5" />
                                  Remove
                                </button>
                              </div>

                              {!isDefaultAddress && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAddress(address.id)}
                                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
