import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Star, Trash2, BadgeCheck, Pencil, Plus, Store } from "lucide-react";
import { toast } from "sonner";
import { useProductLookup } from "@/lib/catalogService";
import { deleteReview, fetchAllReviews } from "@/lib/admin";
import { AddReviewForm, ReviewEditor } from "./AdminReviewForms";

type RatingFilter = "all" | "low" | "verified";

export function AdminReviews() {
  const findProduct = useProductLookup();
  const reviewsQuery = useQuery({ queryKey: ["admin-reviews"], queryFn: fetchAllReviews });
  const [filter, setFilter] = useState<RatingFilter>("all");
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const reviews = useMemo(() => reviewsQuery.data ?? [], [reviewsQuery.data]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter((r) => {
      if (filter === "low" && r.rating > 3) return false;
      if (filter === "verified" && !r.verified_purchase) return false;
      if (!q) return true;
      const productName = findProduct(r.product_id)?.name || r.product_id;
      return [r.author_name, r.title, r.comment, productName].some((v) =>
        v?.toLowerCase().includes(q),
      );
    });
  }, [reviews, filter, query, findProduct]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteReview(id);
      toast.success("Review deleted");
      setConfirmId(null);
      await reviewsQuery.refetch();
    } catch (err) {
      toast.error((err as Error).message || "Could not delete review");
    } finally {
      setDeletingId(null);
    }
  };

  if (reviewsQuery.isLoading) {
    return (
      <div className="py-20 flex justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (reviewsQuery.isError) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 rounded-md text-sm text-red-800">
        Could not load reviews: {(reviewsQuery.error as Error).message}
      </div>
    );
  }

  const filters: { id: RatingFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: reviews.length },
    { id: "low", label: "3★ and below", count: reviews.filter((r) => r.rating <= 3).length },
    {
      id: "verified",
      label: "Verified buyers",
      count: reviews.filter((r) => r.verified_purchase).length,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors ${
                filter === f.id
                  ? "bg-[#6B2C3A] text-white border-[#6B2C3A]"
                  : "bg-white border-black/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label} <span className="opacity-70">({f.count})</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reviews or products"
              aria-label="Search reviews"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-sm border border-black/15 bg-white focus:outline-none focus:border-[#6B2C3A]"
            />
          </div>
          <button
            onClick={() => setAdding(true)}
            className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus className="size-3.5" />
            Add review
          </button>
        </div>
      </div>

      {adding && (
        <AddReviewForm
          onDone={(saved) => {
            setAdding(false);
            if (saved) reviewsQuery.refetch();
          }}
        />
      )}

      {visible.length === 0 ? (
        <div className="bg-white border border-black/10 rounded-md py-16 text-center text-sm text-muted-foreground">
          {reviews.length === 0 ? "No customer reviews yet." : "No reviews match."}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => {
            const productName = findProduct(r.product_id)?.name || r.product_id;
            return (
              <li key={r.id} className="bg-white border border-black/10 rounded-md p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {editingId === r.id ? (
                      <ReviewEditor
                        review={r}
                        onDone={(saved) => {
                          setEditingId(null);
                          if (saved) reviewsQuery.refetch();
                        }}
                      />
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex" aria-label={`${r.rating} out of 5 stars`}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`size-3.5 ${s <= r.rating ? "fill-[#C9A227] text-[#C9A227]" : "text-black/15"}`}
                              />
                            ))}
                          </span>
                          <span className="text-sm font-medium">
                            {r.title || "Customer review"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line break-words">
                          {r.comment}
                        </p>
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 flex-wrap">
                          <span className="text-foreground">{r.author_name}</span>
                          {r.verified_purchase && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-700">
                              <BadgeCheck className="size-3.5" /> Verified buyer
                            </span>
                          )}
                          <span>·</span>
                          <span>{productName}</span>
                          <span>·</span>
                          <span>
                            {new Date(r.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </p>
                        {r.admin_reply && (
                          <div className="mt-3 border-l-2 border-[#6B2C3A]/40 pl-3">
                            <p className="text-[11px] uppercase tracking-wider text-[#6B2C3A] inline-flex items-center gap-1">
                              <Store className="size-3" /> Store reply
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">
                              {r.admin_reply}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="shrink-0 flex items-start gap-4">
                    {editingId !== r.id && confirmId !== r.id && (
                      <button
                        onClick={() => setEditingId(r.id)}
                        className="text-xs text-[#6B2C3A] hover:underline inline-flex items-center gap-1"
                      >
                        <Pencil className="size-3.5" />
                        {r.admin_reply ? "Edit" : "Edit / Reply"}
                      </button>
                    )}
                    {confirmId === r.id ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-destructive">Delete?</span>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="border border-black/15 px-2.5 py-1 rounded-sm hover:bg-black/5"
                        >
                          Keep
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          className="bg-destructive text-white px-2.5 py-1 rounded-sm hover:opacity-90 inline-flex items-center gap-1"
                        >
                          {deletingId === r.id && <Loader2 className="size-3 animate-spin" />}
                          Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(r.id)}
                        className="text-xs text-destructive/80 hover:text-destructive inline-flex items-center gap-1"
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
