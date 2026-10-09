import { waLink } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-5", className)}
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.08C19.42 7.64 20.28 9.7 20.28 11.91C20.28 16.45 16.59 20.14 12.04 20.14C10.61 20.14 9.21 19.76 7.99 19.04L7.7 18.87L4.59 19.68L5.42 16.65L5.23 16.35C4.43 15.07 4.01 13.51 4.01 11.91C4.01 7.37 7.7 3.67 12.05 3.67ZM8.83 7.39C8.64 7.39 8.34 7.46 8.09 7.73C7.84 8 7.13 8.67 7.13 10.03C7.13 11.39 8.12 12.7 8.26 12.89C8.4 13.07 10.2 15.86 12.96 17.05C13.62 17.33 14.13 17.5 14.53 17.63C15.19 17.84 15.79 17.81 16.27 17.74C16.8 17.66 17.9 17.07 18.13 16.42C18.36 15.77 18.36 15.22 18.29 15.1C18.22 14.98 18.03 14.91 17.74 14.77C17.46 14.63 16.07 13.94 15.81 13.85C15.55 13.76 15.37 13.71 15.18 13.99C14.99 14.27 14.46 14.91 14.3 15.09C14.14 15.27 13.98 15.3 13.69 15.16C13.41 15.02 12.5 14.72 11.43 13.77C10.6 13.03 10.03 12.11 9.87 11.83C9.71 11.55 9.85 11.4 10 11.26C10.13 11.13 10.29 10.92 10.43 10.76C10.57 10.6 10.62 10.48 10.71 10.3C10.8 10.12 10.76 9.96 10.69 9.82C10.62 9.68 10.06 8.31 9.83 7.75C9.61 7.21 9.38 7.29 9.21 7.28C9.05 7.27 8.87 7.39 8.83 7.39Z" />
    </svg>
  );
}

/**
 * Floating WhatsApp button fixed in the bottom-right corner of every page.
 */
export function WhatsAppFloatingButton({
  message = "Hi SohniMutiyaar By CC, I'd like to enquire about an outfit.",
}: {
  message?: string;
}) {
  return (
    <aside
      aria-label="WhatsApp enquiry"
      className="fixed bottom-6 right-6 z-50 flex items-center group pointer-events-auto"
    >
      <a
        href={waLink(message)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
      >
        <WhatsAppIcon className="size-6 text-white shrink-0" />
        <span className="font-sans text-xs uppercase tracking-wider font-semibold whitespace-nowrap pr-1 hidden sm:inline-block">
          WhatsApp Enquiry
        </span>
      </a>
    </aside>
  );
}

/**
 * Inline WhatsApp button for product pages, contact page, custom designs, etc.
 */
export function WhatsAppEnquiryButton({
  message,
  className,
  label = "Chat on WhatsApp",
}: {
  message?: string;
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={waLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 py-3.5 px-6 bg-[#25D366] hover:bg-[#20ba59] text-white font-medium text-xs uppercase tracking-wider rounded-sm shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99]",
        className,
      )}
    >
      <WhatsAppIcon className="size-5 shrink-0" />
      <span>{label}</span>
    </a>
  );
}
