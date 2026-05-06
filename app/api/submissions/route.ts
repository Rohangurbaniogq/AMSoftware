import { NextRequest } from "next/server";
import { Submission } from "@/lib/types";
import { gasWrite } from "@/lib/gas-fetch";

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

const mockSubmissions: Submission[] = [];

function normalizeDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const athleteName = searchParams.get("athleteName") || "";
  const date = searchParams.get("date") || "";

  if (SCRIPT_URL) {
    try {
      const params = new URLSearchParams({ action: "getSubmissions" });
      if (athleteName) params.set("athleteName", athleteName);
      if (date) params.set("date", date);

      const res = await fetch(`${SCRIPT_URL}?${params.toString()}`, { redirect: "follow", next: { revalidate: 30 } });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data) && date) {
          const normalizedFilter = normalizeDate(date);
          return Response.json(
            data.filter((s: Submission) => normalizeDate(s.date) === normalizedFilter)
          );
        }
        return Response.json(data);
      } catch {
        return Response.json({ error: "Invalid response" }, { status: 500 });
      }
    } catch {
      return Response.json({ error: "Failed to fetch submissions" }, { status: 500 });
    }
  }

  let results = [...mockSubmissions];
  if (athleteName) results = results.filter((s) => s.athleteName === athleteName);
  if (date) {
    const normalizedFilter = normalizeDate(date);
    results = results.filter((s) => normalizeDate(s.date) === normalizedFilter);
  }
  return Response.json(results);
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  if (!body.athleteName || !body.date) {
    return Response.json({ success: false, message: "Missing required fields" }, { status: 400 });
  }

  // Validate non-negative counts
  if (typeof body.callsCount === "number" && body.callsCount < 0) {
    return Response.json({ success: false, message: "Calls count cannot be negative" }, { status: 400 });
  }
  if (typeof body.meetingsCount === "number" && body.meetingsCount < 0) {
    return Response.json({ success: false, message: "Meetings count cannot be negative" }, { status: 400 });
  }

  if (SCRIPT_URL) {
    try {
      const data = await gasWrite(SCRIPT_URL, "submit", body);
      return Response.json(data);
    } catch (error) {
      return Response.json({ success: false, message: String(error) }, { status: 500 });
    }
  }

  // No duplicate check — multiple submissions per athlete per period are allowed
  mockSubmissions.push({ ...body, timestamp: new Date().toISOString() });
  return Response.json({ success: true, message: "Submission saved successfully." });
}
