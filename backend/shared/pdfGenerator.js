const puppeteer = require("puppeteer");

async function generateNINSlip(data) {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const photo = data.photo?.startsWith("data:")
    ? data.photo
    : `data:image/jpeg;base64,${data.photo}`;

  const html = `
  <html>
    <body style="font-family: Arial; padding: 30px;">
      
      <h2 style="text-align:center;">NATIONAL IDENTITY SLIP</h2>

      <div style="display:flex; gap:20px; margin-top:20px;">
        <img src="${photo}" style="width:120px; height:120px; border-radius:10px;" />

        <div>
          <p><b>First Name:</b> ${data.firstname}</p>
          <p><b>Middle Name:</b> ${data.middlename}</p>
          <p><b>Last Name:</b> ${data.surname}</p>
          <p><b>NIN:</b> ${data.nin}</p>
          <p><b>Gender:</b> ${data.gender}</p>
          <p><b>Date of Birth:</b> ${data.birthdate}</p>
          <p><b>Phone:</b> ${data.telephoneno}</p>
        </div>
      </div>

      <div style="margin-top:20px;">
        <p><b>Address:</b> ${data.residence_address}</p>
        <p><b>State:</b> ${data.residence_state}</p>
        <p><b>LGA:</b> ${data.residence_lga}</p>
      </div>

      <hr style="margin-top:30px;" />

      <p style="text-align:center; font-size:12px;">
        Generated via Xcombinator Verification System
      </p>

    </body>
  </html>
  `;

  await page.setContent(html);

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return pdf;
}

module.exports = { generateNINSlip };