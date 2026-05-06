import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6 sm:mb-8">
        <div className="h-8 w-32 bg-[var(--section-bg)] rounded-lg animate-pulse" />
        <div className="h-4 w-48 bg-[var(--section-bg)] rounded-lg animate-pulse mt-2" />
      </div>
      <LoadingSkeleton rows={5} />
    </div>
  );
}
