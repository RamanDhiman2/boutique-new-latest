import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/Chrome";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — SohniMutiyaar By CC" },
      { name: "description", content: "Privacy Policy for SohniMutiyaar By CC." },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-5 lg:px-10 pb-24">
      <PageHeader eyebrow="Policies" title="Privacy Policy" />
      <div className="prose prose-stone dark:prose-invert mt-8">
        <p>Your privacy is important to us. It is SohniMutiyaar By CC's policy to respect your privacy regarding any information we may collect from you across our website.</p>
        <h2 className="mt-8 mb-4 text-2xl">Information we collect</h2>
        <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent.</p>
        <h2 className="mt-8 mb-4 text-2xl">Use of information</h2>
        <p>We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we’ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorised access, disclosure, copying, use or modification.</p>
        <h2 className="mt-8 mb-4 text-2xl">Contact us</h2>
        <p>If you have any questions about how we handle user data and personal information, feel free to contact us.</p>
      </div>
    </div>
  );
}
