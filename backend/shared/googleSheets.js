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

  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
  ],
});

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEET_ID;

// ==============================
// 🚀 ADD TO SHEETS
// ==============================
async function addToSheets({
  summary,
  fullData,
}) {

  console.log("📡 GOOGLE SHEETS START");

  try {

    // ==========================
    // 🔥 ENV CHECK
    // ==========================
    if (!SPREADSHEET_ID) {
      throw new Error(
        "GOOGLE_SHEET_ID missing"
      );
    }

    if (
      !process.env.GOOGLE_CLIENT_EMAIL
    ) {
      throw new Error(
        "GOOGLE_CLIENT_EMAIL missing"
      );
    }

    if (
      !process.env.GOOGLE_PRIVATE_KEY
    ) {
      throw new Error(
        "GOOGLE_PRIVATE_KEY missing"
      );
    }

    // ==========================
    // 🔐 AUTH
    // ==========================
    const client =
      await auth.getClient();

    console.log(
      "✅ GOOGLE AUTH SUCCESS"
    );

    const sheets = google.sheets({
      version: "v4",
      auth: client,
    });

    // ==========================
    // 📊 SUMMARY SHEET
    // ==========================
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,

      range: "Summary!A:G",

      valueInputOption: "USER_ENTERED",

      requestBody: {
        values: [summary],
      },
    });

    console.log(
      "✅ SUMMARY SHEET UPDATED"
    );

    // ==========================
    // 📦 FULL DATA SHEET
    // ==========================
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,

      range: "FullData!A:F",

      valueInputOption: "USER_ENTERED",

      requestBody: {
        values: [fullData],
      },
    });

    console.log(
      "✅ FULLDATA SHEET UPDATED"
    );

    console.log(
      "🎉 GOOGLE SHEETS SUCCESS"
    );

  } catch (err) {

    console.error(
      "❌ GOOGLE SHEETS ERROR:"
    );

    console.error(err.message);

    if (err.response?.data) {
      console.error(
        JSON.stringify(
          err.response.data,
          null,
          2
        )
      );
    }
  }
}

module.exports = {
  addToSheets,
};