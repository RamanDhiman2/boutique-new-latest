import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/Chrome";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { getSiteSettings } from "@/lib/siteSettingsStore";

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
  const { contactEmail } = getSiteSettings();
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-10 pt-4 pb-20 sm:pb-24">
      <SiteBreadcrumb items={[{ label: "Refund Policy" }]} />
      <PageHeader eyebrow="Policies" title="Refund Policy" />
      <div className="prose prose-stone dark:prose-invert mt-6 sm:mt-8">
        <p>We want you to be completely satisfied with your purchase from SohniMutiyaar By CC.</p>
        <h2 className="mt-6 sm:mt-8 mb-3 sm:mb-4 text-xl sm:text-2xl font-serif">Custom & Made-to-Measure Orders</h2>
        <p>
          Due to the personalised nature of custom and made-to-measure outfits, these items are
          non-refundable and cannot be exchanged unless there is a manufacturing defect.
        </p>
        <h2 className="mt-6 sm:mt-8 mb-3 sm:mb-4 text-xl sm:text-2xl font-serif">Standard Returns</h2>
        <p>
          For standard non-customized items, we accept returns within 14 days of delivery. The item
          must be unused, in its original condition, and with all tags attached.
        </p>
        <h2 className="mt-6 sm:mt-8 mb-3 sm:mb-4 text-xl sm:text-2xl font-serif">Refunds</h2>
        <p>
          Once we receive and inspect your returned item, we will notify you of the approval or
          rejection of your refund. If approved, the refund will be processed to your original
          method of payment within a certain amount of days.
        </p>
        <h2 className="mt-6 sm:mt-8 mb-3 sm:mb-4 text-xl sm:text-2xl font-serif">Start a Return or Enquiry</h2>
        <p>
          To initiate a return or ask any questions, please{" "}
          <Link to="/contact" className="text-primary underline hover:text-primary/80">
            contact us
          </Link>{" "}
          or email us at{" "}
          <a
            href={`mailto:${contactEmail}`}
            className="text-primary underline hover:text-primary/80 break-all"
          >
            {contactEmail}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
