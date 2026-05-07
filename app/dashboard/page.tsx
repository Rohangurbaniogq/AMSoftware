"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/Card";
import { SearchableDropdown } from "@/components/SearchableDropdown";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useData } from "@/components/DataProvider";
import { formatDateDisplay } from "@/lib/date-utils";
import { submitForm } from "@/lib/sheets";
import { Athlete, Submission, INTERVENTION_CATEGORIES } from "@/lib/types";

const CONVERTED_KEY = "ogq_converted_planned";
const CONVERSION_LOG_KEY = "ogq_conversion_log";

interface ConversionEntry {
  athleteName: string;
  category: string;
  convertedAt: string;
}

function getConvertedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(CONVERTED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function getConversionLog(): ConversionEntry[] {
  try {
    const raw = localStorage.getItem(CONVERSION_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function markConverted(key: string, athleteName: string, category: string) {
  const set = getConvertedSet();
  set.add(key);
  localStorage.setItem(CONVERTED_KEY, JSON.stringify([...set]));

  const log = getConversionLog();
  log.push({ athleteName, category, convertedAt: new Date().toISOString() });
  localStorage.setItem(CONVERSION_LOG_KEY, JSON.stringify(log));
}

function submissionKey(sub: Submission) {
  return `${sub.athleteName}|${sub.date}|${sub.timestamp}|${sub.plannedCategory}`;
}

type TabType = "athlete" | "sport" | "category";
type DetailView = "successful" | "planned" | "meetings" | "calls" | "general" | "conversions" | null;

const TABS: { key: TabType; label: string }[] = [
  { key: "athlete", label: "Athlete" },
  { key: "sport", label: "Sport" },
  { key: "category", label: "Jr / Sr" },
];

const DETAIL_BUTTONS: { key: DetailView & string; label: string }[] = [
  { key: "successful", label: "Successful Interventions" },
  { key: "planned", label: "Planned Interventions" },
  { key: "meetings", label: "Meetings" },
  { key: "calls", label: "Calls" },
  { key: "general", label: "General Updates" },
  { key: "conversions", label: "Conversions" },
];

const PIE_COLORS = [
  "#FFC107", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE",
  "#85C1E9", "#F0B27A",
];

export default function DashboardPage() {
  const { athletes, submissions: allSubmissions, loading, addLocalSubmission } = useData();
  const [tab, setTab] = useState<TabType>("athlete");
  const [detailView, setDetailView] = useState<DetailView>(null);
  const [convertedKeys, setConvertedKeys] = useState<Set<string>>(() => getConvertedSet());
  const [conversionLog, setConversionLog] = useState<ConversionEntry[]>(() => getConversionLog());
  const [converting, setConverting] = useState(false);

  // Per-tab selection state
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Reset detail view when selection changes
  useEffect(() => { setDetailView(null); }, [selectedAthlete, selectedSport, selectedCategory, tab]);

  const handleConvert = useCallback(async (sub: Submission) => {
    if (converting) return;
    if (!confirm(`Convert "${sub.plannedCategory}" to a successful intervention?`)) return;
    setConverting(true);
    try {
      const newSubmission: Submission = {
        athleteName: sub.athleteName,
        sport: sub.sport,
        event: sub.event,
        category: sub.category,
        date: new Date().toISOString().split("T")[0],
        successfulCategory: sub.plannedCategory as Submission["successfulCategory"],
        successfulDetails: sub.plannedDetails || `Converted from planned intervention (${formatDateDisplay(sub.date)})`,
        plannedCategory: "",
        plannedDetails: "",
        currentLocation: sub.currentLocation,
        generalUpdate: "",
        callsCount: 0,
        meetingsCount: 0,
        timestamp: new Date().toISOString(),
      };
      const result = await submitForm(newSubmission);
      if (result.success) {
        const key = submissionKey(sub);
        markConverted(key, sub.athleteName, sub.plannedCategory || "");
        setConvertedKeys(getConvertedSet());
        setConversionLog(getConversionLog());
        addLocalSubmission(newSubmission);
        toast.success("Planned intervention converted to successful");
      } else {
        toast.error(result.message || "Conversion failed");
      }
    } catch {
      toast.error("Conversion failed");
    } finally {
      setConverting(false);
    }
  }, [converting, addLocalSubmission]);

  // Derived lists
  const sports = useMemo(() => [...new Set(athletes.map((a) => a.sport))].sort(), [athletes]);

  // Filtered athletes for each tab
  const filteredAthletes = useMemo(() => {
    if (tab === "sport" && selectedSport) return athletes.filter((a) => a.sport === selectedSport);
    if (tab === "category" && selectedCategory) return athletes.filter((a) => a.category === selectedCategory);
    return [];
  }, [tab, athletes, selectedSport, selectedCategory]);

  // Filtered submissions for each tab
  const filteredSubmissions = useMemo(() => {
    if (tab === "athlete" && selectedAthlete) return allSubmissions.filter((s) => s.athleteName === selectedAthlete);
    if (tab === "sport" && selectedSport) return allSubmissions.filter((s) => s.sport === selectedSport);
    if (tab === "category" && selectedCategory) return allSubmissions.filter((s) => s.category === selectedCategory);
    return [];
  }, [tab, allSubmissions, selectedAthlete, selectedSport, selectedCategory]);

  const handleDetailToggle = (view: DetailView & string) => {
    setDetailView((prev) => (prev === view ? null : view));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-6 sm:mb-8 bg-[var(--section-bg)] rounded-xl p-1 w-full sm:w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              tab === t.key
                ? "bg-[var(--yellow)] text-black shadow-sm"
                : "text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          {/* ─── Athlete Tab ─── */}
          {tab === "athlete" && (
            <div>
              <Card>
                <SearchableDropdown
                  options={athletes.map((a) => a.name)}
                  value={selectedAthlete}
                  onChange={setSelectedAthlete}
                  placeholder="Search athlete..."
                  label="Select Athlete"
                />
              </Card>

              {selectedAthlete && (() => {
                const athlete = athletes.find((a) => a.name === selectedAthlete);
                if (!athlete) return null;
                return (
                  <>
                    <AthleteInfoCard athlete={athlete} />
                    <InterventionPieChart submissions={filteredSubmissions} label={selectedAthlete} />
                    <DetailButtons detailView={detailView} onToggle={handleDetailToggle} submissions={filteredSubmissions} convertedKeys={convertedKeys} conversionLog={conversionLog} />
                    {detailView && (
                      <Card className="mt-4">
                        {filteredSubmissions.length === 0 ? (
                          <EmptyState label={selectedAthlete} />
                        ) : (
                          <DetailPanel view={detailView} submissions={filteredSubmissions} showAthleteName={false} onConvert={handleConvert} convertedKeys={convertedKeys} conversionLog={conversionLog} />
                        )}
                      </Card>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* ─── Sport Tab ─── */}
          {tab === "sport" && (
            <div>
              <Card>
                <SearchableDropdown
                  options={sports}
                  value={selectedSport}
                  onChange={setSelectedSport}
                  placeholder="Search sport..."
                  label="Select Sport"
                />
              </Card>

              {selectedSport && (
                <>
                  {/* Athletes in this sport — compact scrollable */}
                  <Card className="mt-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--yellow)] mb-3">
                      Athletes in {selectedSport} ({filteredAthletes.length})
                    </h3>
                    {filteredAthletes.length === 0 ? (
                      <p className="text-sm text-[var(--foreground)]/30 text-center py-4">No athletes found</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {filteredAthletes.map((a) => (
                          <div key={`${a.name}-${a.event}`} className="flex items-center gap-2.5 bg-[var(--section-bg)] rounded-lg px-3 py-2">
                            <div className="w-6 h-6 rounded-full bg-[var(--yellow)]/10 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-[var(--yellow)]">{a.name.charAt(0)}</span>
                            </div>
                            <p className="text-xs font-medium truncate flex-1 min-w-0">{a.name}</p>
                            <span className="text-[10px] text-[var(--foreground)]/40 shrink-0">{a.event}</span>
                            <span className="text-[10px] text-[var(--foreground)]/40 shrink-0">{a.category}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Intervention Category Pie Chart */}
                  <InterventionPieChart submissions={filteredSubmissions} label={selectedSport} />

                  <DetailButtons detailView={detailView} onToggle={handleDetailToggle} submissions={filteredSubmissions} convertedKeys={convertedKeys} conversionLog={conversionLog} />
                  {detailView && (
                    <Card className="mt-4">
                      {filteredSubmissions.length === 0 ? (
                        <EmptyState label={selectedSport} />
                      ) : (
                        <DetailPanel view={detailView} submissions={filteredSubmissions} showAthleteName={true} onConvert={handleConvert} convertedKeys={convertedKeys} conversionLog={conversionLog} />
                      )}
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── Category Tab ─── */}
          {tab === "category" && (
            <div>
              <Card>
                <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-3">
                  Select Category
                </span>
                <div className="flex gap-3">
                  {["Junior", "Senior"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCategory(c)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all duration-200 ${
                        selectedCategory === c
                          ? "bg-[var(--yellow)] text-black border-[var(--yellow)]"
                          : "bg-[var(--input-bg)] text-[var(--foreground)]/70 border-[var(--input-border)] hover:border-[var(--yellow)]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </Card>

              {selectedCategory && (
                <>
                  {/* Athletes in this category — compact scrollable */}
                  <Card className="mt-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--yellow)] mb-3">
                      {selectedCategory} Athletes ({filteredAthletes.length})
                    </h3>
                    {filteredAthletes.length === 0 ? (
                      <p className="text-sm text-[var(--foreground)]/30 text-center py-4">No athletes in this category</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {filteredAthletes.map((a) => (
                          <div key={`${a.name}-${a.sport}-${a.event}`} className="flex items-center gap-2.5 bg-[var(--section-bg)] rounded-lg px-3 py-2">
                            <div className="w-6 h-6 rounded-full bg-[var(--yellow)]/10 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-[var(--yellow)]">{a.name.charAt(0)}</span>
                            </div>
                            <p className="text-xs font-medium truncate flex-1 min-w-0">{a.name}</p>
                            <span className="text-[10px] text-[var(--foreground)]/40 shrink-0">{a.sport}</span>
                            <span className="text-[10px] text-[var(--foreground)]/40 shrink-0">{a.event}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  <InterventionPieChart submissions={filteredSubmissions} label={selectedCategory} />

                  <DetailButtons detailView={detailView} onToggle={handleDetailToggle} submissions={filteredSubmissions} convertedKeys={convertedKeys} conversionLog={conversionLog} />
                  {detailView && (
                    <Card className="mt-4">
                      {filteredSubmissions.length === 0 ? (
                        <EmptyState label={selectedCategory} />
                      ) : (
                        <DetailPanel view={detailView} submissions={filteredSubmissions} showAthleteName={true} onConvert={handleConvert} convertedKeys={convertedKeys} conversionLog={conversionLog} />
                      )}
                    </Card>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────── Shared Components ─────────────── */

function AthleteInfoCard({ athlete }: { athlete: Athlete }) {
  return (
    <Card className="mt-4 sm:mt-6">
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[var(--yellow)]/10 flex items-center justify-center shrink-0">
          <span className="text-lg sm:text-xl font-bold text-[var(--yellow)]">{athlete.name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold truncate">{athlete.name}</h2>
          <p className="text-sm text-[var(--foreground)]/50 mt-0.5">{athlete.sport} &middot; {athlete.event}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-[var(--grey-border)]/50">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/40 mb-1">Sport</span>
          <span className="text-sm font-medium">{athlete.sport}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/40 mb-1">Event</span>
          <span className="text-sm font-medium">{athlete.event}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/40 mb-1">Category</span>
          <span className="text-sm font-medium">{athlete.category}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/40 mb-1">Gender</span>
          <span className="text-sm font-medium">{athlete.gender || "-"}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/40 mb-1">Age</span>
          <span className="text-sm font-medium">{athlete.age || "-"}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/40 mb-1">Training Base</span>
          <span className="text-sm font-medium">{athlete.trainingBase || "-"}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/40 mb-1">Physio</span>
          <span className="text-sm font-medium">{athlete.physio || "-"}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/40 mb-1">SnC</span>
          <span className="text-sm font-medium">{athlete.snc || "-"}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/40 mb-1">Psychologist</span>
          <span className="text-sm font-medium">{athlete.psychologist || "-"}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/40 mb-1">Nutritionist</span>
          <span className="text-sm font-medium">{athlete.nutritionist || "-"}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/40 mb-1">TOPS Support</span>
          <span className="text-sm font-medium">{athlete.topsSupport || "-"}</span>
        </div>
      </div>
    </Card>
  );
}

function DetailButtons({ detailView, onToggle, submissions, convertedKeys, conversionLog }: { detailView: DetailView; onToggle: (view: DetailView & string) => void; submissions: Submission[]; convertedKeys?: Set<string>; conversionLog?: ConversionEntry[] }) {
  const athleteNames = new Set(submissions.map((s) => s.athleteName));
  const counts = {
    successful: submissions.filter((s) => s.successfulCategory || s.successfulDetails).length,
    planned: submissions.filter((s) => {
      if (!s.plannedCategory && !s.plannedDetails) return false;
      if (convertedKeys && convertedKeys.has(submissionKey(s))) return false;
      return true;
    }).length,
    meetings: submissions.reduce((sum, s) => sum + s.meetingsCount, 0),
    calls: submissions.reduce((sum, s) => sum + s.callsCount, 0),
    general: submissions.filter((s) => s.generalUpdate).length,
    conversions: (conversionLog || []).filter((c) => athleteNames.has(c.athleteName)).length,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mt-4 sm:mt-6">
      {DETAIL_BUTTONS.map((btn) => (
        <button
          key={btn.key}
          onClick={() => onToggle(btn.key)}
          className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-sm font-bold border transition-all duration-200 flex flex-col items-center gap-0.5 sm:gap-1 ${
            detailView === btn.key
              ? "bg-[var(--yellow)] text-black border-[var(--yellow)] shadow-sm"
              : "bg-[var(--card-bg)] text-[var(--foreground)]/70 border-[var(--grey-border)] hover:border-[var(--yellow)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className={`text-xl sm:text-2xl font-bold ${detailView === btn.key ? "text-black" : "text-[var(--yellow)]"}`}>
            {counts[btn.key]}
          </span>
          <span className="text-[10px] sm:text-xs leading-tight text-center">{btn.label}</span>
        </button>
      ))}
    </div>
  );
}

function InterventionPieChart({ submissions, label }: { submissions: Submission[]; label: string }) {
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    submissions.forEach((s) => {
      if (s.successfulCategory) {
        counts[s.successfulCategory] = (counts[s.successfulCategory] || 0) + 1;
      }
      if (s.plannedCategory) {
        counts[s.plannedCategory] = (counts[s.plannedCategory] || 0) + 1;
      }
    });

    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
    if (total === 0) return { entries: [], total: 0 };

    const entries = INTERVENTION_CATEGORIES
      .map((cat, i) => ({
        category: cat,
        count: counts[cat] || 0,
        percentage: total > 0 ? ((counts[cat] || 0) / total) * 100 : 0,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count);

    return { entries, total };
  }, [submissions]);

  if (categoryData.total === 0) {
    return (
      <Card className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--yellow)] mb-4">
          Intervention Sub-Categories
        </h3>
        <p className="text-sm text-[var(--foreground)]/30 text-center py-4">
          No intervention sub-categories recorded for {label}
        </p>
      </Card>
    );
  }

  // Build donut chart — ring with percentage/count inside, legend outside
  const outerRadius = 90;
  const innerRadius = 55;
  const cx = 100;
  const cy = 100;
  let currentAngle = -90;

  const slices = categoryData.entries.map((entry) => {
    const angle = (entry.count / categoryData.total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const outerX1 = cx + outerRadius * Math.cos(startRad);
    const outerY1 = cy + outerRadius * Math.sin(startRad);
    const outerX2 = cx + outerRadius * Math.cos(endRad);
    const outerY2 = cy + outerRadius * Math.sin(endRad);
    const innerX1 = cx + innerRadius * Math.cos(endRad);
    const innerY1 = cy + innerRadius * Math.sin(endRad);
    const innerX2 = cx + innerRadius * Math.cos(startRad);
    const innerY2 = cy + innerRadius * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = categoryData.entries.length === 1
      ? `M ${cx} ${cy - outerRadius} A ${outerRadius} ${outerRadius} 0 1 1 ${cx - 0.01} ${cy - outerRadius} Z M ${cx} ${cy - innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${cx + 0.01} ${cy - innerRadius} Z`
      : `M ${outerX1} ${outerY1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerX2} ${outerY2} L ${innerX1} ${innerY1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerX2} ${innerY2} Z`;

    // Label position at midpoint of the arc, between inner and outer radius
    const midAngle = ((startAngle + endAngle) / 2) * Math.PI / 180;
    const labelRadius = (outerRadius + innerRadius) / 2;
    const labelX = cx + labelRadius * Math.cos(midAngle);
    const labelY = cy + labelRadius * Math.sin(midAngle);

    return { ...entry, path, labelX, labelY, angle };
  });

  return (
    <Card className="mt-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--yellow)] mb-4">
        Intervention Sub-Categories — {label} ({categoryData.total} total)
      </h3>
      <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
        {/* Donut Chart with numbers inside */}
        <div className="shrink-0">
          <svg width="220" height="220" viewBox="-10 -10 220 220">
            {slices.map((slice) => (
              <path
                key={slice.category}
                d={slice.path}
                fill={slice.color}
                stroke="var(--card-bg)"
                strokeWidth="2"
                fillRule="evenodd"
              />
            ))}
            {/* Labels inside ring segments — only show if slice is big enough */}
            {slices.map((slice) => (
              slice.angle > 25 ? (
                <g key={`label-${slice.category}`}>
                  <text
                    x={slice.labelX}
                    y={slice.labelY - 5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#000"
                    fontSize="11"
                    fontWeight="700"
                  >
                    {slice.count}
                  </text>
                  <text
                    x={slice.labelX}
                    y={slice.labelY + 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#000"
                    fontSize="9"
                    fontWeight="600"
                    opacity="0.7"
                  >
                    {slice.percentage.toFixed(0)}%
                  </text>
                </g>
              ) : null
            ))}
            {/* Center total */}
            <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle" fill="var(--foreground)" fontSize="22" fontWeight="800">
              {categoryData.total}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle" fill="var(--foreground)" fontSize="9" opacity="0.5" fontWeight="600">
              TOTAL
            </text>
          </svg>
        </div>

        {/* Legend outside — color + name only */}
        <div className="flex-1 w-full space-y-2">
          {slices.map((entry) => (
            <div key={entry.category} className="flex items-center gap-3 bg-[var(--section-bg)] rounded-lg p-2.5 sm:p-3">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs sm:text-sm font-medium flex-1 min-w-0 truncate">{entry.category}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-center py-8 text-[var(--foreground)]/30 text-sm">
      No submissions found for {label}
    </p>
  );
}

function DetailPanel({ view, submissions, showAthleteName, onConvert, convertedKeys, conversionLog }: { view: NonNullable<DetailView>; submissions: Submission[]; showAthleteName: boolean; onConvert?: (sub: Submission) => void; convertedKeys?: Set<string>; conversionLog?: ConversionEntry[] }) {
  const sorted = [...submissions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (view === "successful") {
    const withData = sorted.filter((s) => s.successfulCategory || s.successfulDetails);
    if (withData.length === 0) {
      return <p className="text-center py-8 text-[var(--foreground)]/30 text-sm">No successful interventions recorded</p>;
    }
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-green-500">
          Successful Interventions ({withData.length})
        </h3>
        {withData.map((sub, idx) => (
          <div key={`${sub.athleteName}-${sub.date}-${sub.timestamp}-${idx}`} className="bg-[var(--section-bg)] rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                {showAthleteName && (
                  <span className="text-xs font-bold text-[var(--foreground)]">{sub.athleteName} &middot;</span>
                )}
                <span className="text-xs font-semibold text-[var(--yellow)]">
                  {formatDateDisplay(sub.date)}
                </span>
                {sub.successfulCategory && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500">
                    {sub.successfulCategory}
                  </span>
                )}
              </div>
              {sub.currentLocation && (
                <span className="text-xs text-[var(--foreground)]/40">{sub.currentLocation}</span>
              )}
            </div>
            {sub.successfulDetails && (
              <p className="text-sm text-[var(--foreground)]">{sub.successfulDetails}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (view === "planned") {
    const withData = sorted.filter((s) => {
      if (!s.plannedCategory && !s.plannedDetails) return false;
      if (convertedKeys && convertedKeys.has(submissionKey(s))) return false;
      return true;
    });
    if (withData.length === 0) {
      return <p className="text-center py-8 text-[var(--foreground)]/30 text-sm">No planned interventions recorded</p>;
    }
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--yellow)]">
          Planned Interventions ({withData.length})
        </h3>
        {withData.map((sub, idx) => (
          <div key={`${sub.athleteName}-${sub.date}-${sub.timestamp}-${idx}`} className="bg-[var(--section-bg)] rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                {showAthleteName && (
                  <span className="text-xs font-bold text-[var(--foreground)]">{sub.athleteName} &middot;</span>
                )}
                <span className="text-xs font-semibold text-[var(--yellow)]">
                  {formatDateDisplay(sub.date)}
                </span>
                {sub.plannedCategory && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--yellow)]/10 text-[var(--yellow)]">
                    {sub.plannedCategory}
                  </span>
                )}
              </div>
              {sub.currentLocation && (
                <span className="text-xs text-[var(--foreground)]/40">{sub.currentLocation}</span>
              )}
            </div>
            {sub.plannedDetails && (
              <p className="text-sm text-[var(--foreground)]">{sub.plannedDetails}</p>
            )}
            {onConvert && (
              <div className="flex justify-end mt-3 pt-3 border-t border-[var(--grey-border)]/30">
                <button
                  onClick={() => onConvert(sub)}
                  className="px-3 py-1.5 text-xs font-bold text-green-500 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-all duration-200"
                >
                  Convert to Successful
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (view === "meetings") {
    const total = sorted.reduce((sum, s) => sum + s.meetingsCount, 0);
    const withData = sorted.filter((s) => s.meetingsCount > 0);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--yellow)]">Meetings</h3>
          <span className="text-2xl font-bold text-[var(--yellow)]">{total} total</span>
        </div>
        {withData.length === 0 ? (
          <p className="text-center py-4 text-[var(--foreground)]/30 text-sm">No meetings recorded</p>
        ) : (
          withData.map((sub, idx) => (
            <div key={`${sub.athleteName}-${sub.date}-${sub.timestamp}-${idx}`} className="flex items-center justify-between bg-[var(--section-bg)] rounded-lg p-4">
              <div>
                {showAthleteName && (
                  <p className="text-xs font-bold text-[var(--foreground)] mb-0.5">{sub.athleteName}</p>
                )}
                <span className="text-xs font-semibold text-[var(--foreground)]/60">
                  {formatDateDisplay(sub.date)}
                </span>
              </div>
              <span className="text-lg font-bold text-[var(--yellow)]">{sub.meetingsCount}</span>
            </div>
          ))
        )}
      </div>
    );
  }

  if (view === "conversions") {
    const athleteNames = new Set(submissions.map((s) => s.athleteName));
    const relevant = (conversionLog || []).filter((c) => athleteNames.has(c.athleteName));
    if (relevant.length === 0) {
      return <p className="text-center py-8 text-[var(--foreground)]/30 text-sm">No conversions recorded</p>;
    }
    // Group by athlete
    const byAthlete: Record<string, ConversionEntry[]> = {};
    relevant.forEach((c) => {
      if (!byAthlete[c.athleteName]) byAthlete[c.athleteName] = [];
      byAthlete[c.athleteName].push(c);
    });
    const athleteEntries = Object.entries(byAthlete).sort((a, b) => b[1].length - a[1].length);
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-green-500">
          Planned → Successful Conversions ({relevant.length})
        </h3>
        {athleteEntries.map(([name, entries]) => (
          <div key={name} className="bg-[var(--section-bg)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">{name}</span>
              <span className="text-lg font-bold text-green-500">{entries.length}</span>
            </div>
            <div className="space-y-1.5">
              {entries.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--foreground)]/60">
                    {entry.category || "—"}
                  </span>
                  <span className="text-[var(--foreground)]/40">
                    {formatDateDisplay(entry.convertedAt.split("T")[0])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (view === "general") {
    const withData = sorted.filter((s) => s.generalUpdate);
    if (withData.length === 0) {
      return <p className="text-center py-8 text-[var(--foreground)]/30 text-sm">No general updates recorded</p>;
    }
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--yellow)]">
          General Updates ({withData.length})
        </h3>
        {withData.map((sub, idx) => (
          <div key={`${sub.athleteName}-${sub.date}-${sub.timestamp}-${idx}`} className="bg-[var(--section-bg)] rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                {showAthleteName && (
                  <span className="text-xs font-bold text-[var(--foreground)]">{sub.athleteName} &middot;</span>
                )}
                <span className="text-xs font-semibold text-[var(--yellow)]">
                  {formatDateDisplay(sub.date)}
                </span>
              </div>
              {sub.currentLocation && (
                <span className="text-xs text-[var(--foreground)]/40">{sub.currentLocation}</span>
              )}
            </div>
            <p className="text-sm text-[var(--foreground)]">{sub.generalUpdate}</p>
          </div>
        ))}
      </div>
    );
  }

  // calls
  const total = sorted.reduce((sum, s) => sum + s.callsCount, 0);
  const withData = sorted.filter((s) => s.callsCount > 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--yellow)]">Calls</h3>
        <span className="text-2xl font-bold text-[var(--yellow)]">{total} total</span>
      </div>
      {withData.length === 0 ? (
        <p className="text-center py-4 text-[var(--foreground)]/30 text-sm">No calls recorded</p>
      ) : (
        withData.map((sub, idx) => (
          <div key={`${sub.athleteName}-${sub.date}-${sub.timestamp}-${idx}`} className="flex items-center justify-between bg-[var(--section-bg)] rounded-lg p-4">
            <div>
              {showAthleteName && (
                <p className="text-xs font-bold text-[var(--foreground)] mb-0.5">{sub.athleteName}</p>
              )}
              <span className="text-xs font-semibold text-[var(--foreground)]/60">
                {formatDateDisplay(sub.date)}
              </span>
            </div>
            <span className="text-lg font-bold text-[var(--yellow)]">{sub.callsCount}</span>
          </div>
        ))
      )}
    </div>
  );
}
