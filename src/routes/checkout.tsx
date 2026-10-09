import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { gbp } from "@/lib/catalog";
import { supabase, type AddressRecord } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/site/Chrome";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { user, loading } = useAuth();
  const { checkoutLines, checkoutTotal, remove } = useCart();
  const navigate = useNavigate();
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      toast.error("Please login to proceed to checkout");
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  const { data: addresses, refetch } = useQuery<AddressRecord[]>({
    queryKey: ["addresses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("addresses").select("*").eq("user_id", user?.id);
      if (error) throw error;
      return (data as unknown as AddressRecord[]) ?? [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!selectedAddress && addresses && addresses.length > 0 && addresses[0]) {
      setSelectedAddress(addresses[0].id);
    }
  }, [addresses, selectedAddress]);

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }
    if (checkoutLines.length === 0) {
      toast.error("You haven't selected any items for checkout");
      return;
    }

    setIsSubmitting(true);

    try {
      // Secure Server-Side Order Creation
      const itemsPayload = checkoutLines.map((l) => ({
        product_id: l.product.id,
        size: l.size,
        quantity: l.qty,
      }));

      const { data: orderId, error: orderError } = await supabase.rpc("create_order_secure", {
        p_address_id: selectedAddress,
        p_items: itemsPayload,
      });

      if (orderError) {
        const errorMsg =
          typeof orderError === "object" && orderError && "message" in orderError
            ? String((orderError as { message: string }).message)
            : "Failed to place order";
        throw new Error(errorMsg);
      }

      toast.success("Order placed successfully!");

      // Remove purchased items from the cart
      checkoutLines.forEach((l) => remove(l.id, l.size));

      navigate({ to: "/order-success" });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) return <div className="p-20 text-center">Loading checkout...</div>;

  return (
    <div className="mx-auto max-w-5xl px-5 pt-4 pb-20">
      <SiteBreadcrumb items={[{ label: "Shopping Bag", to: "/bag" }, { label: "Checkout" }]} />
      <PageHeader eyebrow="Checkout" title="Secure Checkout" />

      <div className="grid md:grid-cols-[1fr_400px] gap-12">
        <div>
          <h2 className="text-2xl mb-6">1. Delivery Address</h2>

          {addresses && addresses.length > 0 ? (
            <div className="space-y-4 mb-8">
              {addresses.map((address) => (
                <label
                  key={address.id}
                  className={`block border p-4 rounded-lg cursor-pointer transition-colors ${selectedAddress === address.id ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="address"
                      className="mt-1"
                      checked={selectedAddress === address.id}
                      onChange={() => setSelectedAddress(address.id)}
                    />
                    <div>
                      <div className="font-medium">
                        {address.full_name}{" "}
                        <span className="text-xs uppercase bg-muted px-2 py-0.5 rounded ml-2">
                          {address.type}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {address.street}, {address.city}, {address.state} {address.zip}
                        <br />
                        {address.country}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const { data, error } = await supabase
                  .from("addresses")
                  .insert({
                    user_id: user!.id,
                    type: "Shipping",
                    full_name: String(fd.get("full_name") || ""),
                    street: String(fd.get("street") || ""),
                    city: String(fd.get("city") || ""),
                    state: String(fd.get("state") || ""),
                    zip: String(fd.get("zip") || ""),
                    phone: String(fd.get("phone") || ""),
                  })
                  .select()
                  .single();
                if (error) {
                  toast.error("Failed to save address");
                  return;
                }
                toast.success("Address saved!");
                refetch();
                if (data && typeof data === "object" && "id" in data) {
                  setSelectedAddress(String((data as { id: string }).id));
                }
              }}
              className="border p-6 rounded-lg mb-8 space-y-4"
            >
              <h3 className="font-medium mb-4">Add Delivery Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Full Name</Label>
                  <Input name="full_name" required />
                </div>
                <div className="col-span-2">
                  <Label>Street Address</Label>
                  <Input name="street" required />
                </div>
                <div>
                  <Label>City</Label>
                  <Input name="city" required />
                </div>
                <div>
                  <Label>State/County</Label>
                  <Input name="state" required />
                </div>
                <div>
                  <Label>Postcode/Zip</Label>
                  <Input name="zip" required />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input name="phone" required />
                </div>
              </div>
              <button type="submit" className="btn-primary mt-4">
                Save Address
              </button>
            </form>
          )}

          <h2 className="text-2xl mb-6">2. Payment Method</h2>
          <div className="border p-6 rounded-lg bg-muted/50 mb-8">
            <p className="text-sm text-muted-foreground">
              Payment gateway integration (e.g. Stripe/Razorpay) will appear here. For this demo,
              clicking "Place Order" will simulate a successful payment.
            </p>
          </div>
        </div>

        <div>
          <div className="bg-secondary/30 p-6 rounded-lg sticky top-24 border">
            <h3 className="font-serif text-2xl mb-6">Order Summary</h3>
            <div className="space-y-4 mb-6">
              {checkoutLines.map((l) => (
                <div key={l.id + l.size} className="flex gap-4 text-sm">
                  <div className="relative">
                    <img
                      src={l.product.images[0]}
                      alt=""
                      className="w-16 aspect-[3/4] object-cover rounded-sm"
                    />
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs size-5 flex items-center justify-center rounded-full">
                      {l.qty}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{l.product.name}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">Size: {l.size}</div>
                  </div>
                  <div className="font-medium">{gbp(l.product.price * l.qty)}</div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{gbp(checkoutTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between font-serif text-xl pt-4 border-t mt-4">
                <span>Total</span>
                <span>{gbp(checkoutTotal)}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting || checkoutLines.length === 0}
              className="w-full mt-8 py-4 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors uppercase tracking-wider text-sm disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : "Place Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
