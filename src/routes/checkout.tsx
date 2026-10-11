import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { gbp } from "@/lib/catalog";
import { supabase, type AddressRecord } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ShieldCheck, ChevronDown, ChevronUp, MapPin, AlertCircle, RefreshCw } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function StripeCheckoutForm({
  orderId,
  totalFormatted,
  userEmail,
  onPaymentSuccess,
}: {
  orderId: string;
  totalFormatted: string;
  userEmail?: string | undefined;
  onPaymentSuccess: (orderId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (isProcessing) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Validate customer input on Elements
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message || "Please check your payment details.");
        setIsProcessing(false);
        return;
      }

      const returnUrl = `${window.location.origin}/order-success?order_id=${encodeURIComponent(orderId)}`;

      const confirmParams: any = {
        return_url: returnUrl,
      };

      if (userEmail) {
        confirmParams.receipt_email = userEmail;
        confirmParams.payment_method_data = {
          billing_details: {
            email: userEmail,
          },
        };
      }

      const result = await stripe.confirmPayment({
        elements,
        confirmParams,
        redirect: "if_required",
      });

      if (result.error) {
        const msg = result.error.message || "Payment authorization failed. Please try again.";
        setErrorMessage(msg);
        toast.error(msg);
        setIsProcessing(false);
        return;
      }

      const paymentIntent = result.paymentIntent;
      if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
        onPaymentSuccess(orderId);
      } else {
        window.location.href = returnUrl;
      }
    } catch (err: any) {
      console.error("Payment submission error:", err);
      const msg = err.message || "An unexpected network error occurred.";
      setErrorMessage(msg);
      toast.error(msg);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",
          ...(userEmail
            ? {
                defaultValues: {
                  billingDetails: {
                    email: userEmail,
                  },
                },
              }
            : {}),
        }}
      />

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm flex items-start gap-2">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full py-4 bg-[#6B2C3A] text-white text-xs uppercase tracking-widest font-semibold hover:bg-[#52222C] disabled:opacity-50 transition-colors shadow-sm rounded-sm flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Authorizing Payment...</span>
          </>
        ) : (
          <>
            <Lock className="size-3.5" />
            <span>Pay & Complete Order ({totalFormatted})</span>
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="size-3.5 text-emerald-600" />
        <span>Card details encrypted and processed securely by Stripe</span>
      </div>
    </form>
  );
}

function CheckoutPage() {
  const { user, loading } = useAuth();
  const { checkoutLines, checkoutTotal, remove } = useCart();
  const navigate = useNavigate();
  
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>("");

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

  const initializeCheckout = async (isRetry = false) => {
    if (!selectedAddress || checkoutLines.length === 0 || !user) return;

    // Retain stable idempotency key for this attempt; generate only if empty
    if (!isRetry && !idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `chk_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    }

    setIsInitializing(true);
    setInitError(null);

    try {
      const itemsPayload = checkoutLines.map((l) => ({
        product_id: l.product.id,
        size: l.size,
        quantity: l.qty,
      }));

      const res = await supabase.functions.invoke("create-payment-intent", {
        body: {
          address_id: selectedAddress,
          items: itemsPayload,
          idempotency_key: idempotencyKeyRef.current,
        },
      });

      if (res.error) {
        throw new Error(res.error.message || "Failed to initialize payment gateway");
      }

      const resData = res.data as { clientSecret?: string; orderId?: string; error?: string } | null;

      if (!resData || !resData.clientSecret || !resData.orderId) {
        throw new Error(resData?.error || "Invalid response from payment gateway");
      }

      setClientSecret(resData.clientSecret);
      setCreatedOrderId(resData.orderId);
    } catch (err: any) {
      console.error("Payment init error:", err);
      setInitError(err.message || "Could not connect to payment gateway. Please try again.");
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (selectedAddress && checkoutLines.length > 0 && user) {
      initializeCheckout();
    }
  }, [selectedAddress, checkoutTotal, user]);

  const handlePaymentSuccess = async (confirmedOrderId: string) => {
    toast.success("Payment submitted! Verifying your order confirmation...");
    checkoutLines.forEach((l) => remove(l.id, l.size));
    navigate({
      to: "/order-success",
      search: { order_id: confirmedOrderId },
    });
  };

  const handleAddAddress = async (e: React.FormEvent<HTMLFormElement>) => {
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
        country: String(fd.get("country") || "United Kingdom"),
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
    setIsAddingAddress(false);
    if (data && typeof data === "object" && "id" in data) {
      setSelectedAddress(String((data as { id: string }).id));
      idempotencyKeyRef.current = `chk_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
      setClientSecret(null);
      setCreatedOrderId(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#FAFAF8]">
        <div className="animate-pulse text-muted-foreground font-serif text-lg tracking-wide">
          Preparing secure checkout...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] pb-24">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-10 pt-8">
        <SiteBreadcrumb items={[{ label: "Shopping Bag", to: "/bag" }, { label: "Checkout" }]} />
        
        <div className="mt-8 mb-12 flex items-center gap-3">
          <Lock className="size-5 text-muted-foreground" />
          <h1 className="text-3xl md:text-4xl font-serif tracking-tight">Secure Checkout</h1>
        </div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-12 lg:gap-20 items-start">
          
          {/* LEFT COLUMN - FORM */}
          <div className="space-y-12">
            
            {/* Section 1: Contact */}
            <section>
              <div className="flex items-center justify-between mb-6 border-b border-black/5 pb-4">
                <h2 className="text-xl font-medium tracking-wide">1. Contact Information</h2>
              </div>
              <div className="bg-white p-6 rounded-sm border border-black/5 shadow-sm">
                <div className="text-sm text-muted-foreground mb-1">Email Address</div>
                <div className="font-medium">{user.email}</div>
                <div className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
                  <ShieldCheck className="size-4" /> Account securely authenticated
                </div>
              </div>
            </section>

            {/* Section 2: Delivery */}
            <section>
              <div className="flex items-center justify-between mb-6 border-b border-black/5 pb-4">
                <h2 className="text-xl font-medium tracking-wide">2. Delivery Address</h2>
              </div>
              
              {addresses && addresses.length > 0 && !isAddingAddress ? (
                <div className="space-y-4">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`block bg-white p-5 rounded-sm border cursor-pointer transition-all ${
                        selectedAddress === address.id 
                          ? "border-[#6B2C3A] ring-1 ring-[#6B2C3A] shadow-sm" 
                          : "border-black/10 hover:border-black/30"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1 flex-shrink-0">
                          <input
                            type="radio"
                            name="address"
                            className="size-4 text-[#6B2C3A] focus:ring-[#6B2C3A]"
                            checked={selectedAddress === address.id}
                            onChange={() => {
                              setSelectedAddress(address.id);
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[15px] mb-1">
                            {address.full_name}
                            <span className="inline-block align-middle ml-2 text-[10px] uppercase tracking-wider bg-black/5 px-2 py-0.5 rounded-sm text-muted-foreground">
                              {address.type}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground leading-relaxed">
                            {address.street}<br />
                            {address.city}, {address.state} {address.zip}<br />
                            {address.country}
                          </div>
                          <div className="text-sm text-muted-foreground mt-2">
                            {address.phone}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                  <button 
                    onClick={() => setIsAddingAddress(true)}
                    className="mt-6 text-sm font-medium tracking-wide underline underline-offset-4 hover:text-[#6B2C3A] transition-colors"
                  >
                    + Add a new address
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleAddAddress}
                  className="bg-white p-6 md:p-8 rounded-sm border border-black/5 shadow-sm space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</Label>
                      <Input name="full_name" required className="mt-1.5 rounded-sm border-black/10 focus-visible:ring-[#6B2C3A]" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Street Address</Label>
                      <Input name="street" required className="mt-1.5 rounded-sm border-black/10 focus-visible:ring-[#6B2C3A]" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">City</Label>
                      <Input name="city" required className="mt-1.5 rounded-sm border-black/10 focus-visible:ring-[#6B2C3A]" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">State / County</Label>
                      <Input name="state" required className="mt-1.5 rounded-sm border-black/10 focus-visible:ring-[#6B2C3A]" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Postcode / Zip</Label>
                      <Input name="zip" required className="mt-1.5 rounded-sm border-black/10 focus-visible:ring-[#6B2C3A]" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Country</Label>
                      <Input name="country" defaultValue="United Kingdom" required className="mt-1.5 rounded-sm border-black/10 focus-visible:ring-[#6B2C3A]" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                      <Input name="phone" type="tel" required className="mt-1.5 rounded-sm border-black/10 focus-visible:ring-[#6B2C3A]" />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4 border-t border-black/5 mt-8">
                    <button type="submit" className="bg-[#1A1A1A] text-white px-8 py-3 text-sm tracking-wider uppercase font-medium hover:bg-black transition-colors rounded-sm">
                      Save & Continue
                    </button>
                    {addresses && addresses.length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => setIsAddingAddress(false)}
                        className="px-6 py-3 text-sm tracking-wider uppercase font-medium hover:bg-black/5 transition-colors rounded-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </section>

            {/* Section 3: Payment */}
            <section>
              <div className="flex items-center justify-between mb-6 border-b border-black/5 pb-4">
                <h2 className="text-xl font-medium tracking-wide">3. Payment</h2>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                  <Lock className="size-3.5 text-[#6B2C3A]" />
                  <span>256-bit Encrypted</span>
                </div>
              </div>
              <div className="bg-white p-6 md:p-8 rounded-sm border border-black/5 shadow-sm min-h-[260px] flex flex-col justify-center">
                {!selectedAddress ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <div className="size-12 rounded-full bg-[#6B2C3A]/5 flex items-center justify-center mb-3">
                      <MapPin className="size-5 text-[#6B2C3A]" />
                    </div>
                    <h4 className="font-serif text-lg text-[#1A1A1A] mb-1">Shipping Address Required</h4>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Please select or enter your shipping address in step 2 to securely load payment options.
                    </p>
                  </div>
                ) : isInitializing ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="size-10 rounded-full border-2 border-[#6B2C3A] border-t-transparent animate-spin mb-4" />
                    <div className="text-sm font-medium tracking-wide text-[#1A1A1A]">Preparing Secure Payment Gateway...</div>
                    <div className="text-xs text-muted-foreground mt-1">Establishing encrypted session with Stripe</div>
                  </div>
                ) : initError ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <AlertCircle className="size-8 text-amber-600 mb-3" />
                    <h4 className="font-serif text-lg text-[#1A1A1A] mb-1">Payment Setup Note</h4>
                    <p className="text-sm text-muted-foreground max-w-sm mb-4">{initError}</p>
                    <button 
                      type="button"
                      onClick={() => initializeCheckout(true)}
                      className="px-5 py-2.5 bg-[#1A1A1A] text-white text-xs uppercase tracking-wider font-medium hover:bg-black transition-colors rounded-sm flex items-center gap-2"
                    >
                      <RefreshCw className="size-3.5" />
                      <span>Retry Payment Setup</span>
                    </button>
                  </div>
                ) : clientSecret && createdOrderId ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: "stripe",
                        variables: {
                          colorPrimary: "#6B2C3A",
                          colorBackground: "#ffffff",
                          colorText: "#1A1A1A",
                          colorDanger: "#ef4444",
                          fontFamily: "ui-sans-serif, system-ui, sans-serif",
                          spacingUnit: "4px",
                          borderRadius: "2px",
                        },
                      },
                    }}
                  >
                    <StripeCheckoutForm
                      orderId={createdOrderId}
                      totalFormatted={gbp(checkoutTotal)}
                      userEmail={user?.email}
                      onPaymentSuccess={handlePaymentSuccess}
                    />
                  </Elements>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 opacity-50">
                    <ShieldCheck className="size-8 mb-4 text-muted-foreground" />
                    <div className="animate-pulse text-sm">Securely initializing payment gateway...</div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN - ORDER SUMMARY */}
          <div className="lg:sticky lg:top-28">
            <div className="bg-white border border-black/5 shadow-sm rounded-sm overflow-hidden">
              <div 
                className="p-6 border-b border-black/5 flex items-center justify-between cursor-pointer lg:cursor-auto"
                onClick={() => setSummaryExpanded(!summaryExpanded)}
              >
                <h3 className="font-serif text-2xl">Order Summary</h3>
                <button className="lg:hidden">
                  {summaryExpanded ? <ChevronUp /> : <ChevronDown />}
                </button>
              </div>
              
              <div className={`p-6 space-y-6 ${summaryExpanded ? 'block' : 'hidden lg:block'}`}>
                <div className="space-y-5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {checkoutLines.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic text-center py-4">Your bag is empty</div>
                  ) : (
                    checkoutLines.map((l) => (
                      <div key={l.id + l.size} className="flex gap-4">
                        <div className="relative shrink-0">
                          <img
                            src={l.product.images[0]}
                            alt={l.product.name}
                            className="w-20 aspect-[3/4] object-cover rounded-sm border border-black/5"
                          />
                          <span className="absolute -top-2 -right-2 bg-[#1A1A1A] text-white text-[10px] size-5 flex items-center justify-center rounded-full shadow-sm">
                            {l.qty}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                          <div className="font-medium text-sm truncate">{l.product.name}</div>
                          <div className="text-muted-foreground text-xs mt-1">Size: {l.size}</div>
                          <div className="font-medium text-sm mt-3">{gbp(l.product.price * l.qty)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-black/5 pt-5 space-y-3 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="text-[#1A1A1A]">{gbp(checkoutTotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery</span>
                    <span className="text-[#1A1A1A]">Complimentary</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxes</span>
                    <span className="text-[#1A1A1A]">Included</span>
                  </div>
                  <div className="flex justify-between font-serif text-2xl pt-5 border-t border-black/5 mt-4 text-[#6B2C3A]">
                    <span>Total</span>
                    <span>{gbp(checkoutTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground px-4">
                By placing your order, you agree to our <br />
                <a href="/terms-of-service" className="underline hover:text-black">Terms of Service</a> and <a href="/privacy-policy" className="underline hover:text-black">Privacy Policy</a>.
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
