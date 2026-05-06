import { NextRequest } from "next/server";
import { gasWrite } from "@/lib/gas-fetch";

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
const ACCESS_CODE = "456789";

// In-memory fallback for development
const mockUsers: { name: string; email: string }[] = [];

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  const { action, name, email, code } = body;

  // Validate email domain
  if (!email || !email.toLowerCase().trim().endsWith("@ogq.org")) {
    return Response.json({ success: false, message: "Only @ogq.org email addresses are allowed" }, { status: 400 });
  }

  // Validate access code
  if (code !== ACCESS_CODE) {
    return Response.json({ success: false, message: "Invalid access code" }, { status: 400 });
  }

  const emailLower = email.toLowerCase().trim();

  if (action === "login") {
    // Check if user exists
    if (SCRIPT_URL) {
      try {
        const res = await fetch(`${SCRIPT_URL}?action=loginUser&email=${encodeURIComponent(emailLower)}`, { redirect: "follow" });
        const text = await res.text();
        try {
          return Response.json(JSON.parse(text));
        } catch {
          return Response.json({ success: false, message: "Server error" }, { status: 500 });
        }
      } catch {
        return Response.json({ success: false, message: "Failed to connect" }, { status: 500 });
      }
    }

    // Mock fallback
    const user = mockUsers.find((u) => u.email === emailLower);
    if (user) {
      return Response.json({ success: true, user });
    }
    return Response.json({ success: false, message: "Email not registered. Please sign up." });
  }

  if (action === "register") {
    if (!name || !name.trim()) {
      return Response.json({ success: false, message: "Name is required" }, { status: 400 });
    }

    if (SCRIPT_URL) {
      try {
        const data = await gasWrite(SCRIPT_URL, "registerUser", { name: name.trim(), email: emailLower });
        return Response.json(data);
      } catch (error) {
        return Response.json({ success: false, message: String(error) }, { status: 500 });
      }
    }

    // Mock fallback
    const exists = mockUsers.find((u) => u.email === emailLower);
    if (exists) {
      return Response.json({ success: false, message: "This email is already registered. Please log in." });
    }
    const newUser = { name: name.trim(), email: emailLower };
    mockUsers.push(newUser);
    return Response.json({ success: true, user: newUser, message: "Registration successful." });
  }

  return Response.json({ success: false, message: "Invalid action" }, { status: 400 });
}
