import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { addStoreReview, updateReview } from "@/lib/admin";
import { useAllProductsQuery } from "@/lib/catalogService";
import type { ProductReviewRecord } from "@/lib/supabase";

const inputClass =
  "w-full border border-black/15 px-3 py-2 text-sm rounded-sm bg-white focus:outline-none focus:border-[#6B2C3A]";

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          aria-label={`${s} star${s === 1 ? "" : "s"}`}
          onClick={() => onChange(s)}
          className="p-0.5"
        >
          <Star
            className={`size-5 ${s <= value ? "fill-[#C9A227] text-[#C9A227]" : "text-black/20"}`}
          />
        </button>
      ))}
    </div>
  );
}

/** Edit a review's rating/text and write the store's public reply. */
export function ReviewEditor({
  review,
  onDone,
}: {
  review: ProductReviewRecord;
  onDone: (saved: boolean) => void;
}) {
  const [rating, setRating] = useState(review.rating);
  const [title, setTitle] = useState(review.title ?? "");
  const [comment, setComment] = useState(review.comment);
  const [reply, setReply] = useState(review.admin_reply ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateReview({ id: review.id, rating, title, comment, adminReply: reply });
      toast.success("Review updated");
      onDone(true);
    } catch (err) {
      toast.error((err as Error).message || "Could not update review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <StarPicker value={rating} onChange={setRating} />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className={inputClass}
      />
      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        className={`${inputClass} resize-y`}
        aria-label="Review text"
      />
      <div>
        <label htmlFor={`reply-${review.id}`} className="block text-xs font-medium mb-1">
          Store reply{" "}
          <span className="text-muted-foreground font-normal">
            (shown under the review on the product page)
          </span>
        </label>
        <textarea
          id={`reply-${review.id}`}
          rows={2}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={1000}
          placeholder="Thank you so much! We're delighted you loved it."
          className={`${inputClass} resize-y`}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          Save
        </button>
        <button
          onClick={() => onDone(false)}
          className="border border-black/15 px-3 py-2 text-xs rounded-sm hover:bg-black/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Add a review on a customer's behalf (e.g. feedback received on WhatsApp). */
export function AddReviewForm({ onDone }: { onDone: (saved: boolean) => void }) {
  const { data: products = [] } = useAllProductsQuery();
  const [productId, setProductId] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!productId) {
      toast.error("Please choose the product");
      return;
    }
    setSaving(true);
    try {
      await addStoreReview({ productId, authorName, rating, title, comment });
      toast.success("Review added");
      onDone(true);
    } catch (err) {
      toast.error((err as Error).message || "Could not add review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-black/10 rounded-md p-4 sm:p-5 space-y-3">
      <div>
        <h3 className="font-serif text-lg">Add a review</h3>
        <p className="text-xs text-muted-foreground">
          For feedback a customer sent you directly. These reviews are not marked as verified.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className={inputClass}
          aria-label="Product"
        >
          <option value="">Choose product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Customer name"
          maxLength={80}
          className={inputClass}
        />
      </div>
      <StarPicker value={rating} onChange={setRating} />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className={inputClass}
      />
      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        placeholder="What did the customer say?"
        className={`${inputClass} resize-y`}
        aria-label="Review text"
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          Add review
        </button>
        <button
          onClick={() => onDone(false)}
          className="border border-black/15 px-3 py-2 text-xs rounded-sm hover:bg-black/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
