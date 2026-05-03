const { google } = require("googleapis");

// ==============================
// 🔐 AUTH
// ==============================
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined,
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// ==============================
// 🚀 MAIN FUNCTION
// ==============================
async function addToSheets({ summary, fullData }) {
  console.log("📡 addToSheets FUNCTION TRIGGERED");

  try {
    if (!SPREADSHEET_ID) {
      console.error("❌ GOOGLE_SHEET_ID missing");
      return;
    }

    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error("❌ GOOGLE ENV VARIABLES MISSING");
      return;
    }

    const client = await auth.getClient();

    console.log("🔐 Google Auth Successful");

    const sheets = google.sheets({
      version: "v4",
      auth: client,
    });

    // ======================
    // 📄 SUMMARY SHEET
    // ======================
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Summary!A:H",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [summary],
      },
    });

    console.log("📊 Summary sheet updated");

    // ======================
    // 📄 FULL DATA SHEET
    // ======================
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "FullData!A:B",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [fullData],
      },
    });

    console.log("📦 FullData sheet updated");

    console.log("✅ ALL GOOGLE SHEETS OPERATIONS SUCCESSFUL");

  } catch (err) {
    console.error("❌ GOOGLE SHEETS FULL ERROR:");
    console.error(err);
  }
}

module.exports = { addToSheets };