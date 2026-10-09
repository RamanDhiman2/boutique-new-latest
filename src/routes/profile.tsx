import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const { clear } = useCart();
  const navigate = useNavigate();

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

  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: addresses, refetch: refetchAddresses } = useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("addresses").select("*").eq("user_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: orders, refetch: refetchOrders } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("user_id", user?.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleLogout = async () => {
    clear();
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate({ to: "/" });
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    const { error } = await supabase.rpc("cancel_order_secure", { order_id: orderId });
    if (error) toast.error(error.message);
    else {
      toast.success("Order cancelled securely");
      refetchOrders();
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Delete this address?")) return;
    const { error } = await supabase.from("addresses").delete().eq("id", addressId);
    if (error) toast.error(error.message);
    else {
      toast.success("Address deleted");
      refetchAddresses();
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated successfully");
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] px-5 lg:px-10 py-20">
      <h1 className="text-4xl mb-2">My Account</h1>
      <p className="text-muted-foreground mb-10">Welcome back, {user.user_metadata?.full_name || user.email}</p>

      <div className="grid md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <button onClick={() => setActiveTab("dashboard")} className={`block w-full text-left p-4 ${activeTab === "dashboard" ? "bg-muted font-medium" : "hover:bg-muted transition-colors"}`}>Dashboard</button>
          <button onClick={() => setActiveTab("orders")} className={`block w-full text-left p-4 ${activeTab === "orders" ? "bg-muted font-medium" : "hover:bg-muted transition-colors"}`}>Order History</button>
          <button onClick={() => setActiveTab("addresses")} className={`block w-full text-left p-4 ${activeTab === "addresses" ? "bg-muted font-medium" : "hover:bg-muted transition-colors"}`}>Addresses</button>
          <button onClick={handleLogout} className="block w-full text-left p-4 hover:bg-muted transition-colors text-destructive">Logout</button>
        </div>
        <div className="md:col-span-3 border p-10">
          {activeTab === "dashboard" && (
            <>
              <h2 className="text-2xl mb-6">Dashboard</h2>
              <p className="text-muted-foreground mb-8">From your account dashboard you can view your recent orders, manage your shipping and billing addresses, and edit your password and account details.</p>

              <h3 className="text-xl mb-4">Edit Profile</h3>
              <form onSubmit={handleUpdateProfile} className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input name="name" defaultValue={user.user_metadata?.full_name || ""} className="w-full border p-2 rounded-sm" placeholder="Your Name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input value={user.email} disabled className="w-full border p-2 rounded-sm bg-muted text-muted-foreground cursor-not-allowed" />
                </div>
                <button type="submit" className="btn-primary">Save Changes</button>
              </form>
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
                          <div className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">£{order.total_amount}</div>
                          <div className={`text-sm uppercase ${order.status === 'cancelled' ? 'text-destructive' : 'text-primary'}`}>{order.status}</div>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        {order.order_items.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.product_id} (Size: {item.size})</span>
                            <span>£{item.price}</span>
                          </div>
                        ))}
                      </div>
                      {order.status === "processing" && (
                        <div className="border-t pt-4 text-right">
                          <button onClick={() => handleCancelOrder(order.id)} className="text-sm text-destructive hover:underline">Cancel Order</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "addresses" && (
            <>
              <h2 className="text-2xl mb-6">Saved Addresses</h2>
              {!addresses?.length ? (
                <p className="text-muted-foreground">You haven't saved any addresses yet.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {addresses.map((address) => (
                    <div key={address.id} className="border p-6 rounded-lg relative group">
                      <span className="absolute top-4 right-4 text-xs uppercase bg-muted px-2 py-1 rounded">{address.type}</span>
                      <div className="font-medium mb-2">{address.full_name}</div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{address.street}</p>
                        <p>{address.city}, {address.state} {address.zip}</p>
                        <p>{address.country}</p>
                        <p className="mt-2">Phone: {address.phone}</p>
                      </div>
                      <div className="mt-4 pt-4 border-t flex justify-between text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-primary hover:underline">Edit</button>
                        <button onClick={() => handleDeleteAddress(address.id)} className="text-destructive hover:underline">Remove</button>
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
