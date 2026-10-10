import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";

export const Route = createFileRoute("/order-success")({
  component: OrderSuccessPage,
});

function OrderSuccessPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-4 pb-20">
      <SiteBreadcrumb
        items={[{ label: "Checkout", to: "/checkout" }, { label: "Order Enquiry" }]}
      />
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-5 text-center mt-6">
        <CheckCircle2 className="size-24 text-green-600 mb-6" />
        <h1 className="text-4xl md:text-5xl mb-4 font-serif">Order Enquiry Sent</h1>
        <p className="text-muted-foreground text-lg max-w-lg mb-10">
          Thank you for getting in touch. Our team will confirm availability, delivery and payment
          details with you before your order is placed.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm justify-center">
          <Link to="/profile" className="btn-primary w-full sm:w-auto text-center">
            View Your Profile
          </Link>
          <Link to="/shop" className="btn-outline w-full sm:w-auto text-center">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
