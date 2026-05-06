import { Athlete, Submission } from "./types";

const API_BASE = "/api";

export async function fetchAthletes(): Promise<Athlete[]> {
  const res = await fetch(`${API_BASE}/athletes`);
  if (!res.ok) throw new Error("Failed to fetch athletes");
  return res.json();
}

export async function fetchSubmissions(filters?: {
  athleteName?: string;
  date?: string;
}): Promise<Submission[]> {
  const params = new URLSearchParams();
  if (filters?.athleteName) params.set("athleteName", filters.athleteName);
  if (filters?.date) params.set("date", filters.date);

  const url = `${API_BASE}/submissions${params.toString() ? "?" + params.toString() : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch submissions");
  return res.json();
}

export async function submitForm(
  data: Submission
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Submission failed" }));
    return { success: false, message: err.message || "Submission failed" };
  }
  return res.json();
}

export async function uploadAthletes(
  athletes: Athlete[]
): Promise<{ success: boolean; message: string; count: number }> {
  const res = await fetch(`${API_BASE}/athletes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ athletes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Upload failed" }));
    return { success: false, message: err.message || "Upload failed", count: 0 };
  }
  return res.json();
}

export async function removeAthlete(
  athleteName: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/athletes`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ athleteName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Remove failed" }));
    return { success: false, message: err.message || "Remove failed" };
  }
  return res.json();
}
