// ============================================
// GOOGLE APPS SCRIPT - Athlete Monitoring System
// Deploy this as a Web App in Google Apps Script
// ============================================
//
// SETUP INSTRUCTIONS:
// 1. Create a new Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Paste this entire file into the script editor
// 4. Replace YOUR_SPREADSHEET_ID_HERE with your actual Spreadsheet ID
//    (found in the Google Sheet URL: docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit)
// 5. Click Deploy > New Deployment
// 6. Select "Web app" as type
// 7. Set "Execute as" to "Me"
// 8. Set "Who has access" to "Anyone" (or "Anyone with Google Account")
// 9. Click Deploy and copy the Web App URL
// 10. Add the URL to your .env.local as GOOGLE_SCRIPT_URL
//
// The script will auto-create "Athletes" and "Submissions" sheets on first use.
// ============================================

const SPREADSHEET_ID = "1DlSEwyAMabRgf65z_or-Hz2IJhvB3r3wUitaTuDTNNE";
const ATHLETES_SHEET = "Athletes";
const SUBMISSIONS_SHEET = "Submissions";
const USERS_SHEET = "Users";

// New column headers for Submissions
var NEW_HEADERS = [
  "Athlete Name", "Sport", "Event", "Junior/Senior",
  "Date",
  "Successful Category", "Successful Details",
  "Planned Category", "Planned Details",
  "Current Location", "General Update",
  "Calls Count", "Meetings Count", "Timestamp"
];

// ─── Helpers ────────────────────────────────

function getSheet(name) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === USERS_SHEET) {
      sheet.appendRow(["Name", "Email", "Registered At"]);
      sheet.getRange("1:1").setFontWeight("bold");
    } else if (name === ATHLETES_SHEET) {
      sheet.appendRow(["Athlete", "Sport", "Junior/Senior", "Gender", "Age", "Event", "Training base", "Physio", "SnC", "Psychologist", "Nutritionist", "TOPS Support"]);
      sheet.getRange("1:1").setFontWeight("bold");
    } else if (name === SUBMISSIONS_SHEET) {
      sheet.appendRow(NEW_HEADERS);
      sheet.getRange("1:1").setFontWeight("bold");
    }
  }
  return sheet;
}

// ─── Migrate Submissions Sheet ──────────────
// Converts old format (with Successful Interventions, Planned Interventions,
// Planned Period Start, Planned Period End) to new format (with Successful
// Category, Successful Details, Planned Category, Planned Details).
// Safe to run multiple times — skips if already migrated.

// Valid intervention category names for detecting new-format rows
var VALID_CATEGORIES = [
  "Physiotherapy", "Nutrition", "Strength & Conditioning", "Psychology",
  "Coaching Intervention", "Foreign Training", "Foreign Competition",
  "RPO Competition", "Medical Surgery", "Medical Intervention (PRP/TUE/Other)",
  "Ammunition Testing", "Equipment Procurement", "TOPS Support", "Sparring Partner"
];

function migrateSubmissionsSheet() {
  var sheet = getSheet(SUBMISSIONS_SHEET);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { message: "No data to migrate", rows: 0 };

  // Check each data row — if col 9 (Planned Category) looks like a date
  // or col 7 (Successful Category) is NOT a valid category and has long text,
  // it's an old-format row that needs fixing.
  var needsFix = false;
  var newData = [NEW_HEADERS];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;

    var col5 = String(row[5] || "");
    var col6 = String(row[6] || "");
    var col7 = String(row[7] || "");
    var col8 = String(row[8] || "");

    // Detect old-format row: col 7 contains a date string (from old Planned Period Start)
    // or col 5 has long text that's not a valid category
    var isOldRow = (col7.indexOf("GMT") !== -1) ||
                   (col5.length > 50 && VALID_CATEGORIES.indexOf(col5) === -1) ||
                   (col5 !== "" && col6 !== "" && col7.indexOf("2026") !== -1);

    if (isOldRow) {
      needsFix = true;
      newData.push([
        row[0], row[1], row[2], row[3], // Athlete, Sport, Event, Jr/Sr
        row[4],             // Date
        "",                 // Successful Category (none for old data)
        col5,               // Successful Details (was Successful Interventions)
        "",                 // Planned Category (none for old data)
        col6,               // Planned Details (was Planned Interventions)
        String(row[9] || ""),  // Current Location
        String(row[10] || ""), // General Update
        Number(row[11]) || 0,  // Calls Count
        Number(row[12]) || 0,  // Meetings Count
        String(row[13] || "")  // Timestamp
      ]);
    } else {
      // New-format row — keep as-is
      newData.push([
        row[0], row[1], row[2], row[3],
        row[4],
        col5, col6, col7, col8,
        String(row[9] || ""), String(row[10] || ""),
        Number(row[11]) || 0, Number(row[12]) || 0,
        String(row[13] || "")
      ]);
    }
  }

  if (!needsFix) {
    // Just ensure headers are correct
    sheet.getRange(1, 1, 1, 14).setValues([NEW_HEADERS]);
    sheet.getRange("1:1").setFontWeight("bold");
    return { message: "Already migrated", rows: newData.length - 1 };
  }

  // Clear and rewrite entire sheet
  sheet.clearContents();
  if (newData.length > 0) {
    sheet.getRange(1, 1, newData.length, 14).setValues(newData);
    sheet.getRange("1:1").setFontWeight("bold");
  }

  return { message: "Migration complete", rows: newData.length - 1 };
}

function setCorsHeaders(output) {
  return output;
}

// ─── GET Handler ────────────────────────────

function doGet(e) {
  var action = e.parameter.action;
  var result;

  try {
    if (action === "getAthletes") {
      result = getAthletes();
    } else if (action === "getSubmissions") {
      result = getSubmissions(e.parameter);
    } else if (action === "submit") {
      var submitData = JSON.parse(e.parameter.data);
      result = submitEntry(submitData);
    } else if (action === "uploadAthletes") {
      var athleteData = JSON.parse(e.parameter.data);
      result = uploadAthletes(athleteData);
    } else if (action === "removeAthlete") {
      var removeData = JSON.parse(e.parameter.data);
      result = removeAthlete(removeData);
    } else if (action === "appendAthletes") {
      var appendData = JSON.parse(e.parameter.data);
      result = appendAthletes(appendData);
    } else if (action === "loginUser") {
      result = loginUser(e.parameter.email);
    } else if (action === "registerUser") {
      var regData = JSON.parse(e.parameter.data);
      result = registerUser(regData);
    } else if (action === "migrate") {
      result = migrateSubmissionsSheet();
    } else if (action === "clearSubmissions") {
      result = clearSubmissions();
    } else {
      result = { error: "Unknown action: " + action };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── POST Handler ───────────────────────────

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var action = data.action;
  var result;

  try {
    if (action === "submit") {
      result = submitEntry(data.payload);
    } else if (action === "uploadAthletes") {
      result = uploadAthletes(data.payload);
    } else if (action === "removeAthlete") {
      result = removeAthlete(data.payload);
    } else {
      result = { error: "Unknown action: " + action };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Get Athletes ───────────────────────────

function getAthletes() {
  var sheet = getSheet(ATHLETES_SHEET);
  var data = sheet.getDataRange().getValues();
  var athletes = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      athletes.push({
        name: String(data[i][0]).trim(),
        sport: String(data[i][1]).trim(),
        category: String(data[i][2]).trim(),
        gender: String(data[i][3] || "").trim(),
        age: Number(data[i][4]) || 0,
        event: String(data[i][5] || "").trim(),
        trainingBase: String(data[i][6] || "").trim(),
        physio: String(data[i][7] || "").trim(),
        snc: String(data[i][8] || "").trim(),
        psychologist: String(data[i][9] || "").trim(),
        nutritionist: String(data[i][10] || "").trim(),
        topsSupport: String(data[i][11] || "").trim()
      });
    }
  }

  return athletes;
}

// ─── Get Submissions ────────────────────────

function getSubmissions(params) {
  // Auto-migrate if still on old format
  migrateSubmissionsSheet();

  var sheet = getSheet(SUBMISSIONS_SHEET);
  var data = sheet.getDataRange().getValues();
  var submissions = [];

  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;

    var submission = {
      athleteName: String(data[i][0]),
      sport: String(data[i][1]),
      event: String(data[i][2]),
      category: String(data[i][3]),
      date: String(data[i][4]),
      successfulCategory: String(data[i][5] || ""),
      successfulDetails: String(data[i][6] || ""),
      plannedCategory: String(data[i][7] || ""),
      plannedDetails: String(data[i][8] || ""),
      currentLocation: String(data[i][9] || ""),
      generalUpdate: String(data[i][10] || ""),
      callsCount: Number(data[i][11]) || 0,
      meetingsCount: Number(data[i][12]) || 0,
      timestamp: String(data[i][13] || "")
    };

    // Filter by athlete name if provided
    if (params.athleteName && submission.athleteName !== params.athleteName) continue;
    // Filter by date if provided
    if (params.date && submission.date !== params.date) continue;

    submissions.push(submission);
  }

  return submissions;
}

// ─── Submit Entry ───────────────────────────

function submitEntry(payload) {
  // Auto-migrate if still on old format
  migrateSubmissionsSheet();

  var sheet = getSheet(SUBMISSIONS_SHEET);

  // No duplicate check — multiple submissions per athlete per period allowed
  sheet.appendRow([
    payload.athleteName,
    payload.sport,
    payload.event || "",
    payload.category || "",
    payload.date,
    payload.successfulCategory || "",
    payload.successfulDetails || "",
    payload.plannedCategory || "",
    payload.plannedDetails || "",
    payload.currentLocation || "",
    payload.generalUpdate || "",
    payload.callsCount || 0,
    payload.meetingsCount || 0,
    new Date().toISOString()
  ]);

  return {
    success: true,
    message: "Submission saved successfully."
  };
}

// ─── Upload Athletes (Replace All) ─────────

function uploadAthletes(athletes) {
  var sheet = getSheet(ATHLETES_SHEET);

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  if (athletes.length > 0) {
    var rows = athletes.map(function(a) {
      return [a.name, a.sport, a.category, a.gender || "", a.age || 0, a.event || "", a.trainingBase || "", a.physio || "", a.snc || "", a.psychologist || "", a.nutritionist || "", a.topsSupport || ""];
    });
    sheet.getRange(2, 1, rows.length, 12).setValues(rows);
  }

  return {
    success: true,
    message: athletes.length + " athletes uploaded successfully.",
    count: athletes.length
  };
}

// ─── Append Athletes (for chunked uploads) ──

function appendAthletes(athletes) {
  var sheet = getSheet(ATHLETES_SHEET);

  if (athletes.length > 0) {
    var rows = athletes.map(function(a) {
      return [a.name, a.sport, a.category, a.gender || "", a.age || 0, a.event || "", a.trainingBase || "", a.physio || "", a.snc || "", a.psychologist || "", a.nutritionist || "", a.topsSupport || ""];
    });
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, rows.length, 12).setValues(rows);
  }

  return {
    success: true,
    message: athletes.length + " athletes appended.",
    count: athletes.length
  };
}

// ─── Remove Single Athlete ──────────────────

function removeAthlete(payload) {
  var sheet = getSheet(ATHLETES_SHEET);
  var data = sheet.getDataRange().getValues();

  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === payload.athleteName) {
      sheet.deleteRow(i + 1);
      return {
        success: true,
        message: payload.athleteName + " removed successfully."
      };
    }
  }

  return {
    success: false,
    message: "Athlete not found."
  };
}

// ─── Login User (check if email exists) ─────

function loginUser(email) {
  var sheet = getSheet(USERS_SHEET);
  var data = sheet.getDataRange().getValues();
  var emailLower = email.toLowerCase().trim();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() === emailLower) {
      return {
        success: true,
        user: {
          name: String(data[i][0]).trim(),
          email: String(data[i][1]).toLowerCase().trim()
        }
      };
    }
  }

  return { success: false, message: "Email not registered. Please sign up." };
}

// ─── Register User ──────────────────────────

function registerUser(payload) {
  var sheet = getSheet(USERS_SHEET);
  var data = sheet.getDataRange().getValues();
  var emailLower = payload.email.toLowerCase().trim();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() === emailLower) {
      return {
        success: false,
        message: "This email is already registered. Please log in."
      };
    }
  }

  sheet.appendRow([
    payload.name.trim(),
    emailLower,
    new Date().toISOString()
  ]);

  return {
    success: true,
    user: {
      name: payload.name.trim(),
      email: emailLower
    },
    message: "Registration successful."
  };
}

// ─── Clear All Submissions ──────────────────

function clearSubmissions() {
  var sheet = getSheet(SUBMISSIONS_SHEET);
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return { success: true, message: "All submissions cleared." };
}

// ─── Test Function (run from Script Editor) ─

function testSetup() {
  var athletes = getAthletes();
  Logger.log("Athletes count: " + athletes.length);
  Logger.log(JSON.stringify(athletes.slice(0, 3)));

  var submissions = getSubmissions({});
  Logger.log("Submissions count: " + submissions.length);
}
