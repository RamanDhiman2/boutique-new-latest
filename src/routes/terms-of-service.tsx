import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/Chrome";

export const Route = createFileRoute("/terms-of-service")({
  head: () => ({
    meta: [
      { title: "Terms of Service — SohniMutiyaar By CC" },
      { name: "description", content: "Terms of Service for SohniMutiyaar By CC." },
    ],
  }),
  component: TermsOfService,
});

function TermsOfService() {
  return (
    <div className="mx-auto max-w-3xl px-5 lg:px-10 pb-24">
      <PageHeader eyebrow="Policies" title="Terms of Service" />
      <div className="prose prose-stone dark:prose-invert mt-8">
        <p>By accessing the website at SohniMutiyaar By CC, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.</p>
        <h2 className="mt-8 mb-4 text-2xl">Use License</h2>
        <p>Permission is granted to temporarily download one copy of the materials on SohniMutiyaar By CC's website for personal, non-commercial transitory viewing only.</p>
        <h2 className="mt-8 mb-4 text-2xl">Disclaimer</h2>
        <p>The materials on SohniMutiyaar By CC's website are provided on an 'as is' basis. SohniMutiyaar By CC makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
        <h2 className="mt-8 mb-4 text-2xl">Limitations</h2>
        <p>In no event shall SohniMutiyaar By CC or its suppliers be liable for any damages arising out of the use or inability to use the materials on SohniMutiyaar By CC's website.</p>
      </div>
    </div>
  );
}
