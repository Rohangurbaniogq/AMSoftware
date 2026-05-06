export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
