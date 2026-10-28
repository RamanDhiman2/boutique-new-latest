import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, ImagePlus, Loader2, Plus, Search, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { gbp, type Product } from "@/lib/catalog";
import {
  PRODUCT_SIZE_OPTIONS,
  deleteProduct,
  fetchAdminCategories,
  fetchAdminProducts,
  saveProduct,
  uploadProductImage,
  type ProductInput,
} from "@/lib/admin";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Filter = "all" | "live" | "soldout" | "hidden";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "On sale" },
  { id: "soldout", label: "Sold out" },
  { id: "hidden", label: "Hidden" },
];

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-[#6B2C3A]" : "bg-black/20"
      }`}
    >
      <span
        className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function AdminProducts() {
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ["admin-products"], queryFn: fetchAdminProducts });
  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const categories = categoriesQuery.data ?? [];
  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name || slug;

  const counts = useMemo(
    () => ({
      all: products.length,
      live: products.filter((p) => p.isActive !== false && !p.soldOut).length,
      soldout: products.filter((p) => p.soldOut).length,
      hidden: products.filter((p) => p.isActive === false).length,
    }),
    [products],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === "live" && (p.isActive === false || p.soldOut)) return false;
      if (filter === "soldout" && !p.soldOut) return false;
      if (filter === "hidden" && p.isActive !== false) return false;
      if (!q) return true;
      return [p.name, p.colour, p.id, p.category].some((v) => v?.toLowerCase().includes(q));
    });
  }, [products, filter, query]);

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
      queryClient.invalidateQueries({ queryKey: ["catalog"] }),
    ]);
  };

  const toInput = (p: Product): ProductInput => ({
    id: p.id,
    name: p.name,
    price: p.price,
    colour: p.colour,
    category: p.category,
    description: p.description,
    sizes: p.sizes,
    customisable: p.customisable,
    isUpcoming: Boolean(p.isUpcoming),
    soldOut: Boolean(p.soldOut),
    isActive: p.isActive !== false,
    images: null,
  });

  const quickUpdate = async (p: Product, patch: Partial<ProductInput>, message: string) => {
    setBusyId(p.id);
    try {
      await saveProduct({ ...toInput(p), ...patch }, []);
      toast.success(message);
      await refreshAll();
    } catch (err) {
      toast.error((err as Error).message || "Could not update product");
    } finally {
      setBusyId(null);
    }
  };

  if (productsQuery.isLoading) {
    return (
      <div className="py-20 flex justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors ${
                filter === f.id
                  ? "bg-[#6B2C3A] text-white border-[#6B2C3A]"
                  : "bg-white border-black/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label} <span className="opacity-70">({counts[f.id]})</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-sm border border-black/15 bg-white focus:outline-none focus:border-[#6B2C3A]"
            />
          </div>
          <button
            onClick={() => setEditing("new")}
            className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus className="size-3.5" />
            Add product
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white border border-black/10 rounded-md py-16 text-center text-sm text-muted-foreground">
          {products.length === 0 ? "No products yet." : "No products match."}
        </div>
      ) : (
        <div className="bg-white border border-black/10 rounded-md overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_120px_90px_90px_80px] gap-3 px-5 py-3 bg-[#FAF9F6] text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>Product</span>
            <span>Category</span>
            <span className="text-right">Price</span>
            <span className="text-center">Sold out</span>
            <span className="text-center">Visible</span>
          </div>
          <ul className="divide-y divide-black/5">
            {visible.map((p) => {
              const busy = busyId === p.id;
              return (
                <li
                  key={p.id}
                  className={`grid grid-cols-[1fr_auto] md:grid-cols-[1fr_120px_90px_90px_80px] gap-3 items-center px-4 md:px-5 py-3 ${
                    p.isActive === false ? "bg-black/[0.02]" : ""
                  }`}
                >
                  <button
                    onClick={() => setEditing(p)}
                    className="flex items-center gap-3 text-left min-w-0 group"
                  >
                    <span className="w-11 h-14 shrink-0 bg-muted rounded-sm overflow-hidden">
                      {p.images[0] && (
                        <img
                          src={p.images[0]}
                          alt=""
                          className="size-full object-cover object-top"
                          loading="lazy"
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate group-hover:text-[#6B2C3A]">
                        {p.name}
                      </span>
                      <span className="block text-xs text-muted-foreground truncate">
                        {p.colour || "—"}
                        <span className="md:hidden"> · {gbp(p.price)}</span>
                        {p.isUpcoming && <span className="text-amber-700"> · Upcoming</span>}
                        {p.isActive === false && (
                          <span className="md:hidden text-red-700"> · Hidden</span>
                        )}
                        {p.soldOut && <span className="md:hidden text-red-700"> · Sold out</span>}
                      </span>
                    </span>
                  </button>
                  <span className="hidden md:block text-xs text-muted-foreground truncate">
                    {categoryName(p.category)}
                  </span>
                  <span className="hidden md:block text-sm text-right tabular-nums">
                    {gbp(p.price)}
                  </span>
                  <span className="hidden md:flex justify-center">
                    <Toggle
                      label={`Sold out: ${p.name}`}
                      checked={Boolean(p.soldOut)}
                      disabled={busy}
                      onChange={(v) =>
                        quickUpdate(p, { soldOut: v }, v ? "Marked as sold out" : "Back on sale")
                      }
                    />
                  </span>
                  <span className="hidden md:flex justify-center">
                    <Toggle
                      label={`Visible: ${p.name}`}
                      checked={p.isActive !== false}
                      disabled={busy}
                      onChange={(v) =>
                        quickUpdate(p, { isActive: v }, v ? "Product is visible" : "Product hidden")
                      }
                    />
                  </span>
                  <button
                    onClick={() => setEditing(p)}
                    className="md:hidden text-xs text-[#6B2C3A] font-medium"
                  >
                    Edit
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          {editing !== null && (
            <ProductEditor
              key={editing === "new" ? "new" : editing.id}
              product={editing === "new" ? null : editing}
              categories={categories}
              existingIds={products.map((p) => p.id)}
              onDone={async () => {
                await refreshAll();
                setEditing(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ProductEditor({
  product,
  categories,
  existingIds,
  onDone,
}: {
  product: Product | null;
  categories: { slug: string; name: string }[];
  existingIds: string[];
  onDone: () => Promise<void>;
}) {
  const isNew = product === null;
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [colour, setColour] = useState(product?.colour ?? "");
  const [category, setCategory] = useState(product?.category ?? categories[0]?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [sizes, setSizes] = useState<string[]>(
    product?.sizes ?? ["XS", "S", "M", "L", "XL", "Custom"],
  );
  const [customisable, setCustomisable] = useState(product?.customisable ?? true);
  const [isUpcoming, setIsUpcoming] = useState(Boolean(product?.isUpcoming));
  const [soldOut, setSoldOut] = useState(Boolean(product?.soldOut));
  const [isActive, setIsActive] = useState(product?.isActive !== false);

  // Uploaded photos. Catalogue products start on their built-in photos until replaced.
  const builtInImages = product && !product.hasCustomImages ? product.images : [];
  const [images, setImages] = useState<string[]>(product?.hasCustomImages ? product.images : []);
  const [imagesChanged, setImagesChanged] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const uploadKey = useRef(product?.id ?? `new-${Date.now()}`);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const added: string[] = [];
    for (const file of Array.from(files)) {
      try {
        added.push(await uploadProductImage(uploadKey.current, file));
      } catch (err) {
        toast.error((err as Error).message || `Could not upload ${file.name}`);
      }
    }
    if (added.length) {
      setImages((prev) => [...prev, ...added]);
      setImagesChanged(true);
      toast.success(`${added.length} photo${added.length === 1 ? "" : "s"} uploaded`);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const moveToFront = (url: string) => {
    setImages((prev) => [url, ...prev.filter((u) => u !== url)]);
    setImagesChanged(true);
  };
  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url));
    setImagesChanged(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProduct(
        {
          ...(product ? { id: product.id } : {}),
          name,
          price: Number(price),
          colour,
          category,
          description,
          sizes,
          customisable,
          isUpcoming,
          soldOut,
          isActive,
          // Untouched photos keep whatever is there; an emptied list restores built-in photos
          images: imagesChanged || isNew ? images : null,
        },
        existingIds,
      );
      toast.success(isNew ? "Product added" : "Product saved");
      await onDone();
    } catch (err) {
      toast.error((err as Error).message || "Could not save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      toast.success("Product deleted");
      await onDone();
    } catch (err) {
      toast.error((err as Error).message || "Could not delete product");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass =
    "w-full border border-black/15 px-3 py-2 text-sm rounded-sm bg-white focus:outline-none focus:border-[#6B2C3A]";

  return (
    <div className="flex flex-col min-h-full">
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-black/5 text-left">
        <SheetTitle className="font-serif text-2xl font-normal pr-8">
          {isNew ? "Add product" : "Edit product"}
        </SheetTitle>
        <SheetDescription className="text-xs flex items-center gap-3">
          {isNew ? (
            "New products appear in the shop as soon as they're saved and visible."
          ) : (
            <Link
              to="/product/$id"
              params={{ id: product.id }}
              target="_blank"
              className="inline-flex items-center gap-1 text-[#6B2C3A] hover:underline"
            >
              View in shop <ExternalLink className="size-3" />
            </Link>
          )}
        </SheetDescription>
      </SheetHeader>

      <div className="px-6 py-5 space-y-6 flex-1">
        {/* Photos */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">Photos</h3>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-xs text-[#6B2C3A] inline-flex items-center gap-1 hover:underline disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ImagePlus className="size-3.5" />
              )}
              {uploading ? "Uploading..." : "Upload photos"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {images.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {images.map((url, i) => (
                <div
                  key={url}
                  className="relative group aspect-[3/4] bg-muted rounded-sm overflow-hidden"
                >
                  <img src={url} alt="" className="size-full object-cover object-top" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 text-[9px] uppercase tracking-wider bg-white/90 px-1.5 py-0.5 rounded-sm">
                      Cover
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-gradient-to-t from-black/50 to-transparent">
                    {i !== 0 ? (
                      <button
                        type="button"
                        onClick={() => moveToFront(url)}
                        className="text-white p-1"
                        aria-label="Make cover photo"
                        title="Make cover photo"
                      >
                        <Star className="size-3.5" />
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="text-white p-1"
                      aria-label="Remove photo"
                      title="Remove photo"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : builtInImages.length > 0 ? (
            <div>
              <div className="grid grid-cols-6 gap-1.5 opacity-80">
                {builtInImages.slice(0, 6).map((url) => (
                  <div key={url} className="aspect-[3/4] bg-muted rounded-sm overflow-hidden">
                    <img src={url} alt="" className="size-full object-cover object-top" />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Showing the built-in photos. Uploading photos replaces them for this product.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border border-dashed border-black/20 rounded-md py-8 text-xs text-muted-foreground hover:border-[#6B2C3A]/50"
            >
              Add at least one photo (JPG or PNG, up to 8 MB)
            </button>
          )}
        </section>

        {/* Details */}
        <section className="space-y-4">
          <div>
            <label htmlFor="p-name" className="block text-xs font-medium mb-1.5">
              Name
            </label>
            <input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="p-price" className="block text-xs font-medium mb-1.5">
                Price (£)
              </label>
              <input
                id="p-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="p-colour" className="block text-xs font-medium mb-1.5">
                Colour
              </label>
              <input
                id="p-colour"
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="p-category" className="block text-xs font-medium mb-1.5">
              Category
            </label>
            <select
              id="p-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="p-description" className="block text-xs font-medium mb-1.5">
              Description
            </label>
            <textarea
              id="p-description"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} resize-y`}
              placeholder={"About the outfit.\n\nProduct Details:\n• Suit Fabric: ...\n• Work: ..."}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Lines like "• Fabric: Silk" show as a details table on the product page.
            </p>
          </div>
          <div>
            <span className="block text-xs font-medium mb-1.5">Sizes</span>
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_SIZE_OPTIONS.map((s) => {
                const on = sizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setSizes((prev) =>
                        on
                          ? prev.filter((x) => x !== s)
                          : PRODUCT_SIZE_OPTIONS.filter((x) => x === s || prev.includes(x)),
                      )
                    }
                    className={`px-3 py-1.5 text-xs rounded-sm border ${
                      on ? "bg-[#6B2C3A] text-white border-[#6B2C3A]" : "bg-white border-black/15"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Switches */}
        <section className="bg-[#FAF9F6] border border-black/5 rounded-md divide-y divide-black/5">
          {[
            {
              label: "Visible in shop",
              hint: "Off hides it from the website and stops new orders",
              value: isActive,
              set: setIsActive,
            },
            {
              label: "Sold out",
              hint: "Still shown, but can't be added to the bag",
              value: soldOut,
              set: setSoldOut,
            },
            {
              label: "Upcoming",
              hint: "Shown as coming soon, can't be bought yet",
              value: isUpcoming,
              set: setIsUpcoming,
            },
            {
              label: "Made to measure",
              hint: "Customer can send custom measurements",
              value: customisable,
              set: setCustomisable,
            },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm">{row.label}</p>
                <p className="text-[11px] text-muted-foreground">{row.hint}</p>
              </div>
              <Toggle label={row.label} checked={row.value} onChange={row.set} />
            </div>
          ))}
        </section>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploading}
          className="btn-primary !py-2.5 !px-5 !text-xs w-full disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {saving ? "Saving..." : isNew ? "Add product" : "Save changes"}
        </button>

        {!isNew && (
          <div className="pt-2 border-t border-black/5">
            {confirmDelete ? (
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-destructive">
                  Delete permanently? Products with orders can only be hidden.
                </span>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="border border-black/15 px-2.5 py-1 rounded-sm hover:bg-black/5"
                  >
                    Keep
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-white px-2.5 py-1 rounded-sm inline-flex items-center gap-1"
                  >
                    {deleting && <Loader2 className="size-3 animate-spin" />}
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-destructive/80 hover:text-destructive inline-flex items-center gap-1"
              >
                <Trash2 className="size-3.5" />
                Delete product
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
