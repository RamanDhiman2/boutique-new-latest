import { useState } from "react";
import { CreditCard, ExternalLink, Loader2, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { gbp } from "@/lib/catalog";
import {
  fetchPaymentDetails,
  refundOrder,
  setOrderNote,
  updateOrderAddress,
  type AdminOrder,
  type PaymentDetails,
} from "@/lib/admin";

const inputClass =
  "w-full border border-black/15 px-3 py-2 text-sm rounded-sm bg-white focus:outline-none focus:border-[#6B2C3A]";

const DISPUTE_LABELS: Record<string, string> = {
  warning_needs_response: "Early warning — respond in Stripe",
  warning_under_review: "Early warning under review",
  warning_closed: "Early warning closed",
  needs_response: "Chargeback — respond in Stripe",
  under_review: "Chargeback under review",
  won: "Chargeback won",
  lost: "Chargeback lost",
};

/** Stripe payment summary, refund history and the refund form. */
export function OrderPayment({ order, onChanged }: { order: AdminOrder; onChanged: () => void }) {
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("requested_by_customer");
  const [refunding, setRefunding] = useState(false);

  const total = Number(order.total_amount) || 0;
  const refunded = Number(order.refunded_amount) || 0;
  const remaining = Math.max(0, Math.round((total - refunded) * 100) / 100);
  const canRefund = order.payment_status === "captured" && remaining > 0;

  const load = async () => {
    setLoading(true);
    try {
      setDetails(await fetchPaymentDetails(order.id));
    } catch (err) {
      toast.error((err as Error).message || "Could not load payment");
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    const value = amount.trim() === "" ? remaining : Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > remaining) {
      toast.error(`Enter an amount between £0.01 and ${gbp(remaining)}`);
      return;
    }
    const ok = window.confirm(
      `Refund ${gbp(value)} to the customer's card? This sends money back through Stripe and cannot be undone.`,
    );
    if (!ok) return;
    setRefunding(true);
    try {
      const res = await refundOrder(order.id, amount.trim() === "" ? null : value, reason);
      toast.success(res.fully_refunded ? "Order fully refunded" : `Refunded ${gbp(value)}`);
      setShowRefund(false);
      setAmount("");
      setDetails(null);
      onChanged();
    } catch (err) {
      toast.error((err as Error).message || "Refund failed");
    } finally {
      setRefunding(false);
    }
  };

  return (
    <section className="border border-black/10 rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
          <CreditCard className="size-3.5" />
          Payment
        </h3>
        {!details && (
          <button
            onClick={load}
            disabled={loading}
            className="text-[11px] text-[#6B2C3A] hover:underline inline-flex items-center gap-1 disabled:opacity-50"
          >
            {loading && <Loader2 className="size-3 animate-spin" />}
            Show Stripe details
          </button>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">Charged</dt>
        <dd className="text-right tabular-nums">{gbp(total)}</dd>
        {refunded > 0 && (
          <>
            <dt className="text-muted-foreground">Refunded</dt>
            <dd className="text-right tabular-nums text-purple-700">
              −{gbp(refunded)}
              {order.refunded_at && (
                <span className="text-muted-foreground">
                  {" "}
                  · {new Date(order.refunded_at).toLocaleDateString("en-GB")}
                </span>
              )}
            </dd>
          </>
        )}
        {details && (
          <>
            <dt className="text-muted-foreground">Stripe status</dt>
            <dd className="text-right capitalize">{details.status.replace(/_/g, " ")}</dd>
            {(details.card_brand || details.wallet) && (
              <>
                <dt className="text-muted-foreground">Paid with</dt>
                <dd className="text-right capitalize">
                  {details.wallet ? `${details.wallet.replace(/_/g, " ")} · ` : ""}
                  {details.card_brand} •••• {details.card_last4}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Paid on</dt>
            <dd className="text-right">
              {new Date(details.created).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </dd>
          </>
        )}
      </dl>

      {order.dispute_status && (
        <p className="text-xs bg-red-50 border border-red-200 text-red-800 rounded-sm px-3 py-2">
          {DISPUTE_LABELS[order.dispute_status] || `Dispute: ${order.dispute_status}`}
        </p>
      )}

      {details && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          {details.receipt_url && (
            <a
              href={details.receipt_url}
              target="_blank"
              rel="noreferrer"
              className="text-[#6B2C3A] hover:underline inline-flex items-center gap-1"
            >
              <ReceiptText className="size-3" /> Receipt
            </a>
          )}
          <a
            href={details.dashboard_url}
            target="_blank"
            rel="noreferrer"
            className="text-[#6B2C3A] hover:underline inline-flex items-center gap-1"
          >
            Open in Stripe <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      {canRefund &&
        (showRefund ? (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="refund-amount" className="block text-[11px] font-medium mb-1">
                  Amount (£)
                </label>
                <input
                  id="refund-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  max={remaining}
                  placeholder={`${remaining.toFixed(2)} (full)`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="refund-reason" className="block text-[11px] font-medium mb-1">
                  Reason
                </label>
                <select
                  id="refund-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={inputClass}
                >
                  <option value="requested_by_customer">Customer request</option>
                  <option value="duplicate">Duplicate payment</option>
                  <option value="fraudulent">Fraudulent</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Leave the amount empty for a full refund. The order status does not change; cancel it
              separately if needed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRefund}
                disabled={refunding}
                className="bg-destructive text-white px-3 py-2 text-xs rounded-sm hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {refunding && <Loader2 className="size-3.5 animate-spin" />}
                Refund
              </button>
              <button
                onClick={() => setShowRefund(false)}
                className="border border-black/15 px-3 py-2 text-xs rounded-sm hover:bg-black/5"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowRefund(true)}
            className="text-xs text-destructive/80 hover:text-destructive hover:underline"
          >
            Refund payment…
          </button>
        ))}
    </section>
  );
}

/** Private note visible only in the admin panel. */
export function OrderNotes({ order, onSaved }: { order: AdminOrder; onSaved: () => void }) {
  const [note, setNote] = useState(order.admin_notes || "");
  const [saving, setSaving] = useState(false);
  const dirty = note !== (order.admin_notes || "");

  const save = async () => {
    setSaving(true);
    try {
      await setOrderNote(order.id, note);
      toast.success("Note saved");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message || "Could not save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <label
        htmlFor="admin-note"
        className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2"
      >
        Private note
      </label>
      <textarea
        id="admin-note"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Only visible to admins, e.g. fabric ordered, called customer on Tuesday"
        className={`${inputClass} resize-y`}
      />
      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="mt-2 btn-outline !py-1.5 !px-3 !text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving && <Loader2 className="size-3 animate-spin" />}
          Save note
        </button>
      )}
    </section>
  );
}

const ADDRESS_FIELDS: { key: string; label: string; wide?: boolean }[] = [
  { key: "full_name", label: "Name", wide: true },
  { key: "street", label: "Street", wide: true },
  { key: "apartment", label: "Flat / building", wide: true },
  { key: "city", label: "City" },
  { key: "state", label: "County / state" },
  { key: "zip", label: "Postcode" },
  { key: "country", label: "Country" },
  { key: "phone", label: "Phone", wide: true },
];

/** Corrects the delivery address saved with the order. */
export function OrderAddressEditor({
  order,
  onDone,
}: {
  order: AdminOrder;
  onDone: (saved: boolean) => void;
}) {
  const current = (order.shipping_address || {}) as Record<string, string | undefined>;
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(ADDRESS_FIELDS.map((f) => [f.key, current[f.key] ?? ""])),
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const cleaned = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]));
      await updateOrderAddress(order.id, cleaned);
      toast.success("Address updated");
      onDone(true);
    } catch (err) {
      toast.error((err as Error).message || "Could not update address");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {ADDRESS_FIELDS.map((f) => (
          <div key={f.key} className={f.wide ? "col-span-2" : ""}>
            <label htmlFor={`addr-${f.key}`} className="block text-[11px] font-medium mb-0.5">
              {f.label}
            </label>
            <input
              id={`addr-${f.key}`}
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className={`${inputClass} !py-1.5`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary !py-1.5 !px-3 !text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving && <Loader2 className="size-3 animate-spin" />}
          Save address
        </button>
        <button
          onClick={() => onDone(false)}
          className="border border-black/15 px-3 py-1.5 text-xs rounded-sm hover:bg-black/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
