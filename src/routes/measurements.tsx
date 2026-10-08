import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/catalog";
import { PageHeader } from "@/components/site/Chrome";

export const Route = createFileRoute("/measurements")({
  head: () => ({
    meta: [
      { title: "Measurement Form — SohniMutiyaar By CC" },
      { name: "description", content: "Submit your measurements for custom and made-to-order outfits." },
      { property: "og:title", content: "Your Measurements, Your Perfect Fit" },
      { property: "og:description", content: "A simple online form for made-to-measure Indian outfits." },
    ],
  }),
  component: Measurements,
});

const contact = ["Full Name", "Email", "WhatsApp Number"];
const sizes = ["Height", "Shoulder", "Bust", "Waist", "Hip", "Armhole", "Upper Arm", "Sleeve Length", "Wrist", "Kurta Length", "Trouser Length", "Salwar Length", "Dupatta Length"];

function Measurements() {
  const [sent, setSent] = useState(false);
  return (
    <div className="mx-auto max-w-3xl px-5">
      <PageHeader eyebrow="Made to Measure" title="Your Measurements, Your Perfect Fit"
        text="For selected custom and made-to-order outfits, provide your measurements through our simple online form." />
      {sent ? (
        <div className="text-center bg-secondary p-12 animate-rise">
          <p className="font-serif text-3xl">Thank you.</p>
          <p className="mt-4 text-muted-foreground">Your measurements have been received. Our team will review your details and contact you if we need any clarification.</p>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); window.scrollTo({ top: 0 }); }} className="space-y-12">
          <fieldset className="grid sm:grid-cols-3 gap-6">
            {contact.map((f) => <label key={f} className="text-xs eyebrow">{f}<input required type={f === "Email" ? "email" : "text"} className="field mt-1 normal-case tracking-normal" /></label>)}
          </fieldset>
          <fieldset>
            <legend className="font-serif text-2xl mb-4">Measurements <span className="text-sm text-muted-foreground font-sans">(inches)</span></legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {sizes.map((f) => <label key={f} className="text-xs eyebrow">{f}<input inputMode="decimal" className="field mt-1" /></label>)}
            </div>
          </fieldset>
          <label className="block text-xs eyebrow">Fit Preference
            <select className="field mt-1 normal-case tracking-normal"><option>Regular</option><option>Fitted</option><option>Relaxed</option></select>
          </label>
          <label className="block text-xs eyebrow">Additional Measurements<textarea rows={2} className="field mt-1" /></label>
          <label className="block text-xs eyebrow">Additional Instructions & Notes<textarea rows={3} className="field mt-1" /></label>
          <label className="block text-xs eyebrow">Upload Reference Image<input type="file" accept="image/*" className="mt-3 block text-sm normal-case tracking-normal" /></label>
          <label className="flex gap-3 text-sm"><input required type="checkbox" className="accent-primary" /> I confirm I have reviewed my measurements.</label>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary">Submit My Measurements</button>
            <a href={waLink("Hi SohniMutiyaar By CC, I need help with my measurements.")} target="_blank" rel="noreferrer" className="btn-outline"><MessageCircle className="size-4" /> Need help?</a>
          </div>
        </form>
      )}
    </div>
  );
}
