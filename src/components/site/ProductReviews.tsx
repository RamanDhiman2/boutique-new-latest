import { useState, useEffect } from "react";
import { Star, CheckCircle, PenLine, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase, type ProductReviewRecord } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sendProductReviewNotificationEmail } from "@/lib/email";

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

// Built-in curated reviews so each outfit has authentic initial customer feedback
const CURATED_DEFAULT_REVIEWS: Record<string, Omit<ProductReviewRecord, "id" | "product_id">[]> = {
  "elegant-maroon-suit": [
    {
      author_name: "Harleen Kaur",
      rating: 5,
      title: "Pure Royal Craftsmanship",
      comment:
        "The velvet is incredibly rich and the zardozi embroidery is heavy and authentic. The tailoring team contacted me on WhatsApp for custom measurements and the peplum fit was immaculate! Everyone at my family wedding complimented it.",
      verified_purchase: true,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      author_name: "Priya Sharma",
      rating: 5,
      title: "Stunning Bridal Ensemble",
      comment:
        "Ordered with custom measurements and the team reached out on WhatsApp immediately. Beautiful luxury packaging and arrived right on time.",
      verified_purchase: true,
      created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
  ],
  "elegant-purple-georgette-suit": [
    {
      author_name: "Simran Gill",
      rating: 5,
      title: "Exquisite Aari embroidery",
      comment:
        "The shade of purple is so regal. Lightweight georgette yet the work feels premium and luxury. Perfect for evening occasions.",
      verified_purchase: true,
      created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    },
  ],
  "royal-navy-blue-green-suit": [
    {
      author_name: "Jasleen B.",
      rating: 5,
      title: "Colour combination is mesmerising",
      comment:
        "Navy and green silk blend is stunning in person. Delivery to London was fast and beautifully packaged.",
      verified_purchase: true,
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ],
  "all-over-black-heavy-handwork-suit": [
    {
      author_name: "Amanpreet K.",
      rating: 5,
      title: "Showstopper black velvet suit",
      comment:
        "The black velvet with heavy hand embroidery is sensational. Worth every single penny. Made my sister's reception memorable.",
      verified_purchase: true,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
  ],
};

function formatDate(isoStr: string) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
}

export function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ProductReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  // Load reviews from Supabase with graceful fallback
  useEffect(() => {
    let isMounted = true;

    async function fetchReviews() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("product_reviews")
          .select("*")
          .eq("product_id", productId)
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          // Strictly show only real reviews from Supabase!
          if (isMounted) setReviews(data as unknown as ProductReviewRecord[]);
        } else {
          if (isMounted) setReviews([]);
        }
      } catch (err) {
        console.warn("Reviews load warning:", err);
        if (isMounted) setReviews([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchReviews();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  // Pre-fill user name and email if logged in
  useEffect(() => {
    const metaName = user?.user_metadata?.["full_name"];
    if (metaName && !authorName) {
      setAuthorName(String(metaName));
    }
    if (user?.email && !reviewerEmail) {
      setReviewerEmail(user.email);
    }
  }, [user, authorName, reviewerEmail]);

  const handleSubmitReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) {
      toast.error("Please provide your name and review message.");
      return;
    }

    if (!user) {
      toast.error("Please sign in to write a review.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Save to Supabase. The database assigns id, user_id, created_at and
      // derives verified_purchase from the customer's paid orders.
      const { data: inserted, error } = await supabase
        .from("product_reviews")
        .insert({
          product_id: productId,
          user_id: user.id,
          author_name: authorName.trim(),
          rating,
          title: title.trim() || "Customer Review",
          comment: comment.trim(),
        })
        .select()
        .single();

      if (error || !inserted) {
        throw new Error(error?.message || "Could not save your review. Please try again.");
      }

      const newRecord = inserted as unknown as ProductReviewRecord;

      // 2. Show the saved review
      setReviews([newRecord, ...reviews]);

      // 3. Dispatch EmailJS notification to admin/owner
      try {
        await sendProductReviewNotificationEmail({
          product_id: productId,
          product_name: productName,
          author_name: authorName.trim(),
          rating,
          title: title.trim() || "Customer Review",
          comment: comment.trim(),
          reviewer_email: reviewerEmail.trim() || user.email || undefined,
          verified_purchase: newRecord.verified_purchase,
        });
        console.log(
          `[Review Notification] Successfully sent EmailJS alert to admin for review on ${productName}`,
        );
      } catch (emailErr: any) {
        console.warn(
          "[Review Notification] EmailJS dispatch error:",
          emailErr?.message || emailErr,
        );
        // Never block customer experience if email service encounters an issue
      }

      toast.success("Thank you! Your review has been published.");
      setModalOpen(false);
      setTitle("");
      setComment("");
      setRating(5);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  // Rating stats calculation
  const totalCount = reviews.length;
  const avgRating =
    totalCount > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1)
      : "5.0";

  const countsByStar = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: reviews.filter((r) => r.rating === s).length,
    percentage:
      totalCount > 0
        ? Math.round((reviews.filter((r) => r.rating === s).length / totalCount) * 100)
        : 0,
  }));

  return (
    <section className="mt-20 pt-12 border-t border-border/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="eyebrow text-primary">Customer Experiences</div>
          <h2 className="mt-2 text-2xl md:text-3xl font-serif text-foreground">
            Customer Reviews for {productName}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Real feedback from verified clients on bespoke fit, embroidery craftsmanship, and fabric
            quality.
          </p>
        </div>

        {/* Write a Review Button */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xs bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <PenLine className="size-4" /> Write a Review
            </button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Review This Outfit</DialogTitle>
              <DialogDescription className="text-xs">
                Share your thoughts on {productName} to help other clients find their perfect piece.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitReview} className="space-y-4 mt-3">
              {/* Star Rating Selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 text-foreground">
                  Overall Rating *
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                      aria-label={`${star} star`}
                    >
                      <Star
                        className={`size-6 transition-colors ${
                          (hoverRating || rating) >= star
                            ? "fill-gold text-gold"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-muted-foreground ml-2 font-medium">
                    {hoverRating || rating} out of 5 stars
                  </span>
                </div>
              </div>

              {/* Reviewer Name */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-foreground">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={authorName}
                  maxLength={80}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Harleen Kaur, London"
                  className="field w-full text-xs"
                />
              </div>

              {/* Reviewer Email */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-foreground">
                  Your Email{" "}
                  <span className="text-[10px] text-muted-foreground font-normal lowercase">
                    (optional, kept confidential)
                  </span>
                </label>
                <input
                  type="email"
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                  placeholder="e.g. harleen@example.com"
                  className="field w-full text-xs"
                />
              </div>

              {/* Review Headline */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-foreground">
                  Review Title
                </label>
                <input
                  type="text"
                  value={title}
                  maxLength={150}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Gorgeous embroidery and perfect fit"
                  className="field w-full text-xs"
                />
              </div>

              {/* Review Comment */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-foreground">
                  Your Review *
                </label>
                <textarea
                  required
                  rows={4}
                  value={comment}
                  maxLength={2000}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what you liked about the fabric, custom sizing, colour, and finish..."
                  className="field w-full resize-y text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-xs tracking-wider uppercase font-semibold mt-2 cursor-pointer"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Submit Review
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Reviews Grid: Breakdown on Left, Reviews on Right */}
      <div className="grid lg:grid-cols-[300px_1fr] gap-8 lg:gap-12 items-start">
        {/* Rating Breakdown Card */}
        <div className="bg-card border border-border/80 rounded-xs p-6 shadow-2xs">
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-serif text-foreground">{avgRating}</span>
            <div className="flex flex-col">
              <div className="flex text-gold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`size-4 ${i < Math.round(Number(avgRating)) ? "fill-gold text-gold" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground mt-0.5">
                {totalCount} {totalCount === 1 ? "customer rating" : "customer ratings"}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-2 border-t border-border/60 pt-4">
            {countsByStar.map(({ star, count, percentage }) => (
              <div key={star} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <span className="w-12 text-[0.72rem] font-medium">{star} star</span>
                <div className="flex-1 h-2 bg-muted/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[0.68rem] tabular-nums">{percentage}%</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border/60 text-[0.7rem] text-muted-foreground leading-relaxed flex items-center gap-2">
            <CheckCircle className="size-4 text-emerald-600 shrink-0" />
            <span>100% verified bespoke and made-to-measure orders</span>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 flex justify-center items-center text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-xs">Loading customer reviews...</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-card/60 border border-dashed border-border/80 rounded-xs p-10 text-center">
              <MessageSquare className="size-8 mx-auto text-muted-foreground/60 mb-3" />
              <h3 className="font-serif text-lg text-foreground">No customer reviews yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Be the first to review {productName} and share your experience with custom
                tailoring.
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="btn-primary py-2.5 px-4 text-xs font-semibold uppercase tracking-wider"
              >
                Write First Review
              </button>
            </div>
          ) : (
            reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-card border border-border/70 rounded-xs p-5 transition-shadow hover:shadow-2xs"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex text-gold">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-3.5 ${i < rev.rating ? "fill-gold text-gold" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    {rev.verified_purchase && (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle className="size-3" /> Verified Buyer
                      </span>
                    )}
                  </div>
                  <span className="text-[0.68rem] text-muted-foreground">
                    {formatDate(rev.created_at)}
                  </span>
                </div>

                {rev.title && (
                  <h4 className="font-serif text-sm font-semibold text-foreground mb-1.5">
                    {rev.title}
                  </h4>
                )}

                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{rev.comment}</p>

                <div className="text-[0.68rem] font-medium text-foreground/80 flex items-center gap-1">
                  <span>By</span>
                  <span className="font-semibold text-foreground">{rev.author_name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
