import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { gbp } from "@/lib/catalog";
import { supabase, type AddressRecord } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Lock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertCircle,
  RefreshCw,
  Star,
  Home,
  Briefcase,
  Plus,
} from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { AddressForm, type AddressFormData } from "@/components/address/AddressForm";

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
      if (
        paymentIntent &&
        (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")
      ) {
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
  const queryClient = useQueryClient();

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>("");
  const checkoutSignatureRef = useRef<string>("");

  // Address + exact cart contents. A change means a different order, so it must not
  // reuse the previous order (and its PaymentIntent, address and total).
  const checkoutSignature = `${selectedAddress ?? ""}|${checkoutLines
    .map((l) => `${l.product.id}:${l.size}:${l.qty}`)
    .sort()
    .join(",")}`;

  useEffect(() => {
    if (!loading && !user) {
      toast.error("Please login to proceed to checkout");
      navigate({ to: "/login", search: { redirect: "/checkout" } });
    }
  }, [user, loading, navigate]);

  const { data: addresses, refetch } = useQuery<AddressRecord[]>({
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

  useEffect(() => {
    if (!selectedAddress && addresses && addresses.length > 0) {
      // Prioritize default address
      const defaultId = user ? localStorage.getItem(`default_addr_${user.id}`) : null;
      const defaultAddr = addresses.find((a) => a.is_default || a.id === defaultId);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr.id);
      } else if (addresses[0]) {
        setSelectedAddress(addresses[0].id);
      }
    }
  }, [addresses, selectedAddress, user]);

  const initializeCheckout = async (isRetry = false) => {
    if (!selectedAddress || checkoutLines.length === 0 || !user) return;

    // Retain a stable idempotency key for retries of the same address + cart;
    // start a fresh one whenever either changes
    if (!idempotencyKeyRef.current || checkoutSignatureRef.current !== checkoutSignature) {
      idempotencyKeyRef.current = `chk_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
      checkoutSignatureRef.current = checkoutSignature;
      setClientSecret(null);
      setCreatedOrderId(null);
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

      const resData = res.data as {
        clientSecret?: string;
        orderId?: string;
        error?: string;
      } | null;

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
  }, [checkoutSignature, user]);

  const handlePaymentSuccess = async (confirmedOrderId: string) => {
    toast.success("Payment submitted! Verifying your order confirmation...");
    checkoutLines.forEach((l) => remove(l.id, l.size));
    navigate({
      to: "/order-success",
      search: { order_id: confirmedOrderId },
    });
  };

  const handleAddAddress = async (formData: AddressFormData) => {
    if (!user) return;
    setAddressSubmitting(true);

    try {
      if (formData.is_default) {
        try {
          await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
        } catch {
          // ignore
        }
      }

      const combinedStreet = formData.apartment
        ? `${formData.street}, ${formData.apartment}`
        : formData.street;

      const basePayload: Record<string, any> = {
        type: formData.type || "Home",
        full_name: formData.full_name,
        street: combinedStreet,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        country: formData.country,
        phone: formData.phone,
        user_id: user.id,
      };

      const extendedPayload: Record<string, any> = {
        ...basePayload,
        street: formData.street,
        apartment: formData.apartment || null,
        is_default: Boolean(formData.is_default),
        is_deleted: false,
      };

      let insertRes = await supabase.from("addresses").insert(extendedPayload).select().single();

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
        throw new Error(insertRes.error.message || "Failed to save address");
      }

      toast.success("Delivery address saved!");
      await queryClient.invalidateQueries({ queryKey: ["addresses"] });
      await refetch();
      setIsAddingAddress(false);

      if (insertRes.data && typeof insertRes.data === "object" && "id" in insertRes.data) {
        const newId = String((insertRes.data as { id: string }).id);
        setSelectedAddress(newId);
        if (formData.is_default) {
          localStorage.setItem(`default_addr_${user.id}`, newId);
        }
      }
    } catch (err: any) {
      console.error("Save address in checkout error:", err);
      toast.error(err.message || "Failed to save address");
    } finally {
      setAddressSubmitting(false);
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
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8">
        <SiteBreadcrumb items={[{ label: "Shopping Bag", to: "/bag" }, { label: "Checkout" }]} />

        <div className="mt-4 sm:mt-8 mb-8 sm:mb-12 flex items-center gap-2.5 sm:gap-3">
          <Lock className="size-4 sm:size-5 text-muted-foreground" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif tracking-tight">
            Secure Checkout
          </h1>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-8 lg:gap-14 items-start">
          {/* LEFT COLUMN - FORM */}
          <div className="space-y-8 sm:space-y-12">
            {/* Section 1: Contact */}
            <section>
              <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-black/5 pb-3 sm:pb-4">
                <h2 className="text-lg sm:text-xl font-medium tracking-wide">
                  1. Contact Information
                </h2>
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-sm border border-black/5 shadow-sm">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Email Address</div>
                <div className="font-medium text-sm sm:text-base break-all">{user.email}</div>
                <div className="text-xs text-muted-foreground mt-3 sm:mt-4 flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-600" /> Account securely authenticated
                </div>
              </div>
            </section>

            {/* Section 2: Delivery */}
            <section>
              <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-black/5 pb-3 sm:pb-4">
                <h2 className="text-lg sm:text-xl font-medium tracking-wide">
                  2. Delivery Address
                </h2>
              </div>

              {addresses && addresses.length > 0 && !isAddingAddress ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {addresses.map((address) => {
                      const isDefault =
                        Boolean(address.is_default) ||
                        localStorage.getItem(`default_addr_${user.id}`) === address.id;
                      const isSelected = selectedAddress === address.id;

                      return (
                        <div
                          key={address.id}
                          onClick={() => setSelectedAddress(address.id)}
                          className={`relative p-4 sm:p-5 rounded-md border text-left cursor-pointer transition-all ${
                            isSelected
                              ? "border-[#6B2C3A] bg-[#6B2C3A]/[0.02] shadow-sm ring-1 ring-[#6B2C3A]"
                              : "border-black/10 bg-white hover:border-black/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="radio"
                                id={`addr-${address.id}`}
                                name="address-selection"
                                checked={isSelected}
                                onChange={() => setSelectedAddress(address.id)}
                                className="size-4 text-[#6B2C3A] accent-[#6B2C3A] cursor-pointer shrink-0"
                              />
                              <label
                                htmlFor={`addr-${address.id}`}
                                className="font-semibold text-sm cursor-pointer truncate"
                              >
                                {address.full_name}
                              </label>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {address.type && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-foreground border border-black/5">
                                  {address.type.toLowerCase() === "work" ? (
                                    <Briefcase className="size-3 text-muted-foreground" />
                                  ) : address.type.toLowerCase() === "home" ? (
                                    <Home className="size-3 text-muted-foreground" />
                                  ) : (
                                    <MapPin className="size-3 text-muted-foreground" />
                                  )}
                                  <span className="capitalize">{address.type}</span>
                                </span>
                              )}
                              {isDefault && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-[#6B2C3A] text-white">
                                  <Star className="size-3 fill-current" />
                                  Default
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground leading-relaxed pl-6 space-y-0.5">
                            <p className="text-foreground font-medium">{address.street}</p>
                            {address.apartment && (
                              <p className="text-muted-foreground">{address.apartment}</p>
                            )}
                            <p>
                              {address.city}, {address.state} {address.zip}
                            </p>
                            <p className="font-medium text-foreground/80">{address.country}</p>
                            {address.phone && (
                              <p className="pt-1.5 text-xs text-foreground/70 flex items-center gap-1.5">
                                <span>Phone:</span>
                                <span className="font-mono text-foreground">{address.phone}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(true)}
                      className="inline-flex items-center gap-2 text-sm font-medium tracking-wide text-[#6B2C3A] hover:underline underline-offset-4 transition-colors"
                    >
                      <Plus className="size-4" />
                      Add a new delivery address
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-4 sm:p-6 md:p-8 rounded-md border border-black/10 shadow-sm">
                  <div className="mb-6 flex items-center justify-between border-b border-black/5 pb-3">
                    <h3 className="font-serif text-base sm:text-lg text-foreground">
                      {addresses && addresses.length > 0
                        ? "Add New Delivery Address"
                        : "Enter Delivery Address"}
                    </h3>
                    {addresses && addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAddingAddress(false)}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                      >
                        Cancel and use saved address
                      </button>
                    )}
                  </div>
                  <AddressForm
                    onSubmit={handleAddAddress}
                    onCancel={
                      addresses && addresses.length > 0
                        ? () => setIsAddingAddress(false)
                        : undefined
                    }
                    isSubmitting={addressSubmitting}
                    submitLabel="Deliver to this Address"
                    cancelLabel="Back to Saved Addresses"
                  />
                </div>
              )}
            </section>

            {/* Section 3: Payment */}
            <section>
              <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-black/5 pb-3 sm:pb-4">
                <h2 className="text-lg sm:text-xl font-medium tracking-wide">3. Payment</h2>
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                  <Lock className="size-3 sm:size-3.5 text-[#6B2C3A]" />
                  <span>256-bit Encrypted</span>
                </div>
              </div>
              <div className="bg-white p-4 sm:p-6 md:p-8 rounded-sm border border-black/5 shadow-sm min-h-[240px] sm:min-h-[260px] flex flex-col justify-center">
                {!selectedAddress ? (
                  <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-center px-4">
                    <div className="size-12 rounded-full bg-[#6B2C3A]/5 flex items-center justify-center mb-3">
                      <MapPin className="size-5 text-[#6B2C3A]" />
                    </div>
                    <h4 className="font-serif text-base sm:text-lg text-[#1A1A1A] mb-1">
                      Shipping Address Required
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                      Please select or enter your shipping address in step 2 to securely load
                      payment options.
                    </p>
                  </div>
                ) : isInitializing ? (
                  <div className="flex flex-col items-center justify-center py-10 sm:py-12 text-center">
                    <div className="size-10 rounded-full border-2 border-[#6B2C3A] border-t-transparent animate-spin mb-4" />
                    <div className="text-xs sm:text-sm font-medium tracking-wide text-[#1A1A1A]">
                      Preparing Secure Payment Gateway...
                    </div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                      Establishing encrypted session with Stripe
                    </div>
                  </div>
                ) : initError ? (
                  <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-center px-4">
                    <AlertCircle className="size-8 text-amber-600 mb-3" />
                    <h4 className="font-serif text-base sm:text-lg text-[#1A1A1A] mb-1">
                      Payment Setup Note
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-4">
                      {initError}
                    </p>
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
                    key={clientSecret}
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
                  <div className="flex flex-col items-center justify-center py-10 sm:py-12 opacity-50">
                    <ShieldCheck className="size-8 mb-4 text-muted-foreground" />
                    <div className="animate-pulse text-xs sm:text-sm">
                      Securely initializing payment gateway...
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN - ORDER SUMMARY */}
          <div className="lg:sticky lg:top-28">
            <div className="bg-white border border-black/5 shadow-sm rounded-sm overflow-hidden">
              <div
                className="p-4 sm:p-6 border-b border-black/5 flex items-center justify-between cursor-pointer lg:cursor-auto"
                onClick={() => setSummaryExpanded(!summaryExpanded)}
              >
                <h3 className="font-serif text-xl sm:text-2xl">Order Summary</h3>
                <button className="lg:hidden p-1">
                  {summaryExpanded ? (
                    <ChevronUp className="size-5" />
                  ) : (
                    <ChevronDown className="size-5" />
                  )}
                </button>
              </div>

              <div
                className={`p-4 sm:p-6 space-y-5 sm:space-y-6 ${summaryExpanded ? "block" : "hidden lg:block"}`}
              >
                <div className="space-y-5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {checkoutLines.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic text-center py-4">
                      Your bag is empty
                    </div>
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
                          <div className="font-medium text-sm mt-3">
                            {gbp(l.product.price * l.qty)}
                          </div>
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
                <a href="/terms-of-service" className="underline hover:text-black">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy-policy" className="underline hover:text-black">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
