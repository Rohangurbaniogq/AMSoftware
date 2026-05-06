import { NextRequest } from "next/server";
import { gasWrite } from "@/lib/gas-fetch";

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

// In-memory fallback for development
let mockAthletes = [
  { name: "Neeraj Chopra", sport: "Athletics", category: "Senior" as const, gender: "Male", age: 28, event: "Javelin Throw", trainingBase: "Patiala", physio: "", snc: "", psychologist: "", nutritionist: "", topsSupport: "" },
  { name: "PV Sindhu", sport: "Badminton", category: "Senior" as const, gender: "Female", age: 30, event: "Women's Singles", trainingBase: "Hyderabad", physio: "", snc: "", psychologist: "", nutritionist: "", topsSupport: "" },
  { name: "Mirabai Chanu", sport: "Weightlifting", category: "Senior" as const, gender: "Female", age: 31, event: "49kg", trainingBase: "Patiala", physio: "", snc: "", psychologist: "", nutritionist: "", topsSupport: "" },
  { name: "Lovlina Borgohain", sport: "Boxing", category: "Senior" as const, gender: "Female", age: 28, event: "Women's 75kg", trainingBase: "Patiala", physio: "", snc: "", psychologist: "", nutritionist: "", topsSupport: "" },
  { name: "Nikhat Zareen", sport: "Boxing", category: "Senior" as const, gender: "Female", age: 29, event: "Women's 50kg", trainingBase: "Hyderabad", physio: "", snc: "", psychologist: "", nutritionist: "", topsSupport: "" },
  { name: "Lakshya Sen", sport: "Badminton", category: "Senior" as const, gender: "Male", age: 24, event: "Men's Singles", trainingBase: "Bangalore", physio: "", snc: "", psychologist: "", nutritionist: "", topsSupport: "" },
  { name: "Antim Panghal", sport: "Wrestling", category: "Junior" as const, gender: "Female", age: 21, event: "Women's 53kg", trainingBase: "Hisar", physio: "", snc: "", psychologist: "", nutritionist: "", topsSupport: "" },
  { name: "Saurabh Chaudhary", sport: "Shooting", category: "Senior" as const, gender: "Male", age: 23, event: "10m Air Pistol", trainingBase: "Delhi", physio: "", snc: "", psychologist: "", nutritionist: "", topsSupport: "" },
  { name: "Manu Bhaker", sport: "Shooting", category: "Senior" as const, gender: "Female", age: 23, event: "25m Pistol", trainingBase: "Delhi", physio: "", snc: "", psychologist: "", nutritionist: "", topsSupport: "" },
  { name: "Sharath Kamal", sport: "Table Tennis", category: "Senior" as const, gender: "Male", age: 43, event: "Men's Singles", trainingBase: "Chennai", physio: "", snc: "", psychologist: "", nutritionist: "", topsSupport: "" },
];

export async function GET() {
  if (SCRIPT_URL) {
    try {
      const res = await fetch(`${SCRIPT_URL}?action=getAthletes`, { redirect: "follow", next: { revalidate: 60 } });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        return new Response(JSON.stringify(json), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        });
      } catch {
        return Response.json({ error: "Invalid response" }, { status: 500 });
      }
    } catch {
      return Response.json({ error: "Failed to fetch athletes" }, { status: 500 });
    }
  }
  return Response.json(mockAthletes);
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }
  const { athletes } = body;

  if (!athletes || !Array.isArray(athletes)) {
    return Response.json({ success: false, message: "Invalid data" }, { status: 400 });
  }

  if (SCRIPT_URL) {
    try {
      const data = await gasWrite(SCRIPT_URL, "uploadAthletes", athletes);
      return Response.json(data);
    } catch (error) {
      return Response.json({ success: false, message: String(error) }, { status: 500 });
    }
  }

  mockAthletes = athletes;
  return Response.json({ success: true, message: `${athletes.length} athletes uploaded.`, count: athletes.length });
}

export async function DELETE(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }
  const { athleteName } = body;

  if (!athleteName) {
    return Response.json({ success: false, message: "Missing athlete name" }, { status: 400 });
  }

  if (SCRIPT_URL) {
    try {
      const data = await gasWrite(SCRIPT_URL, "removeAthlete", { athleteName });
      return Response.json(data);
    } catch (error) {
      return Response.json({ success: false, message: String(error) }, { status: 500 });
    }
  }

  const before = mockAthletes.length;
  mockAthletes = mockAthletes.filter((a) => a.name !== athleteName);
  if (mockAthletes.length === before) {
    return Response.json({ success: false, message: "Athlete not found" }, { status: 404 });
  }
  return Response.json({ success: true, message: `${athleteName} removed.` });
}
