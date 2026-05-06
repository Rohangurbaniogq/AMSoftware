interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-[var(--card-bg)] rounded-xl p-4 sm:p-6 border border-[var(--grey-border)]/50 ${className}`}
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      {children}
    </div>
  );
}
