"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { Athlete, Submission } from "@/lib/types";
import { fetchAthletes, fetchSubmissions } from "@/lib/sheets";

interface DataContextType {
  athletes: Athlete[];
  submissions: Submission[];
  loading: boolean;
  refreshAthletes: () => Promise<void>;
  refreshSubmissions: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({
  athletes: [],
  submissions: [],
  loading: true,
  refreshAthletes: async () => {},
  refreshSubmissions: async () => {},
});

const ATHLETES_CACHE_KEY = "ogq_athletes_cache";
const SUBMISSIONS_CACHE_KEY = "ogq_submissions_cache";
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function readCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return data as T;
  } catch { /* ignore */ }
  return null;
}

function writeCache(key: string, data: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* ignore */ }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [athletes, setAthletes] = useState<Athlete[]>(() => readCache<Athlete[]>(ATHLETES_CACHE_KEY) || []);
  const [submissions, setSubmissions] = useState<Submission[]>(() => readCache<Submission[]>(SUBMISSIONS_CACHE_KEY) || []);
  const [loading, setLoading] = useState(() => {
    // If we have cached data, skip the loading state entirely
    return !readCache<Athlete[]>(ATHLETES_CACHE_KEY);
  });
  const fetched = useRef(false);

  const refreshAthletes = useCallback(async () => {
    try {
      const data = await fetchAthletes();
      setAthletes(data);
      writeCache(ATHLETES_CACHE_KEY, data);
    } catch {
      // silent
    }
  }, []);

  const refreshSubmissions = useCallback(async () => {
    try {
      const data = await fetchSubmissions();
      setSubmissions(data);
      writeCache(SUBMISSIONS_CACHE_KEY, data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    // Fetch both in parallel, resolve loading when done
    Promise.all([refreshAthletes(), refreshSubmissions()]).finally(() =>
      setLoading(false)
    );
  }, [refreshAthletes, refreshSubmissions]);

  return (
    <DataContext.Provider value={{ athletes, submissions, loading, refreshAthletes, refreshSubmissions }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
