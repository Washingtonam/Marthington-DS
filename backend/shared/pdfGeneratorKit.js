const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Generate a NIN verification slip as PDF using PDFKit
 * @param {Object} data - User and NIN verification data
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateNINSlip(data) {
  return new Promise((resolve, reject) => {
    try {
      // Use compression and standard fonts to reduce size
      const doc = new PDFDocument({ size: 'A4', margin: 40, compress: true });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('NATIONAL IDENTITY SLIP', { align: 'center' });
      doc.fontSize(11).font('Helvetica').text('Federal Republic of Nigeria', { align: 'center' });
      doc.moveDown(0.5);

      // Divider
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Photo and Details Section
      doc.fontSize(12).font('Helvetica-Bold').text('Personal Information', { underline: true });
      doc.moveDown(0.3);

      // Left column: Photo (if provided)
      const photoY = doc.y;
      if (data.photo && data.photo !== 'undefined') {
        try {
          // If data.photo is a data-url, downscale/convert to JPEG to reduce size
          let photoBuffer = Buffer.isBuffer(data.photo)
            ? data.photo
            : Buffer.from(data.photo.replace(/^data:image\/\w+;base64,/, ''), 'base64');

          // Try to convert PNG to JPEG using a lightweight in-memory conversion
          // If sharp is present use it; otherwise embed as-is but resize in PDF
          try {
            const sharp = require('sharp');
            photoBuffer = await sharp(photoBuffer).resize(160, 200, { fit: 'cover' }).jpeg({ quality: 70 }).toBuffer();
            doc.image(photoBuffer, 50, photoY, { width: 100, height: 120 });
          } catch (e) {
            // fallback: embed but set size to encourage lower PDF footprint
            doc.image(photoBuffer, 50, photoY, { width: 100, height: 120 });
          }
        } catch (err) {
          // Skip photo if there's an error
          console.warn('Photo insertion skipped:', err.message);
        }
      }

      // Right column: Personal Details
      doc.fontSize(11).font('Helvetica');
      doc.text(`First Name: ${data.firstname || 'N/A'}`, 170, photoY);
      doc.text(`Middle Name: ${data.middlename || 'N/A'}`);
      doc.text(`Last Name: ${data.surname || 'N/A'}`);
      doc.moveDown(0.2);
      doc.font('Helvetica-Bold').text(`NIN: ${data.nin || 'N/A'}`);
      doc.font('Helvetica');
      doc.text(`Gender: ${data.gender || 'N/A'}`);
      doc.text(`Date of Birth: ${data.birthdate || 'N/A'}`);
      doc.text(`Phone: ${data.telephoneno || 'N/A'}`);

      // Move to next section
      doc.y = photoY + 140;
      doc.moveDown(0.5);

      // Address Section
      doc.fontSize(12).font('Helvetica-Bold').text('Address Information', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Address: ${data.residence_address || 'N/A'}`);
      doc.text(`State: ${data.residence_state || 'N/A'}`);
      doc.text(`LGA: ${data.residence_lga || 'N/A'}`);

      doc.moveDown(0.5);

      // Footer
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.3);
      // Use system fonts (Helvetica) and avoid embedding heavy font subsets
      doc.fontSize(10).font('Helvetica').text('This document is electronically generated via Xcombinator Verification System', { align: 'center' });
      doc.fontSize(9).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate a data slip (basic) using PDFKit
 * @param {Object} data - NIN verification data
 * @param {string} trackingId - Tracking ID for the slip
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateDataSlip(data, trackingId) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 35, compress: true });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('VERIFIED NIN DETAILS', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Federal Republic of Nigeria', { align: 'center' });
      doc.fontSize(10).text(`Tracking ID: ${trackingId}`, { align: 'center' });
      doc.moveDown(0.5);

      // Divider
      doc.strokeColor('#333333').lineWidth(2).moveTo(35, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(0.5);

      // Details
      doc.fontSize(11).font('Helvetica');
      const details = [
        ['First Name', data.firstname || 'N/A'],
        ['Middle Name', data.middlename || 'N/A'],
        ['Last Name', data.surname || 'N/A'],
        ['NIN', data.nin || 'N/A'],
        ['Gender', data.gender || 'N/A'],
        ['Date of Birth', data.birthdate || 'N/A'],
        ['Phone', data.telephoneno || 'N/A'],
        ['Address', data.residence_address || 'N/A'],
        ['State', data.residence_state || 'N/A'],
        ['LGA', data.residence_lga || 'N/A'],
      ];

      details.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(`${label}:`, { continued: true });
        doc.font('Helvetica').text(` ${value}`);
      });

      doc.moveDown(1);

      // Footer
      doc.strokeColor('#333333').lineWidth(1).moveTo(35, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica').text(`Generated: ${new Date().toLocaleString()} | Xcombinator Verification System`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate a premium slip with QR code using PDFKit
 * @param {Object} data - NIN verification data
 * @param {string} trackingId - Tracking ID for the slip
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePremiumSlip(data, trackingId) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 35, compress: true });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(22).font('Helvetica-Bold').text('PREMIUM VERIFICATION DOCUMENT', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Federal Republic of Nigeria - NIMC Verified', { align: 'center' });
      doc.moveDown(0.3);

      // Generate QR code synchronously for tracking
      const qrData = JSON.stringify({
        nin: data.nin,
        tracking: trackingId,
        verified: new Date().toISOString(),
      });

      QRCode.toDataURL(qrData, { errorCorrectionLevel: 'H', width: 150 })
        .then((qrUrl) => {
          doc.image(Buffer.from(qrUrl.replace(/^data:image\/png;base64,/, ''), 'base64'), 470, 50, { width: 90 });

          doc.moveDown(0.5);
          doc.strokeColor('#000000').lineWidth(2).moveTo(35, doc.y).lineTo(560, doc.y).stroke();
          doc.moveDown(0.5);

          // Personal Info
          doc.fontSize(12).font('Helvetica-Bold').text('Verified Information', { underline: true });
          doc.moveDown(0.2);
          doc.fontSize(11).font('Helvetica');

          const info = [
            [`Name: ${data.firstname} ${data.middlename} ${data.surname}`, 50],
            [`NIN: ${data.nin}`, 50],
            [`Gender: ${data.gender}`, 50],
            [`DOB: ${data.birthdate}`, 50],
            [`Phone: ${data.telephoneno}`, 50],
            [`Address: ${data.residence_address}`, 50],
            [`State/LGA: ${data.residence_state} / ${data.residence_lga}`, 50],
          ];

          info.forEach(([text, y]) => {
            doc.text(text, y);
          });

          doc.moveDown(1);
          doc.strokeColor('#000000').lineWidth(1).moveTo(35, doc.y).lineTo(560, doc.y).stroke();
          doc.moveDown(0.3);

          doc.fontSize(9).font('Helvetica-Bold').text(`Tracking ID: ${trackingId}`, { align: 'center' });
          doc.fontSize(8).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
          doc.text('This is a digitally generated document. Xcombinator Verification System', { align: 'center' });

          doc.end();
          resolve(Buffer.concat(buffers));
        })
        .catch((qrErr) => {
          console.warn('QR code generation failed, proceeding without QR:', qrErr.message);
          
          // Continue without QR
          doc.moveDown(0.5);
          doc.strokeColor('#000000').lineWidth(2).moveTo(35, doc.y).lineTo(560, doc.y).stroke();
          doc.moveDown(0.5);

          doc.fontSize(12).font('Helvetica-Bold').text('Verified Information', { underline: true });
          doc.moveDown(0.2);
          doc.fontSize(11).font('Helvetica');

          const info = [
            [`Name: ${data.firstname} ${data.middlename} ${data.surname}`, 50],
            [`NIN: ${data.nin}`, 50],
            [`Gender: ${data.gender}`, 50],
            [`DOB: ${data.birthdate}`, 50],
            [`Phone: ${data.telephoneno}`, 50],
            [`Address: ${data.residence_address}`, 50],
            [`State/LGA: ${data.residence_state} / ${data.residence_lga}`, 50],
          ];

          info.forEach(([text, y]) => {
            doc.text(text, y);
          });

          doc.moveDown(1);
          doc.strokeColor('#000000').lineWidth(1).moveTo(35, doc.y).lineTo(560, doc.y).stroke();
          doc.moveDown(0.3);

          doc.fontSize(9).font('Helvetica-Bold').text(`Tracking ID: ${trackingId}`, { align: 'center' });
          doc.fontSize(8).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
          doc.text('This is a digitally generated document. Xcombinator Verification System', { align: 'center' });

          doc.end();
          resolve(Buffer.concat(buffers));
        });

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate a long-form slip using PDFKit
 * @param {Object} data - NIN verification data
 * @param {string} trackingId - Tracking ID for the slip
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateLongSlip(data, trackingId) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 35 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      doc.fontSize(24).font('Helvetica-Bold').text('COMPREHENSIVE VERIFICATION REPORT', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('National Identification Management Commission (NIMC)', { align: 'center' });
      doc.fontSize(9).text(`Report ID: ${trackingId}`, { align: 'center' });
      doc.moveDown(0.8);

      // Divider
      doc.strokeColor('#000000').lineWidth(2).moveTo(35, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(0.6);

      // Full Details
      doc.fontSize(12).font('Helvetica-Bold').text('FULL VERIFIED DETAILS', { underline: true });
      doc.moveDown(0.4);

      doc.fontSize(11).font('Helvetica');
      const details = [
        ['First Name', data.firstname],
        ['Middle Name', data.middlename],
        ['Last Name', data.surname],
        ['National Identification Number (NIN)', data.nin],
        ['Gender', data.gender],
        ['Date of Birth', data.birthdate],
        ['Telephone Number', data.telephoneno],
        ['Residential Address', data.residence_address],
        ['State of Residence', data.residence_state],
        ['Local Government Area (LGA)', data.residence_lga],
      ];

      details.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(`${label}:`, { width: 150, continued: false });
        doc.font('Helvetica').text(`  ${value || 'N/A'}`);
        doc.moveDown(0.2);
      });

      doc.moveDown(0.8);

      // Certification
      doc.fontSize(11).font('Helvetica-Bold').text('CERTIFICATION', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text('This report certifies that the above information has been verified against the National Identification Management Commission (NIMC) database and found to be accurate as of the date of generation below.');
      doc.moveDown(0.6);

      // Footer
      doc.strokeColor('#000000').lineWidth(1).moveTo(35, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.fontSize(8).font('Helvetica').text(`Verification System: Xcombinator | Document ID: ${trackingId}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateNINSlip,
  generateDataSlip,
  generatePremiumSlip,
  generateLongSlip,
};
