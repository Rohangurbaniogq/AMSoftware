"use client";

import Link from "next/link";
import { Card } from "@/components/Card";

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Hero */}
      <div className="text-center mb-10 sm:mb-16">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3 sm:mb-4">
          <span className="text-[var(--yellow)]">OGQ</span> Athlete Monitoring
        </h1>
        <p className="text-lg text-[var(--foreground)]/60 max-w-2xl mx-auto">
          Track interventions, monitor progress, and analyze performance across 350+ athletes.
          Financial Year 2026-27.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <Link href="/form" className="group">
          <Card className="h-full hover:border-[var(--yellow)]/50 transition-all duration-200 group-hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-lg bg-[var(--yellow)]/10 flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-1">Submit Report</h2>
            <p className="text-sm text-[var(--foreground)]/50">
              Log interventions, updates, and meeting data for any athlete.
            </p>
          </Card>
        </Link>

        <Link href="/dashboard" className="group">
          <Card className="h-full hover:border-[var(--yellow)]/50 transition-all duration-200 group-hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-lg bg-[var(--yellow)]/10 flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-1">Dashboard</h2>
            <p className="text-sm text-[var(--foreground)]/50">
              View athlete analytics and intervention tracking.
            </p>
          </Card>
        </Link>

        <Link href="/upload" className="group">
          <Card className="h-full hover:border-[var(--yellow)]/50 transition-all duration-200 group-hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-lg bg-[var(--yellow)]/10 flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-1">Upload Athletes</h2>
            <p className="text-sm text-[var(--foreground)]/50">
              Import athlete database from CSV file.
            </p>
          </Card>
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="mt-16 grid grid-cols-3 gap-4 max-w-3xl mx-auto">
        {[
          { label: "Athletes", value: "350+" },
          { label: "Sports", value: "15+" },
          { label: "FY", value: "2026-27" },
        ].map((stat) => (
          <div key={stat.label} className="text-center py-4">
            <div className="text-2xl font-bold text-[var(--yellow)]">{stat.value}</div>
            <div className="text-xs uppercase tracking-wider text-[var(--foreground)]/40 mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
