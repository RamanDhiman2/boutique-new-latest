import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/order-success")({
  component: OrderSuccessPage,
});

function OrderSuccessPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-5 text-center">
      <CheckCircle2 className="size-24 text-green-600 mb-6" />
      <h1 className="text-4xl md:text-5xl mb-4 font-serif">Order Confirmed!</h1>
      <p className="text-muted-foreground text-lg max-w-lg mb-10">
        Thank you for shopping with us. Your order has been placed successfully and is now being processed by our team.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm justify-center">
        <Link to="/profile" className="btn-primary w-full sm:w-auto text-center">
          View Order History
        </Link>
        <Link to="/shop" className="btn-outline w-full sm:w-auto text-center">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
