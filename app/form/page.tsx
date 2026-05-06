"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/Card";
import { SearchableDropdown } from "@/components/SearchableDropdown";
import { useData } from "@/components/DataProvider";
import { submitForm } from "@/lib/sheets";
import { INTERVENTION_CATEGORIES, InterventionCategory } from "@/lib/types";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function FormPage() {
  const { athletes, refreshSubmissions } = useData();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [sport, setSport] = useState("");
  const [event, setEvent] = useState("");
  const [category, setCategory] = useState<"Junior" | "Senior">("Senior");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [successfulCategory, setSuccessfulCategory] = useState<InterventionCategory | "">("");
  const [successfulDetails, setSuccessfulDetails] = useState("");
  const [plannedCategory, setPlannedCategory] = useState<InterventionCategory | "">("");
  const [plannedDetails, setPlannedDetails] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [generalUpdate, setGeneralUpdate] = useState("");
  const [callsCount, setCallsCount] = useState(0);
  const [meetingsCount, setMeetingsCount] = useState(0);

  const handleAthleteSelect = useCallback(
    (name: string) => {
      setSelectedAthlete(name);
      const athlete = athletes.find((a) => a.name === name);
      if (athlete) {
        setSport(athlete.sport);
        setEvent(athlete.event);
        setCategory(athlete.category);
      }
    },
    [athletes]
  );

  const resetForm = () => {
    setSelectedAthlete("");
    setSport("");
    setEvent("");
    setCategory("Senior");
    setSelectedDate(todayISO());
    setSuccessfulCategory("");
    setSuccessfulDetails("");
    setPlannedCategory("");
    setPlannedDetails("");
    setCurrentLocation("");
    setGeneralUpdate("");
    setCallsCount(0);
    setMeetingsCount(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAthlete) {
      toast.error("Please select an athlete");
      return;
    }
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitForm({
        athleteName: selectedAthlete,
        sport,
        event,
        category,
        date: selectedDate,
        successfulCategory,
        successfulDetails,
        plannedCategory,
        plannedDetails,
        currentLocation,
        generalUpdate,
        callsCount,
        meetingsCount,
        timestamp: new Date().toISOString(),
      });

      if (result.success) {
        toast.success(result.message);
        resetForm();
        refreshSubmissions();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Submit Report</h1>
        <p className="text-sm text-[var(--foreground)]/50 mt-1">
          Log interventions and updates for the selected date.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Athlete Selection */}
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--yellow)] mb-4">
            Athlete Details
          </h2>
          <div className="space-y-4">
            <SearchableDropdown
              options={athletes.map((a) => a.name)}
              value={selectedAthlete}
              onChange={handleAthleteSelect}
              placeholder="Search athlete..."
              label="Athlete"
            />

            {selectedAthlete && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-1">
                    Sport
                  </span>
                  <span className="text-sm font-medium">{sport}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-1">
                    Event
                  </span>
                  <span className="text-sm font-medium">{event}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-1">
                    Junior/Senior
                  </span>
                  <span className="text-sm font-medium">{category}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Date Selection */}
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--yellow)] mb-4">
            Date
          </h2>
          <div>
            <label htmlFor="report-date" className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-2">
              Select Date
            </label>
            <input
              id="report-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] text-sm transition-all duration-200"
            />
          </div>
        </Card>

        {/* Successful Interventions */}
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wider text-green-500 mb-4">
            Successful Interventions
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="successful-category" className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-2">
                Sub-Category
              </label>
              <div className="relative">
                <select
                  id="successful-category"
                  value={successfulCategory}
                  onChange={(e) => setSuccessfulCategory(e.target.value as InterventionCategory | "")}
                  className="w-full px-4 py-3 pr-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] text-sm appearance-none cursor-pointer transition-all duration-200"
                >
                  <option value="">Select sub-category...</option>
                  {INTERVENTION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
            <div>
              <label htmlFor="successful-details" className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-2">
                Details
              </label>
              <textarea
                id="successful-details"
                value={successfulDetails}
                onChange={(e) => setSuccessfulDetails(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground)]/30 text-sm resize-none transition-all duration-200"
                placeholder="Describe successful interventions..."
              />
            </div>
          </div>
        </Card>

        {/* Planned Interventions */}
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--yellow)] mb-4">
            Planned Interventions
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="planned-category" className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-2">
                Sub-Category
              </label>
              <div className="relative">
                <select
                  id="planned-category"
                  value={plannedCategory}
                  onChange={(e) => setPlannedCategory(e.target.value as InterventionCategory | "")}
                  className="w-full px-4 py-3 pr-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] text-sm appearance-none cursor-pointer transition-all duration-200"
                >
                  <option value="">Select sub-category...</option>
                  {INTERVENTION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
            <div>
              <label htmlFor="planned-details" className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-2">
                Details
              </label>
              <textarea
                id="planned-details"
                value={plannedDetails}
                onChange={(e) => setPlannedDetails(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground)]/30 text-sm resize-none transition-all duration-200"
                placeholder="Describe planned interventions..."
              />
            </div>
          </div>
        </Card>

        {/* Location & Updates */}
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--yellow)] mb-4">
            Updates
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="current-location" className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-2">
                Current Location
              </label>
              <input
                id="current-location"
                type="text"
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground)]/30 text-sm transition-all duration-200"
                placeholder="e.g., National Camp, SAI Bangalore"
              />
            </div>
            <div>
              <label htmlFor="general-update" className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-2">
                General Update
              </label>
              <textarea
                id="general-update"
                value={generalUpdate}
                onChange={(e) => setGeneralUpdate(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground)]/30 text-sm resize-none transition-all duration-200"
                placeholder="Any general updates about the athlete..."
              />
            </div>
          </div>
        </Card>

        {/* Calls & Meetings */}
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--yellow)] mb-4">
            Communication
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="calls-count" className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-2">
                Calls Count
              </label>
              <input
                id="calls-count"
                type="number"
                min="0"
                value={callsCount}
                onChange={(e) => setCallsCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] text-sm transition-all duration-200"
              />
            </div>
            <div>
              <label htmlFor="meetings-count" className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-2">
                Meetings Count
              </label>
              <input
                id="meetings-count"
                type="number"
                min="0"
                value={meetingsCount}
                onChange={(e) => setMeetingsCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] text-sm transition-all duration-200"
              />
            </div>
          </div>
        </Card>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !selectedAthlete || !selectedDate}
          className="w-full py-4 px-6 bg-[var(--yellow)] hover:bg-[var(--yellow-dark)] text-black font-bold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting...
            </span>
          ) : (
            "Submit Report"
          )}
        </button>
      </form>
    </div>
  );
}
