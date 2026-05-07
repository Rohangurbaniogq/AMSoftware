"use client";

import { useState, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import Papa from "papaparse";
import { Card } from "@/components/Card";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useData } from "@/components/DataProvider";
import { uploadAthletes, removeAthlete } from "@/lib/sheets";
import { Athlete } from "@/lib/types";

type Tab = "view" | "upload";

export default function UploadPage() {
  const { athletes, loading, refreshAthletes } = useData();
  const [tab, setTab] = useState<Tab>("view");
  const [search, setSearch] = useState("");
  const [filterSport, setFilterSport] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Athlete[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived data
  const sports = useMemo(
    () => [...new Set(athletes.map((a) => a.sport))].sort(),
    [athletes]
  );

  const filtered = useMemo(() => {
    return athletes.filter((a) => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterSport && a.sport !== filterSport) return false;
      return true;
    });
  }, [athletes, search, filterSport]);

  const handleRemove = async (name: string) => {
    if (!confirm(`Remove ${name} from the athlete list?`)) return;

    setRemoving(name);
    try {
      const result = await removeAthlete(name);
      if (result.success) {
        refreshAthletes();
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to remove athlete");
    } finally {
      setRemoving(null);
    }
  };

  // CSV Upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processFile(selected);
  };

  const handleUpload = async () => {
    if (preview.length === 0) return;

    setUploading(true);
    try {
      const result = await uploadAthletes(preview);
      if (result.success) {
        toast.success(`${result.count} athletes uploaded successfully`);
        setUploaded(true);
        refreshAthletes();
        setTab("view");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const processFile = (selected: File) => {
    if (!selected.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFile(selected);
    setErrors([]);
    setUploaded(false);

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validationErrors: string[] = [];
        const parsed: Athlete[] = [];

        const headers = results.meta.fields || [];
        const requiredHeaders = ["Athlete", "Sport", "Junior/Senior"];
        const missing = requiredHeaders.filter(
          (h) => !headers.some((hdr) => hdr.toLowerCase().trim() === h.toLowerCase())
        );

        if (missing.length > 0) {
          validationErrors.push(`Missing columns: ${missing.join(", ")}`);
          setErrors(validationErrors);
          setPreview([]);
          return;
        }

        const getField = (row: Record<string, string>, field: string) => {
          const key = Object.keys(row).find((k) => k.toLowerCase().trim() === field.toLowerCase());
          return key ? (row[key] || "").trim() : "";
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results.data.forEach((row: any, i: number) => {
          const name = getField(row, "Athlete");
          const sport = getField(row, "Sport");
          const categoryRaw = getField(row, "Junior/Senior");
          const gender = getField(row, "Gender");
          const ageStr = getField(row, "Age");
          const event = getField(row, "Event");
          const trainingBase = getField(row, "Training base");
          const physio = getField(row, "Physio");
          const snc = getField(row, "SnC");
          const psychologist = getField(row, "Psychologist");
          const nutritionist = getField(row, "Nutritionist");
          const topsSupport = getField(row, "TOPS Support");

          if (!name) { validationErrors.push(`Row ${i + 2}: Missing athlete name`); return; }
          if (!sport) { validationErrors.push(`Row ${i + 2}: Missing sport`); return; }

          const age = parseInt(ageStr);
          if (ageStr && (isNaN(age) || age < 0)) {
            validationErrors.push(`Row ${i + 2}: Invalid age "${ageStr}"`);
            return;
          }

          const catLower = categoryRaw.toLowerCase();
          if (catLower !== "junior" && catLower !== "senior") {
            validationErrors.push(`Row ${i + 2}: Invalid Junior/Senior value "${categoryRaw}"`);
            return;
          }

          parsed.push({
            name,
            sport,
            category: catLower === "junior" ? "Junior" : "Senior",
            gender,
            age: age || 0,
            event,
            trainingBase,
            physio,
            snc,
            psychologist,
            nutritionist,
            topsSupport,
          });
        });

        setErrors(validationErrors.slice(0, 10));
        setPreview(parsed);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Athletes</h1>
          <p className="text-sm text-[var(--foreground)]/50 mt-1">
            {loading ? "Loading..." : `${athletes.length} athletes in database`}
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-6 sm:mb-8 bg-[var(--section-bg)] rounded-xl p-1 w-full sm:w-fit">
        {([
          { key: "view" as Tab, label: "View Athletes" },
          { key: "upload" as Tab, label: "Upload CSV" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === t.key
                ? "bg-[var(--yellow)] text-black shadow-sm"
                : "text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "view" ? (
        /* ─────────── View Athletes Tab ─────────── */
        <div>
          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : (
            <>
              {/* Filters */}
              <Card className="mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name..."
                      className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground)]/30 text-sm transition-all duration-200"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={filterSport}
                      onChange={(e) => setFilterSport(e.target.value)}
                      className="px-4 py-3 pr-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] text-sm appearance-none cursor-pointer transition-all duration-200"
                    >
                      <option value="">All Sports</option>
                      {sports.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                </div>
              </Card>

              {/* Athletes Count */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">
                  Showing {filtered.length} of {athletes.length} athletes
                </p>
                <button
                  onClick={refreshAthletes}
                  className="text-xs text-[var(--foreground)]/40 hover:text-[var(--yellow)] transition-colors flex items-center gap-1"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Refresh
                </button>
              </div>

              {/* Athletes Table */}
              {filtered.length === 0 ? (
                <Card>
                  <div className="text-center py-10 text-[var(--foreground)]/30">
                    {athletes.length === 0
                      ? "No athletes in database. Upload a CSV to get started."
                      : "No athletes match your filters."}
                  </div>
                </Card>
              ) : (
                <>
                {/* Desktop table */}
                <Card className="p-0 overflow-hidden hidden sm:block">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--grey-border)] bg-[var(--section-bg)]">
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">#</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Name</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Sport</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Jr/Sr</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Gender</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Age</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Event</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Training Base</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Physio</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">SnC</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Psychologist</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Nutritionist</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">TOPS</th>
                          <th className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((a, i) => (
                          <tr
                            key={`${a.name}-${a.sport}-${a.event}`}
                            className="border-b border-[var(--grey-border)]/30 hover:bg-[var(--section-bg)] transition-colors"
                          >
                            <td className="py-3 px-3 text-[var(--foreground)]/40 text-xs">{i + 1}</td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[var(--yellow)]/10 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-[var(--yellow)]">{a.name.charAt(0)}</span>
                                </div>
                                <span className="font-medium whitespace-nowrap">{a.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-[var(--foreground)]/70 whitespace-nowrap">{a.sport}</td>
                            <td className="py-3 px-3 text-[var(--foreground)]/70">{a.category}</td>
                            <td className="py-3 px-3 text-[var(--foreground)]/70">{a.gender}</td>
                            <td className="py-3 px-3 text-[var(--foreground)]/70">{a.age || "-"}</td>
                            <td className="py-3 px-3 text-[var(--foreground)]/70 whitespace-nowrap">{a.event}</td>
                            <td className="py-3 px-3 text-[var(--foreground)]/70 whitespace-nowrap">{a.trainingBase || "-"}</td>
                            <td className="py-3 px-3 text-[var(--foreground)]/70 whitespace-nowrap">{a.physio || "-"}</td>
                            <td className="py-3 px-3 text-[var(--foreground)]/70 whitespace-nowrap">{a.snc || "-"}</td>
                            <td className="py-3 px-3 text-[var(--foreground)]/70 whitespace-nowrap">{a.psychologist || "-"}</td>
                            <td className="py-3 px-3 text-[var(--foreground)]/70 whitespace-nowrap">{a.nutritionist || "-"}</td>
                            <td className="py-3 px-3 text-[var(--foreground)]/70 whitespace-nowrap">{a.topsSupport || "-"}</td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => handleRemove(a.name)}
                                disabled={removing === a.name}
                                className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200 disabled:opacity-40"
                              >
                                {removing === a.name ? "Removing" : "Remove"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Mobile card list */}
                <div className="sm:hidden space-y-3">
                  {filtered.map((a, i) => (
                    <Card key={`${a.name}-${a.sport}-${a.event}`} className="!p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[var(--yellow)]/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-[var(--yellow)]">{a.name.charAt(0)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{a.name}</p>
                            <p className="text-xs text-[var(--foreground)]/50 truncate">{a.sport} &middot; {a.event}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-[var(--foreground)]/30 shrink-0">#{i + 1}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-x-3 gap-y-2 mt-3 pt-3 border-t border-[var(--grey-border)]/30">
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider text-[var(--foreground)]/35">Category</span>
                          <span className="text-xs font-medium">{a.category}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider text-[var(--foreground)]/35">Gender</span>
                          <span className="text-xs font-medium">{a.gender || "-"}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider text-[var(--foreground)]/35">Age</span>
                          <span className="text-xs font-medium">{a.age || "-"}</span>
                        </div>
                        {a.trainingBase && (
                          <div className="col-span-3">
                            <span className="block text-[10px] uppercase tracking-wider text-[var(--foreground)]/35">Training Base</span>
                            <span className="text-xs font-medium">{a.trainingBase}</span>
                          </div>
                        )}
                      </div>
                      {(a.physio || a.snc || a.psychologist || a.nutritionist || a.topsSupport) && (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2 pt-2 border-t border-[var(--grey-border)]/20">
                          {a.physio && (
                            <div>
                              <span className="text-[10px] text-[var(--foreground)]/35">Physio: </span>
                              <span className="text-[10px] font-medium">{a.physio}</span>
                            </div>
                          )}
                          {a.snc && (
                            <div>
                              <span className="text-[10px] text-[var(--foreground)]/35">SnC: </span>
                              <span className="text-[10px] font-medium">{a.snc}</span>
                            </div>
                          )}
                          {a.psychologist && (
                            <div>
                              <span className="text-[10px] text-[var(--foreground)]/35">Psych: </span>
                              <span className="text-[10px] font-medium">{a.psychologist}</span>
                            </div>
                          )}
                          {a.nutritionist && (
                            <div>
                              <span className="text-[10px] text-[var(--foreground)]/35">Nutrition: </span>
                              <span className="text-[10px] font-medium">{a.nutritionist}</span>
                            </div>
                          )}
                          {a.topsSupport && (
                            <div className="col-span-2">
                              <span className="text-[10px] text-[var(--foreground)]/35">TOPS: </span>
                              <span className="text-[10px] font-medium">{a.topsSupport}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex justify-end mt-2 pt-2 border-t border-[var(--grey-border)]/20">
                        <button
                          onClick={() => handleRemove(a.name)}
                          disabled={removing === a.name}
                          className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-40"
                        >
                          {removing === a.name ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
                </>
              )}
            </>
          )}
        </div>
      ) : (
        /* ─────────── Upload CSV Tab ─────────── */
        <div>
          {/* Upload Zone */}
          <Card className="mb-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-[var(--grey-border)] rounded-xl p-6 sm:p-10 text-center hover:border-[var(--yellow)] transition-colors duration-200 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <svg className="mx-auto mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm font-medium mb-1">
                {file ? file.name : "Drop CSV file here or click to browse"}
              </p>
              <p className="text-xs text-[var(--foreground)]/40 max-w-md mx-auto">
                Required: Athlete, Sport, Junior/Senior. Optional: Gender, Age, Event, Training base, Physio, SnC, Psychologist, Nutritionist, TOPS Support
              </p>
              <p className="text-xs text-red-400 mt-2">
                Warning: This will replace all existing athletes
              </p>
            </div>
          </Card>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <Card className="mb-6 border-red-500/20">
              <h3 className="text-sm font-bold text-red-500 mb-2">Validation Errors</h3>
              <ul className="space-y-1">
                {errors.map((error, i) => (
                  <li key={i} className="text-xs text-red-400">{error}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* Preview Table */}
          {preview.length > 0 && (
            <Card className="mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--yellow)]">
                  Preview ({preview.length} athletes)
                </h3>
                {!uploaded && (
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full sm:w-auto px-6 py-2.5 bg-[var(--yellow)] hover:bg-[var(--yellow-dark)] text-black font-bold rounded-xl text-sm transition-all duration-200 disabled:opacity-40"
                  >
                    {uploading ? "Uploading..." : "Confirm Upload"}
                  </button>
                )}
                {uploaded && (
                  <span className="text-sm text-green-500 font-medium">Uploaded successfully</span>
                )}
              </div>

              {/* Desktop preview table */}
              <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--grey-border)]">
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">#</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Name</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Sport</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Jr/Sr</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Gender</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Age</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Event</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Training Base</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Physio</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">SnC</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Psychologist</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">Nutritionist</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50">TOPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((a, i) => (
                      <tr key={`${a.name}-${a.sport}-${a.event}`} className="border-b border-[var(--grey-border)]/50 hover:bg-[var(--section-bg)] transition-colors">
                        <td className="py-3 px-3 text-[var(--foreground)]/40">{i + 1}</td>
                        <td className="py-3 px-3 font-medium whitespace-nowrap">{a.name}</td>
                        <td className="py-3 px-3 whitespace-nowrap">{a.sport}</td>
                        <td className="py-3 px-3">{a.category}</td>
                        <td className="py-3 px-3">{a.gender}</td>
                        <td className="py-3 px-3">{a.age || "-"}</td>
                        <td className="py-3 px-3 whitespace-nowrap">{a.event}</td>
                        <td className="py-3 px-3 whitespace-nowrap">{a.trainingBase || "-"}</td>
                        <td className="py-3 px-3 whitespace-nowrap">{a.physio || "-"}</td>
                        <td className="py-3 px-3 whitespace-nowrap">{a.snc || "-"}</td>
                        <td className="py-3 px-3 whitespace-nowrap">{a.psychologist || "-"}</td>
                        <td className="py-3 px-3 whitespace-nowrap">{a.nutritionist || "-"}</td>
                        <td className="py-3 px-3 whitespace-nowrap">{a.topsSupport || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile preview list */}
              <div className="sm:hidden space-y-2">
                {preview.map((a, i) => (
                  <div key={`${a.name}-${a.sport}-${a.event}`} className="flex items-center gap-3 bg-[var(--section-bg)] rounded-lg p-3">
                    <span className="text-[10px] text-[var(--foreground)]/40 w-5 shrink-0 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <p className="text-xs text-[var(--foreground)]/50 truncate">{a.sport} &middot; {a.event}</p>
                      <p className="text-[10px] text-[var(--foreground)]/40 truncate">{a.gender} &middot; Age {a.age || "-"} &middot; {a.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
