import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { categories, productsIn } from "@/lib/catalog";
import { useCategoryProductsQuery } from "@/lib/catalogService";
import { ProductCard } from "@/components/site/ProductCard";
import { useReveal } from "@/components/site/Chrome";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, SlidersHorizontal } from "lucide-react";

export const Route = createFileRoute("/collections/$slug")({
  loader: ({ params }) => {
    const category = categories.find((c) => c.slug === params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.category.name} — SohniMutiyaar By CC` },
            { name: "description", content: loaderData.category.description },
            { property: "og:title", content: `${loaderData.category.name} — SohniMutiyaar By CC` },
            { property: "og:description", content: loaderData.category.description },
          ],
        }
      : { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] },
  component: CollectionPage,
});

function CollectionPage() {
  const { category } = Route.useLoaderData();
  const [sort, setSort] = useState<string>("featured");
  const [custom, setCustom] = useState<boolean>(false);

  const { data: rawProducts = productsIn(category.slug) } = useCategoryProductsQuery(category.slug);

  const list = useMemo(() => {
    let filtered = rawProducts;
    if (custom) {
      filtered = filtered.filter((p) => p.customisable);
    }
    const result = [...filtered];
    if (sort === "low") {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === "high") {
      result.sort((a, b) => b.price - a.price);
    }
    return result;
  }, [rawProducts, custom, sort]);

  useReveal();

  return (
    <>
      <section className="relative h-[45vh] sm:h-[52vh] min-h-[320px] sm:min-h-[380px] overflow-hidden">
        <img
          src={category.image}
          alt={category.name}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-ink/50" />
        <div className="relative h-full flex flex-col items-center justify-center text-center text-ink-foreground px-4 sm:px-6 animate-rise">
          <div className="eyebrow text-gold text-[0.65rem] sm:text-[0.7rem]">{category.tagline}</div>
          <h1 className="mt-2 sm:mt-4 text-3xl min-[400px]:text-4xl sm:text-5xl md:text-6xl lg:text-7xl break-words px-2 leading-tight">{category.name}</h1>
          <p className="mt-3 sm:mt-5 max-w-xl text-sm sm:text-base opacity-85 leading-relaxed">{category.description}</p>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10 pt-4">
        <SiteBreadcrumb items={[{ label: "Collections", to: "/collections" }, { label: category.name }]} />
      </div>

      {/* Interactive Filter & Sort Bar */}
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10 py-4 sm:py-5 flex items-center justify-between gap-3 sm:gap-4 border-b border-border/70 flex-wrap">
        {/* Customisable Filter */}
        <label
          htmlFor="customisable-filter"
          className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-foreground cursor-pointer select-none group min-h-[36px]"
        >
          <Checkbox
            id="customisable-filter"
            checked={custom}
            onCheckedChange={(checked) => setCustom(Boolean(checked))}
          />
          <span className="flex items-center gap-1.5 group-hover:text-primary transition-colors text-[0.68rem] sm:text-xs">
            <Sparkles className="size-3.5 text-primary" />
            Customisable only
          </span>
          <span className="text-[0.65rem] text-muted-foreground font-normal ml-0.5 sm:ml-1">
            ({list.length})
          </span>
        </label>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground hidden sm:inline-block">
            Sort by:
          </span>
          <Select value={sort} onValueChange={(val) => setSort(val)}>
            <SelectTrigger className="w-[160px] sm:w-[190px] h-9 text-[0.68rem] sm:text-xs uppercase tracking-wider font-medium bg-background border-border/80">
              <SelectValue placeholder="Featured" />
            </SelectTrigger>
            <SelectContent align="end" className="bg-background">
              <SelectItem value="featured" className="text-xs uppercase tracking-wider">
                Featured
              </SelectItem>
              <SelectItem value="low" className="text-xs uppercase tracking-wider">
                Price: Low to High
              </SelectItem>
              <SelectItem value="high" className="text-xs uppercase tracking-wider">
                Price: High to Low
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Category Info Banner for Sold Out & Upcoming */}
      {category.slug === "sold-out" && (
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10 pt-5 sm:pt-6">
          <div className="p-3.5 sm:p-4 bg-muted/60 border border-border/80 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold uppercase tracking-wider text-foreground">Archive Gallery:</span>{" "}
              <span className="text-muted-foreground">These pieces are out of stock in ready-to-wear sizes, but our artisans can recreate them made-to-measure.</span>
            </div>
            <a
              href="https://wa.me/447393070421?text=Hi%20SohniMutiyaar%20By%20CC%2C%20I'd%20like%20to%20request%20a%20custom%20recreation%20of%20a%20sold-out%20design."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold uppercase tracking-wider text-[11px] shrink-0"
            >
              Request Custom Recreation →
            </a>
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10 pt-6 sm:pt-10 pb-16 sm:pb-24">
        {list.length === 0 ? (
          <div className="py-16 sm:py-20 text-center">
            <SlidersHorizontal className="size-8 mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="font-serif text-xl text-foreground">No pieces match your filter</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Try unchecking "Customisable only" to view all outfits in this collection.
            </p>
            <button
              type="button"
              onClick={() => {
                setCustom(false);
                setSort("featured");
              }}
              className="btn-primary py-2 px-4 text-xs font-semibold uppercase tracking-wider"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 sm:gap-x-5 gap-y-8 sm:gap-y-12">
            {list.map((p) => (
              <ProductCard key={p.id} p={p} disableReveal={true} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
