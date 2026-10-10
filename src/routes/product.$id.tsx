import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Mail, Ruler, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { categories, gbp, products, productsIn, waLink } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/site/ProductCard";
import { useReveal } from "@/components/site/Chrome";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { WhatsAppIcon } from "@/components/site/WhatsAppButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sendContactEmail } from "@/lib/email";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const product = products.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.product.name} — SohniMutiyaar By CC` },
            { name: "description", content: loaderData.product.description },
            { property: "og:title", content: loaderData.product.name },
            { property: "og:description", content: loaderData.product.description },
          ],
        }
      : { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] },
  component: ProductPage,
});

function ProductPage() {
  const { product: p } = Route.useLoaderData();
  const [activeImage, setActiveImage] = useState(0);
  const { add, toggleWish, wishlist } = useCart();
  const cat = categories.find((c) => c.slug === p.category)!;
  useReveal();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendContactEmail({
        name: name.trim(),
        email: email.trim(),
        subject: `Enquiry for ${p.name} (Colour: ${p.colour})`,
        message: message.trim(),
      });
      toast.success("Enquiry sent! We will get back to you shortly.");
      setModalOpen(false);
      setName("");
      setEmail("");
      setMessage("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send enquiry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] px-5 lg:px-10 pt-6">
      <SiteBreadcrumb
        className="mb-6"
        items={[
          { label: "Shop", to: "/shop" },
          { label: cat.name, to: "/collections/$slug", params: { slug: cat.slug } },
          { label: p.name },
        ]}
      />
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-12">
        <div className="flex flex-col-reverse lg:flex-row gap-4">
          <div className="flex lg:flex-col gap-3 overflow-x-auto w-full lg:w-24 shrink-0 no-scrollbar">
            {p.images.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(i)}
                className={`shrink-0 transition-all ${
                  activeImage === i
                    ? "ring-1 ring-primary ring-offset-2"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={src}
                  alt={`${p.name} view ${i + 1}`}
                  className="w-20 lg:w-full aspect-[3/4] object-cover"
                />
              </button>
            ))}
          </div>
          <div className="flex-1">
            <img
              src={p.images[activeImage]}
              alt={p.name}
              className="w-full aspect-[3/4] object-cover"
            />
          </div>
        </div>
        <div className="lg:sticky lg:top-40 self-start animate-rise">
          {p.customisable && <div className="eyebrow text-primary">Customisation available</div>}
          <h1 className="mt-3 text-5xl">{p.name}</h1>
          <div className="mt-3 text-xl">{gbp(p.price)}</div>
          <p className="mt-6 text-muted-foreground leading-relaxed">{p.description}</p>
          <div className="mt-8 eyebrow !text-[0.62rem]">
            Colour —{" "}
            <span className="text-muted-foreground normal-case tracking-normal text-sm">
              {p.colour}
            </span>
          </div>

          <div className="mt-6">
            <Link
              to="/measurements"
              className="w-full inline-flex items-center justify-center gap-2 py-3 border border-foreground hover:bg-foreground hover:text-background transition-colors eyebrow !text-[0.68rem]"
            >
              <Ruler className="size-4" /> Submit your measurements
            </Link>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => {
                add(p.id, "Custom");
                toast.success(`${p.name} added to your bag`);
              }}
              className="btn-primary flex-1"
            >
              Add to Bag
            </button>
            <button onClick={() => toggleWish(p.id)} aria-label="Wishlist" className="border px-4">
              <Heart
                className={`size-5 ${wishlist.includes(p.id) ? "fill-primary text-primary" : ""}`}
              />
            </button>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <a
              href={waLink(
                `Hi SohniMutiyaar By CC, I'd like to enquire about ${p.name} (${gbp(p.price)}). Colour: ${p.colour}.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba59] text-white eyebrow !text-[0.68rem] transition-colors rounded-sm shadow-sm"
            >
              <WhatsAppIcon className="size-4 text-white" /> Enquire on WhatsApp
            </a>
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogTrigger asChild>
                <button className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-secondary hover:bg-secondary/80 text-foreground border eyebrow !text-[0.68rem] transition-colors rounded-sm cursor-pointer">
                  <Mail className="size-4" /> Email Us
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Enquire About {p.name}</DialogTitle>
                  <DialogDescription>
                    Fill in your details and we will get back to you shortly regarding this product.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEmailSubmit} className="space-y-4 mt-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider mb-1 font-medium block">
                      Name *
                    </label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      className="field w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider mb-1 font-medium block">
                      Email *
                    </label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="field w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider mb-1 font-medium block">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={loading}
                      placeholder={`I'm interested in the ${p.name}...`}
                      className="field w-full resize-y"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full flex justify-center items-center gap-2"
                  >
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    Send Enquiry
                  </button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-10 divide-y border-y text-sm">
            {[
              [
                "Sizing & Measurements",
                "Whether you select a standard size or provide custom measurements, your details are sent directly to our master tailors to ensure a perfect fit. Sizing can also be finalized through your Enquiry.",
              ],
              [
                "Materials",
                "Each piece is finished by hand by skilled artisans. Slight variations are part of its handmade beauty.",
              ],
              [
                "Customisation",
                "Colours, sleeve length, neckline and fit can be adjusted. Contact us via email to discuss.",
              ],
              ["Shipping", "Delivery times are confirmed at order."],
            ].map(([t, d]) => (
              <details key={t} className="py-4">
                <summary className="cursor-pointer eyebrow !text-[0.62rem]">{t}</summary>
                <p className="mt-3 text-muted-foreground">{d}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
      <h2 className="text-4xl mt-28 mb-10">You may also love</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12">
        {[...productsIn(p.category), ...products]
          .filter((x, i, a) => x.id !== p.id && a.indexOf(x) === i)
          .slice(0, 4)
          .map((x) => (
            <ProductCard key={x.id} p={x} />
          ))}
      </div>
    </div>
  );
}
