import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6 sm:mb-8">
        <div className="h-8 w-40 bg-[var(--section-bg)] rounded-lg animate-pulse" />
      </div>
      <div className="flex gap-1 mb-6 sm:mb-8 bg-[var(--section-bg)] rounded-xl p-1 w-fit">
        <div className="h-10 w-20 rounded-lg bg-[var(--section-bg)] animate-pulse" />
        <div className="h-10 w-20 rounded-lg bg-[var(--section-bg)] animate-pulse" />
        <div className="h-10 w-20 rounded-lg bg-[var(--section-bg)] animate-pulse" />
      </div>
      <LoadingSkeleton rows={4} />
    </div>
  );
}
