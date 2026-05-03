const { google } = require("googleapis");

// ==============================
// 🔐 AUTH (FIXED)
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
  try {
    if (!SPREADSHEET_ID) {
      console.error("❌ GOOGLE_SHEET_ID missing");
      return;
    }

    const client = await auth.getClient();

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

    console.log("✅ Data sent to Google Sheets");

  } catch (err) {
    console.error("❌ GOOGLE SHEETS FULL ERROR:", err);
  }
}

module.exports = { addToSheets };