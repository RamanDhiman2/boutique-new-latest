import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase, type AddressRecord, type OrderRecord } from "@/lib/supabase";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const { clear } = useCart();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [editingAddress, setEditingAddress] = useState<AddressRecord | null>(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
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
      return (data as unknown as AddressRecord[]) ?? [];
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
    await supabase.auth.signOut();
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
    doc.text(`Order Invoice #${order.id.slice(0, 8)}`, 14, 20);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 14, 30);
    doc.text(`Status: ${order.status.toUpperCase()}`, 14, 40);

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

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Delete this address?")) return;
    const { error } = await supabase.from("addresses").delete().eq("id", addressId);
    if (error && typeof error === "object" && "message" in error) {
      toast.error(String((error as { message: string }).message));
    } else {
      toast.success("Address deleted");
      refetchAddresses();
    }
  };

  const handleSaveAddress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const addressData = {
      type: String(fd.get("type") || "Shipping").trim(),
      full_name: String(fd.get("full_name") || "").trim(),
      street: String(fd.get("street") || "").trim(),
      city: String(fd.get("city") || "").trim(),
      state: String(fd.get("state") || "").trim(),
      zip: String(fd.get("zip") || "").trim(),
      country: String(fd.get("country") || "United Kingdom").trim(),
      phone: String(fd.get("phone") || "").trim(),
    };

    if (!addressData.full_name || !addressData.street || !addressData.city || !addressData.zip) {
      toast.error("Please fill in all required address fields");
      return;
    }

    if (editingAddress) {
      const { error } = await supabase
        .from("addresses")
        .update(addressData)
        .eq("id", editingAddress.id);
      if (error && typeof error === "object" && "message" in error) {
        toast.error(String((error as { message: string }).message));
      } else {
        toast.success("Address updated successfully");
        setEditingAddress(null);
        setIsAddingAddress(false);
        refetchAddresses();
      }
    } else {
      const { error } = await supabase
        .from("addresses")
        .insert({
          ...addressData,
          user_id: user.id,
        })
        .select()
        .single();
      if (error && typeof error === "object" && "message" in error) {
        toast.error(String((error as { message: string }).message));
      } else {
        toast.success("Address added successfully");
        setIsAddingAddress(false);
        setEditingAddress(null);
        refetchAddresses();
      }
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

  return (
    <div className="mx-auto max-w-[1500px] px-5 lg:px-10 pt-4 pb-20">
      <SiteBreadcrumb items={[{ label: "My Account" }]} />
      <h1 className="text-4xl mt-6 mb-2">My Account</h1>
      <p className="text-muted-foreground mb-10">
        Welcome back, {user.user_metadata?.["full_name"] || user.email}
      </p>

      <div className="grid md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`block w-full text-left p-4 ${activeTab === "dashboard" ? "bg-muted font-medium" : "hover:bg-muted transition-colors"}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`block w-full text-left p-4 ${activeTab === "orders" ? "bg-muted font-medium" : "hover:bg-muted transition-colors"}`}
          >
            Order History
          </button>
          <button
            onClick={() => setActiveTab("addresses")}
            className={`block w-full text-left p-4 ${activeTab === "addresses" ? "bg-muted font-medium" : "hover:bg-muted transition-colors"}`}
          >
            Addresses
          </button>
          <button
            onClick={handleLogout}
            className="block w-full text-left p-4 hover:bg-muted transition-colors text-destructive"
          >
            Logout
          </button>
        </div>
        <div className="md:col-span-3 border p-10">
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
              <h2 className="text-2xl mb-6">Order History</h2>
              {!orders?.length ? (
                <p className="text-muted-foreground">You haven't placed any orders yet.</p>
              ) : (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div key={order.id} className="border p-6 rounded-lg">
                      <div className="flex justify-between items-center mb-4 pb-4 border-b">
                        <div>
                          <div className="font-medium">Order #{order.id.slice(0, 8)}</div>
                          <div className="text-sm text-muted-foreground" suppressHydrationWarning>
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">£{order.total_amount}</div>
                          <div
                            className={`text-sm uppercase ${order.status === "cancelled" ? "text-destructive" : "text-primary"}`}
                          >
                            {order.status}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>
                              {item.quantity}x {item.product_id} (Size: {item.size})
                            </span>
                            <span>£{item.price}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-4 flex justify-end items-center gap-6 text-sm">
                        <button
                          onClick={() => handleExportPdf(order)}
                          className="flex items-center gap-1.5 text-primary hover:underline font-medium"
                        >
                          <Download className="size-4" /> Export PDF
                        </button>
                        {order.status === "processing" && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="text-destructive hover:underline font-medium"
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "addresses" && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl">Saved Addresses</h2>
                {!isAddingAddress && !editingAddress && (
                  <button
                    onClick={() => setIsAddingAddress(true)}
                    className="btn-primary !py-2 !px-4 !text-xs"
                  >
                    + Add New Address
                  </button>
                )}
              </div>

              {(isAddingAddress || editingAddress) && (
                <form
                  key={editingAddress ? `edit-${editingAddress.id}` : "add-new-address"}
                  onSubmit={handleSaveAddress}
                  className="border p-6 rounded-lg mb-8 bg-muted/20 space-y-4 max-w-xl"
                >
                  <h3 className="font-medium text-lg mb-4">
                    {editingAddress ? "Edit Address" : "Add New Address"}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="addr-type">Address Type</Label>
                      <Input
                        id="addr-type"
                        name="type"
                        defaultValue={editingAddress?.type || "Shipping"}
                        placeholder="e.g. Shipping / Billing"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="addr-name">Full Name</Label>
                      <Input
                        id="addr-name"
                        name="full_name"
                        defaultValue={editingAddress?.full_name || ""}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="addr-street">Street Address</Label>
                      <Input
                        id="addr-street"
                        name="street"
                        defaultValue={editingAddress?.street || ""}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="addr-city">City</Label>
                      <Input
                        id="addr-city"
                        name="city"
                        defaultValue={editingAddress?.city || ""}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="addr-state">State / County</Label>
                      <Input
                        id="addr-state"
                        name="state"
                        defaultValue={editingAddress?.state || ""}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="addr-zip">Postcode / Zip</Label>
                      <Input
                        id="addr-zip"
                        name="zip"
                        defaultValue={editingAddress?.zip || ""}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="addr-country">Country</Label>
                      <Input
                        id="addr-country"
                        name="country"
                        defaultValue={editingAddress?.country || "United Kingdom"}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="addr-phone">Phone Number</Label>
                      <Input
                        id="addr-phone"
                        name="phone"
                        defaultValue={editingAddress?.phone || ""}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="btn-primary !py-2 !px-5 !text-xs">
                      {editingAddress ? "Save Changes" : "Add Address"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddress(null);
                        setIsAddingAddress(false);
                      }}
                      className="btn-outline !py-2 !px-5 !text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {!addresses?.length ? (
                <p className="text-muted-foreground">You haven't saved any addresses yet.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {addresses.map((address) => (
                    <div key={address.id} className="border p-6 rounded-lg relative group bg-card">
                      <span className="absolute top-4 right-4 text-xs uppercase bg-muted px-2 py-1 rounded">
                        {address.type}
                      </span>
                      <div className="font-medium mb-2">{address.full_name}</div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{address.street}</p>
                        <p>
                          {address.city}, {address.state} {address.zip}
                        </p>
                        <p>{address.country}</p>
                        <p className="mt-2">Phone: {address.phone}</p>
                      </div>
                      <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                        <button
                          onClick={() => {
                            setIsAddingAddress(false);
                            setEditingAddress(address);
                          }}
                          className="text-primary hover:underline font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(address.id)}
                          className="text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
