const express = require("express");
const router = express.Router();
const pdf = require("html-pdf-node");
const QRCode = require("qrcode");

// ==============================
// 🔢 GENERATOR
// ==============================
const generateTrackingId = () => {
  return "TRK-" + Math.random().toString(36).substring(2, 10).toUpperCase();
};

const formatImage = (photo) => {
  if (!photo) return "";

  // already correct
  if (photo.startsWith("data:image")) {
    return photo;
  }

  // convert raw base64 → proper format
  return `data:image/png;base64,${photo}`;
};

// ==============================
// 🚀 MAIN ROUTE
// ==============================
router.post("/generate-nin-slip", async (req, res) => {
  try {
    const { data, type } = req.body;

    if (!data) {
      return res.status(400).json({ message: "No data provided" });
    }

    const trackingId = generateTrackingId();

    let html = "";

    // ✅ FIXED (IMPORTANT)
    if (type === "data") {
      html = generateDataHTML({ ...data, trackingId });
    } 
    else if (type === "premium") {
      html = await generatePremiumSlipHTML({ ...data, trackingId });
    } 
    else if (type === "long") {
      html = generateLongHTML({ ...data, trackingId });
    } 
    else {
      return res.status(400).json({ message: "Invalid slip type" });
    }

    if (!html || html.length < 50) {
      return res.status(500).json({ message: "HTML generation failed" });
    }

    const file = { content: html };

    const options = {
      format: "A4",
      printBackground: true,
    };

    const pdfBuffer = await pdf.generatePdf(file, options);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${type}-slip.pdf`,
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error("🔥 PDF ERROR:", error);
    res.status(500).json({ message: "Slip generation failed" });
  }
});


// =======================================================
// 🟡 DATA SLIP (CLEAN + ALIGNED)
// =======================================================
function generateDataHTML(data) {
  const formattedNIN = (data.nin || "")
    .replace(/(\d{4})(\d{3})(\d{4})/, "$1   $2   $3");

  return `
  <html>
  <body style="font-family: Arial; margin:0; background:#efefef;">

  <div style="padding:25px 40px;">

    <div style="display:flex; justify-content:space-between; align-items:center;">
      <img src="https://xcombinator.com.ng/assets/coat.png" width="55"/>
      
      <div style="text-align:center;">
        <div style="font-size:22px; color:#666;">Federal Republic of Nigeria</div>
        <div style="font-size:22px; font-weight:bold;">Verified NIN Details</div>
      </div>

      <img src="https://xcombinator.com.ng/assets/nimc-logo.png" width="70"/>
    </div>

    <div style="display:flex; margin-top:20px;">

      <div style="width:40%; font-size:15px; line-height:2;">
        <div><b>First Name:</b> ${data.firstname}</div>
        <div><b>Middle Name:</b> ${data.middlename}</div>
        <div><b>Last Name:</b> ${data.surname}</div>
        <div><b>Date of Birth:</b> ${data.birthdate}</div>
        <div><b>Gender:</b> ${data.gender}</div>
      </div>

      <div style="width:25%; text-align:center;">
        <img src="${formatImage(data.photo)}" style="width:120px;height:140px;object-fit:cover"/>
        ${data.signature ? `<img src="${data.signature}" style="width:100px;margin-top:5px"/>` : ""}
      </div>

      <div style="width:35%; font-size:13px;">
        <div style="color:green;font-size:22px;font-weight:bold;">Verified</div>

        <div style="margin-top:5px;">
          This is a property of NIMC Nigeria. If found, return to nearest office.
        </div>

        <ul>
          <li>Property of Nigeria</li>
          <li>Does not confer citizenship</li>
          <li><span style="color:red;">DOES NOT EXPIRE</span></li>
        </ul>
      </div>

    </div>

    <div style="margin-top:15px;font-size:18px;">
      <b>NIN NUMBER:</b> ${formattedNIN}
    </div>

  </div>

  </body>
  </html>
  `;
}


// =======================================================
// 🟢 PREMIUM SLIP (FIXED + SPLIT FRONT/BACK)
// =======================================================
async function generatePremiumSlipHTML(data) {
  const QRCode = require("qrcode");

  const qr = await QRCode.toDataURL(
    JSON.stringify({
      nin: data.nin,
      name: `${data.firstname} ${data.surname}`,
    })
  );

  const formattedNIN = (data.nin || "")
    .replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3");

  const issueDate = new Date().toLocaleDateString("en-GB");

  return `
  <html>
  <head>
    <style>
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
      }

      .page {
        width: 9.1cm;
        margin: auto;
      }

      .card {
        width: 9.1cm;
        height: 5.4cm;
        position: relative;
        overflow: hidden;
      }

      .front {
        background: url('https://xcombinator.com.ng/assets/premium-bg.png') no-repeat center/cover;
      }

      .back {
        border: 1px solid #000;
        transform: rotate(180deg);
        padding: 12px;
        box-sizing: border-box;
      }

      .label {
        font-size: 7px;
        color: #555;
        letter-spacing: 0.5px;
      }

      .value {
        font-size: 10px;
        font-weight: bold;
        letter-spacing: 1px;
      }

      .nin-label {
        font-size: 8px;
        letter-spacing: 0.5px;
      }

      .nin-main {
        font-size: 16px;
        font-weight: bold;
        letter-spacing: 3px;
        color: #444;
      }

    </style>
  </head>

  <body>

  <div class="page">

    <!-- ================= FRONT ================= -->
    <div class="card front">

      <!-- HEADER -->
      <div style="
        position:absolute;
        top:6px;
        left:12px;
        font-size:13px;
        font-weight:bold;
        color:#0a8f2f;
        letter-spacing:1px;
      ">
        FEDERAL REPUBLIC OF NIGERIA
      </div>

      <div style="
        position:absolute;
        top:24px;
        left:12px;
        font-size:11px;
        font-weight:bold;
        letter-spacing:1px;
      ">
        DIGITAL NIN SLIP
      </div>

      <!-- PASSPORT (BIGGER) -->
      <img src="${formatImage(data.photo)}" style="
        position:absolute;
        left:12px;
        top:38px;
        width:70px;
        height:80px;
        object-fit:cover;
      "/>

      <!-- QR (BIGGER) -->
      <img src="${qr}" style="
        position:absolute;
        right:10px;
        top:10px;
        width:80px;
      "/>

      <!-- SURNAME -->
      <div style="position:absolute; left:90px; top:40px;">
        <div style="font-size:9px; color:#555;">SURNAME/NOM</div>
        <div style="font-size:12px; font-weight:bold; letter-spacing:1px;">
          ${data.surname || ""}
        </div>
      </div>

      <!-- GIVEN NAMES -->
      <div style="position:absolute; left:90px; top:70px;">
        <div style="font-size:9px; color:#555;">GIVEN NAMES/PRENOMS</div>
        <div style="font-size:12px; font-weight:bold; letter-spacing:1px;">
          ${data.firstname || ""}, ${data.middlename || ""}
        </div>
      </div>

      <!-- DOB -->
      <div style="position:absolute; left:90px; top:100px;">
        <div style="font-size:9px; color:#555;">DATE OF BIRTH</div>
        <div style="font-size:12px; font-weight:bold;">
          ${data.birthdate || ""}
        </div>
      </div>

      <!-- SEX -->
      <div style="position:absolute; left:180px; top:100px;">
        <div style="font-size:9px; color:#555;">SEX/SEXE</div>
        <div style="font-size:12px; font-weight:bold;">
          ${data.gender || ""}
        </div>
      </div>

      <!-- NGA -->
      <div style="
        position:absolute;
        right:35px;
        top:100px;
        font-size:16px;
        font-weight:bold;
      ">
        NGA
      </div>

      <!-- ISSUE DATE -->
      <div style="
        position:absolute;
        right:15px;
        top:120px;
        font-size:8px;
      ">
        ISSUE DATE
      </div>

      <div style="
        position:absolute;
        right:15px;
        top:132px;
        font-size:11px;
        font-weight:bold;
        letter-spacing:1px;
      ">
        ${issueDate}
      </div>

      <!-- NIN LABEL -->
      <div style="
        position:absolute;
        bottom:50px;
        left:60px;
        font-size:12px;
      ">
        National Identification Number (NIN)
      </div>

      <!-- MAIN NIN (BIGGER + CLEAR) -->
      <div style="
        position:absolute;
        bottom:24px;
        left:65px;
        font-size:20px;
        font-weight:bold;
        letter-spacing:4px;
        color:#444;
      ">
        ${formattedNIN}
      </div>

      <!-- WATERMARK NIN -->
      <div style="position:absolute; left:10px; top:120px; font-size:8px; transform:rotate(-28deg); opacity:0.5;">
        ${data.nin}
      </div>

      <div style="position:absolute; left:10px; bottom:20px; font-size:8px; transform:rotate(28deg); opacity:0.5;">
        ${data.nin}
      </div>

      <div style="position:absolute; right:10px; top:90px; font-size:8px; transform:rotate(180deg); opacity:0.5;">
        ${data.nin}
      </div>

      <div style="position:absolute; right:10px; bottom:20px; font-size:8px; transform:rotate(-28deg); opacity:0.5;">
        ${data.nin}
      </div>

    </div>

    <!-- ================= BACK ================= -->
    <div class="card back">

      <div style="text-align:center;">

        <div style="font-size:16px; font-weight:bold;">
          DISCLAIMER
        </div>

        <div style="font-size:10px; margin-top:5px;">
          Trust, but verify
        </div>

        <div style="font-size:9px; margin-top:12px; line-height:1.5;">
          Kindly ensure each time this ID is presented, that you verify the 
          credentials using a Government-approved verification resource.
          The details on the front of this NIN slip must EXACTLY match 
          the verification result.
        </div>

        <div style="font-size:13px; font-weight:bold; margin-top:14px;">
          CAUTION!
        </div>

        <div style="font-size:9px; margin-top:10px; line-height:1.5;">
          If this NIN was not issued to the person presenting it, please DO NOT 
          attempt to scan, photocopy or replicate personal data contained herein.
          You are only permitted to scan the barcode for identity verification.
        </div>

      </div>

    </div>

  </div>

  </body>
  </html>
  `;
}

// =======================================================
// 🔵 LONG SLIP (FIXED)
// =======================================================
function generateLongHTML(data) {
  return `
  <html>
  <body style="
    font-family: Arial, Helvetica, sans-serif;
    margin:0;
    background:#fff;
  ">

  <div style="
    width:100%;
    height:11.4cm;
    border:2px solid #000;
    padding:10px;
    box-sizing:border-box;
  ">

    <!-- ================= HEADER ================= -->
    <div style="
      display:flex;
      align-items:center;
      justify-content:space-between;
      border-bottom:2px solid #000;
      padding-bottom:6px;
    ">

      <img src="https://xcombinator.com.ng/assets/coat.png" style="width:55px"/>

      <div style="text-align:center;">
        <div style="font-size:20px; font-weight:700;">
          National Identity Management System
        </div>
        <div style="font-size:14px;">
          Federal Republic of Nigeria
        </div>
        <div style="font-size:13px;">
          National Identification Number Slip (NINS)
        </div>
      </div>

      <img src="https://xcombinator.com.ng/assets/nimc-logo.png" style="width:75px"/>
    </div>

    <!-- ================= MAIN GRID ================= -->
    <table style="
      width:100%;
      border-collapse:collapse;
      margin-top:8px;
      font-size:11px;
    ">

      <!-- ROW 1 -->
      <tr>
        <td style="border:2px solid #000; padding:8px; width:25%; vertical-align:top;">
          <b>Tracking ID:</b> ${data.trackingId}
        </td>

        <td style="border:2px solid #000; padding:8px; width:25%; vertical-align:top;">
          <b>Surname:</b> ${data.surname}
        </td>

        <!-- ADDRESS (FIXED ALIGNMENT) -->
        <td style="
          border:2px solid #000;
          padding:8px;
          width:33%;
          vertical-align:top;
        " rowspan="4">

          <div style="line-height:1.4;">
            <b>Address:</b>

            <div>${data.residence_address || ""}</div>
            <div>${data.lga || ""}</div>
            <div>${data.residence_state || ""}</div>
          </div>

        </td>

        <!-- PHOTO (FIXED RENDER + FIT) -->
        <td style="
          border:2px solid #000;
          width:17%;
          vertical-align:top;
          " rowspan="4">

          <div style="
            width:100%;
            height:160px;
            display:flex;
            align-items:center;
            justify-content:center;
            overflow:hidden;
            background:#fff;
            ">
            <img src="${formatImage(data.photo)}" style="
              max-width:100%;
              max-height:100%;
              object-fit:contain;
            "/>
          </div>

        </td>
      </tr>

      <!-- ROW 2 -->
      <tr>
        <td style="border:2px solid #000; padding:8px; vertical-align:top;">
          <b>NIN:</b> ${data.nin}
        </td>

        <td style="border:2px solid #000; padding:8px; vertical-align:top;">
          <b>First Name:</b> ${data.firstname}
        </td>
      </tr>

      <!-- ROW 3 -->
      <tr>
        <td style="border:2px solid #000;" rowspan="2"></td>

        <td style="border:2px solid #000; padding:8px; vertical-align:top;">
          <b>Middle Name:</b> ${data.middlename}
        </td>
      </tr>

      <!-- ROW 4 -->
      <tr>
        <td style="border:2px solid #000; padding:8px; vertical-align:top;">
          <b>Gender:</b> ${data.gender}
        </td>
      </tr>

    </table>

    <!-- ================= NOTE ================= -->
    <div style="
      border:2px solid #000;
      margin-top:8px;
      padding:8px;
      font-size:11px;
    ">
      <b>Note:</b>
      The <b><i>National Identification Number (NIN)</i></b> is your identity.
      It is confidential and may only be released for legitimate transactions.
      <br/><br/>
      You will be notified when your National Identity Card is ready
      (for any enquiries please contact)
    </div>

    <!-- ================= FOOTER ================= -->
    <table style="
      width:100%;
      border-collapse:collapse;
      margin-top:8px;
      font-size:11px;
    ">

      <tr>

        <td style="border:2px solid #000; text-align:center; padding:8px;">
          <img src="https://xcombinator.com.ng/assets/icon-email.png" width="22"/><br/>
          helpdesk@nimc.gov.ng
        </td>

        <td style="border:2px solid #000; text-align:center; padding:8px;">
          <img src="https://xcombinator.com.ng/assets/icon-web.png" width="22"/><br/>
          www.nimc.gov.ng
        </td>

        <td style="border:2px solid #000; text-align:center; padding:8px;">
          <img src="https://xcombinator.com.ng/assets/icon-phone.png" width="22"/><br/>
          0700-CALL NIMC<br/>
          (0700-2255-6462)
        </td>

        <td style="border:2px solid #000; text-align:center; padding:8px;">
          <img src="https://xcombinator.com.ng/assets/icon-location.png" width="22"/><br/>
          National Identity Management Commission<br/>
          11, Sokode Crescent,<br/>
          Zone 5 Wuse, Abuja Nigeria
        </td>

      </tr>

    </table>

  </div>

  </body>
  </html>
  `;
}

module.exports = router;