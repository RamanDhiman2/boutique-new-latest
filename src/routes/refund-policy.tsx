import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/Chrome";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — SohniMutiyaar By CC" },
      { name: "description", content: "Refund and Returns Policy for SohniMutiyaar By CC." },
    ],
  }),
  component: RefundPolicy,
});

function RefundPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-5 lg:px-10 pb-24">
      <PageHeader eyebrow="Policies" title="Refund Policy" />
      <div className="prose prose-stone dark:prose-invert mt-8">
        <p>We want you to be completely satisfied with your purchase from SohniMutiyaar By CC.</p>
        <h2 className="mt-8 mb-4 text-2xl">Custom & Made-to-Measure Orders</h2>
        <p>Due to the personalised nature of custom and made-to-measure outfits, these items are non-refundable and cannot be exchanged unless there is a manufacturing defect.</p>
        <h2 className="mt-8 mb-4 text-2xl">Standard Returns</h2>
        <p>For standard non-customized items, we accept returns within 14 days of delivery. The item must be unused, in its original condition, and with all tags attached.</p>
        <h2 className="mt-8 mb-4 text-2xl">Refunds</h2>
        <p>Once we receive and inspect your returned item, we will notify you of the approval or rejection of your refund. If approved, the refund will be processed to your original method of payment within a certain amount of days.</p>
      </div>
    </div>
  );
}
