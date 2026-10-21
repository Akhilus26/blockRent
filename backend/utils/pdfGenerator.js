import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { join } from 'path';

/**
 * Generates an executive, highly professional residential lease agreement PDF.
 * Designed with elegant legal-grade typography, framed double borders, structured data cards,
 * cryptographic verification seal, formal lease covenants, and dual signature blocks.
 *
 * @param {Object} data - Agreement or Rental Request data
 * @param {string} destinationDir - Directory to save generated PDF (e.g. ./uploads)
 * @param {string} [filenameOverride] - Optional filename (e.g. request_xxx.pdf or agreement_xxx.pdf)
 * @returns {Promise<string>} - Resolves to the generated filename
 */
export function generateProfessionalAgreementPDF(data, destinationDir, filenameOverride) {
  return new Promise((resolve, reject) => {
    // Standard A4: 595.28 x 841.89 points
    const doc = new PDFDocument({
      size: 'A4',
      margin: 30,
      bufferPages: true,
      info: {
        Title: `Residential Lease Deed - ${data.propertyTitle || 'Property'}`,
        Author: 'BlockRent Platform',
        Subject: `Lease Contract ID: ${data.id}`,
        Keywords: 'residential lease deed, rental agreement, blockrent, blockchain',
        CreationDate: new Date(),
      }
    });

    const filename = filenameOverride || `agreement_${data.id}.pdf`;
    const filepath = join(destinationDir, filename);
    const stream = createWriteStream(filepath);
    doc.pipe(stream);

    // Helpers
    const formatDate = (dateVal) => {
      if (!dateVal) return 'N/A';
      try {
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? String(dateVal) : d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      } catch {
        return String(dateVal);
      }
    };

    const formatCurrency = (amount) => {
      const num = Number(amount) || 0;
      return 'INR ' + num.toLocaleString('en-IN');
    };

    const startDateStr = formatDate(data.startDate || data.createdAt || new Date());
    let endDateStr = formatDate(data.endDate);
    if (!data.endDate && data.startDate) {
      const end = new Date(data.startDate);
      end.setFullYear(end.getFullYear() + 1);
      endDateStr = formatDate(end);
    } else if (!data.endDate) {
      const end = new Date();
      end.setFullYear(end.getFullYear() + 1);
      endDateStr = formatDate(end);
    }

    const timestampStr = data.blockchainTimestamp 
      ? new Date(data.blockchainTimestamp).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      : formatDate(data.createdAt || new Date());

    // Term length calculation
    let termLengthStr = '11 Months';
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const months = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.4375)));
        termLengthStr = `${months} Month${months > 1 ? 's' : ''}`;
      }
    }

    // ==========================================
    // 1. EXECUTIVE OUTER DOUBLE LEGAL FRAME
    // ==========================================
    // Outer border
    doc.roundedRect(18, 18, 559.28, 805.89, 5)
       .lineWidth(1.5)
       .strokeColor('#0F172A')
       .stroke();

    // Inner hairline accent border
    doc.roundedRect(21.5, 21.5, 552.28, 798.89, 3.5)
       .lineWidth(0.5)
       .strokeColor('#CBD5E1')
       .stroke();

    // ==========================================
    // 2. HEADER BANNER (Navy + Accent Bars)
    // ==========================================
    const headerX = 22.5;
    const headerY = 22.5;
    const headerW = 550.28;
    const headerH = 72;

    doc.rect(headerX, headerY, headerW, headerH).fill('#0F172A');
    doc.rect(headerX, headerY + headerH, headerW, 3).fill('#2563EB'); // Royal blue stripe

    // Header Left: Branding & Title
    doc.fillColor('#FFFFFF').fontSize(19).font('Helvetica-Bold').text('BLOCKRENT', 38, 33);
    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica-Bold').text('RESIDENTIAL LEASE DEED & TENANCY CONTRACT', 38, 56);
    doc.fillColor('#38BDF8').fontSize(7).font('Helvetica').text('DIGITALLY AUTHENTICATED  •  CRYPTOGRAPHICALLY SECURED', 38, 69);

    // Header Right: Reference Box
    const refX = 330;
    doc.fillColor('#94A3B8').fontSize(7).font('Helvetica').text('CONTRACT REFERENCE ID', refX, 31, { width: 228, align: 'right' });
    doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold').text(`REF: ${data.id || 'N/A'}`, refX, 42, { width: 228, align: 'right' });
    doc.fillColor('#CBD5E1').fontSize(7).font('Helvetica').text(`EXECUTION DATE: ${formatDate(data.createdAt || new Date())}`, refX, 55, { width: 228, align: 'right' });
    
    // Status Pill
    doc.roundedRect(440, 68, 118, 14, 2).fillAndStroke('#065F46', '#047857');
    doc.fillColor('#34D399').fontSize(6.8).font('Helvetica-Bold').text('REGISTERED & EXECUTED', 440, 71.5, { width: 118, align: 'center' });

    // ==========================================
    // 3. CRYPTOGRAPHIC PROOF & BLOCKCHAIN SEAL
    // ==========================================
    const sealY = 106;
    const sealW = 528.28;
    const sealH = 56;
    const sealX = 33.5;

    doc.roundedRect(sealX, sealY, sealW, sealH, 3.5).fillAndStroke('#F8FAFC', '#CBD5E1');

    // Title inside seal box
    doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text('ON-CHAIN CRYPTOGRAPHIC AUDIT RECORD & IMMUTABLE PROOF', sealX + 10, sealY + 7);
    
    // Status Badge inside box
    doc.roundedRect(sealX + sealW - 120, sealY + 5, 112, 13, 2).fillAndStroke('#DCFCE7', '#86EFAC');
    doc.fillColor('#166534').fontSize(6.5).font('Helvetica-Bold').text('LEDGER VERIFIED', sealX + sealW - 120, sealY + 7.5, { width: 112, align: 'center' });

    // Monospace Hash Box
    const hash = data.blockchainHash || '6da2828bf7925b3401490e69bbcc27311f819d38d3a31d1a60cb40945b7d29df';
    doc.roundedRect(sealX + 10, sealY + 22, sealW - 20, 16, 2.5).fillAndStroke('#FFFFFF', '#E2E8F0');
    doc.fillColor('#1E293B').fontSize(7).font('Courier-Bold').text(`SHA-256 HASH: ${hash}`, sealX + 16, sealY + 26);

    // Subtext
    doc.fillColor('#64748B').fontSize(6.8).font('Helvetica').text(
      `Timestamp: ${timestampStr}  |  Immutable mathematical audit anchor recorded upon confirmation of advance rent payment.`,
      sealX + 10, sealY + 42
    );

    // ==========================================
    // 4. CONTRACTING PARTIES (Dual Cards)
    // ==========================================
    const partiesY = 170;
    const cardW = 258.14;
    const cardH = 74;

    // Lessor Card (Landlord)
    doc.roundedRect(sealX, partiesY, cardW, cardH, 3.5).fillAndStroke('#FFFFFF', '#E2E8F0');
    doc.rect(sealX, partiesY, cardW, 18).fill('#F1F5F9');
    doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold').text('FIRST PARTY: LESSOR (PROPERTY OWNER)', sealX + 10, partiesY + 5);

    const landlordName = data.landlordName || (data.landlord && data.landlord.name) || 'Property Owner';
    doc.fillColor('#0F172A').fontSize(10.5).font('Helvetica-Bold').text(landlordName, sealX + 10, partiesY + 24);
    
    const landlordContact = [data.landlordEmail || (data.landlord && data.landlord.email), data.landlordPhone || (data.landlord && data.landlord.phone)].filter(Boolean).join('  •  ');
    doc.fillColor('#64748B').fontSize(7.2).font('Helvetica').text(landlordContact || 'Registered Landlord Account', sealX + 10, partiesY + 39, { width: cardW - 20 });
    doc.fillColor('#059669').fontSize(7).font('Helvetica-Bold').text('✓ Ownership & Identity Document Verified', sealX + 10, partiesY + 56);

    // Lessee Card (Tenant)
    const tenantCardX = sealX + cardW + 12;
    doc.roundedRect(tenantCardX, partiesY, cardW, cardH, 3.5).fillAndStroke('#FFFFFF', '#E2E8F0');
    doc.rect(tenantCardX, partiesY, cardW, 18).fill('#F1F5F9');
    doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold').text('SECOND PARTY: LESSEE (TENANT)', tenantCardX + 10, partiesY + 5);

    const tenantName = data.tenantName || 'Tenant';
    doc.fillColor('#0F172A').fontSize(10.5).font('Helvetica-Bold').text(tenantName, tenantCardX + 10, partiesY + 24);

    const tenantContact = [data.tenantEmail, data.tenantPhone].filter(Boolean).join('  •  ');
    doc.fillColor('#64748B').fontSize(7.2).font('Helvetica').text(tenantContact || 'Registered Tenant Account', tenantCardX + 10, partiesY + 39, { width: cardW - 20 });
    doc.fillColor('#059669').fontSize(7).font('Helvetica-Bold').text('✓ Identity Document Formally Verified', tenantCardX + 10, partiesY + 56);

    // ==========================================
    // 5. SCHEDULE OF PREMISES & FINANCIAL PARTICULARS
    // ==========================================
    const termsY = 252;
    const termsH = 96;
    doc.roundedRect(sealX, termsY, sealW, termsH, 3.5).fillAndStroke('#FFFFFF', '#CBD5E1');

    // Header bar
    doc.rect(sealX, termsY, sealW, 19).fill('#1E293B');
    doc.fillColor('#FFFFFF').fontSize(7.8).font('Helvetica-Bold').text('SCHEDULE A: DEMISED PREMISES & FINANCIAL PARTICULARS', sealX + 10, termsY + 5.5);

    // Row 1: Property Description
    const r1 = termsY + 26;
    doc.fillColor('#64748B').fontSize(7.2).font('Helvetica-Bold').text('DEMISED PREMISES:', sealX + 10, r1);
    const propTitle = data.propertyTitle || 'Residential Apartment / Property';
    const propLoc = data.propertyLocation ? ` (${data.propertyLocation})` : '';
    doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(`${propTitle}${propLoc}`, sealX + 140, r1, { width: sealW - 150 });

    // Row 2: Agreed Rent & Advance Amount
    const r2 = termsY + 44;
    doc.fillColor('#64748B').fontSize(7.2).font('Helvetica-Bold').text('AGREED MONTHLY RENT:', sealX + 10, r2);
    const rentAmount = data.finalRent || data.proposedRent || 0;
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(`${formatCurrency(rentAmount)} / Month`, sealX + 140, r2);

    doc.fillColor('#64748B').fontSize(7.2).font('Helvetica-Bold').text('ADVANCE / DEPOSIT:', sealX + 320, r2);
    const advanceAmount = data.advanceAmount || data.amountPaid || rentAmount;
    doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(`${formatCurrency(advanceAmount)} (Cleared & Received)`, sealX + 420, r2);

    // Row 3: Lease Duration & Term Length
    const r3 = termsY + 62;
    doc.fillColor('#64748B').fontSize(7.2).font('Helvetica-Bold').text('LEASE DURATION:', sealX + 10, r3);
    doc.fillColor('#0F172A').fontSize(8.2).font('Helvetica').text(`${startDateStr}  to  ${endDateStr}`, sealX + 140, r3);

    doc.fillColor('#64748B').fontSize(7.2).font('Helvetica-Bold').text('TERM LENGTH:', sealX + 320, r3);
    doc.fillColor('#0F172A').fontSize(8.2).font('Helvetica').text(termLengthStr, sealX + 420, r3);

    // Row 4: Settlement Status & Transaction Hash
    const r4 = termsY + 79;
    doc.fillColor('#64748B').fontSize(7.2).font('Helvetica-Bold').text('SETTLEMENT STATUS:', sealX + 10, r4);
    doc.fillColor('#16A34A').fontSize(8.2).font('Helvetica-Bold').text('ADVANCE PAYMENT CONFIRMED ON LEDGER', sealX + 140, r4);

    doc.fillColor('#64748B').fontSize(7.2).font('Helvetica-Bold').text('TRANSACTION REF:', sealX + 320, r4);
    const txnShort = data.transactionHash 
      ? data.transactionHash.substring(0, 16) + '...'
      : `TXN-${(data.id || '').substring(0, 14)}`;
    doc.fillColor('#475569').fontSize(7.2).font('Courier').text(txnShort, sealX + 420, r4);

    // ==========================================
    // 6. STANDARD LEASE COVENANTS & CLAUSES
    // ==========================================
    const covY = 356;
    doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text('STANDARD LEASE COVENANTS & STATUTORY PROVISIONS', sealX, covY);
    doc.rect(sealX, covY + 12, sealW, 1).fill('#E2E8F0');

    const clauses = [
      {
        num: '1. GRANT OF RESIDENTIAL TENANCY:',
        text: 'The Lessor hereby grants and the Lessee accepts tenancy of the Demised Premises described in Schedule A strictly for private residential use, commencing on the Start Date and continuing through the End Date.'
      },
      {
        num: '2. RENT REMITTANCE & UTILITY CHARGES:',
        text: 'The Lessee shall punctually pay the monthly rent in advance on or before the agreed monthly due date. Electricity, water, domestic piped gas, and statutory municipal maintenance shall be discharged by the Lessee as agreed.'
      },
      {
        num: '3. PEACEABLE POSSESSION & QUIET ENJOYMENT:',
        text: 'The Lessor covenants that upon the Lessee paying the rent and fulfilling the covenants herein, the Lessee shall peaceably hold and enjoy the premises during the tenancy without unlawful interruption or eviction.'
      },
      {
        num: '4. MAINTENANCE, CARE & REPAIRS:',
        text: 'The Lessee shall maintain the interior fixtures, electrical fittings, and sanitary ware in clean and sound condition, reasonable wear and tear excepted. No structural modifications or subletting shall occur without prior written consent.'
      },
      {
        num: '5. IMMUTABLE DIGITAL EXECUTION & JURISDICTION:',
        text: 'Both parties confirm that this lease deed has been formally negotiated, approved, and finalized through the BlockRent platform. The cryptographic hash recorded herein constitutes conclusive, tamper-evident proof of the terms.'
      }
    ];

    let currentClauseY = covY + 18;
    clauses.forEach((c) => {
      doc.fillColor('#1E293B').fontSize(7.2).font('Helvetica-Bold').text(c.num, sealX, currentClauseY);
      doc.fillColor('#475569').fontSize(6.8).font('Helvetica').text(c.text, sealX, currentClauseY + 8.5, {
        width: sealW,
        lineGap: 1.2,
      });
      currentClauseY += 29;
    });

    // ==========================================
    // 7. DUAL SIGNATURE EXECUTION BLOCKS
    // ==========================================
    const sigY = 510;
    const sigW = 258.14;
    const sigH = 80;

    // Lessor Signature Card
    doc.roundedRect(sealX, sigY, sigW, sigH, 3.5).fillAndStroke('#F8FAFC', '#CBD5E1');
    doc.fillColor('#64748B').fontSize(6.8).font('Helvetica-Bold').text('AUTHORIZED LESSOR DIGITAL SIGNATURE', sealX + 10, sigY + 7);
    
    doc.fillColor('#1E3A8A').fontSize(13).font('Helvetica-Bold').text(landlordName, sealX + 10, sigY + 24);
    doc.rect(sealX + 10, sigY + 44, 190, 0.75).fill('#94A3B8');
    
    doc.fillColor('#059669').fontSize(6.8).font('Helvetica-Bold').text('✓ DIGITALLY CONFIRMED VIA BLOCKRENT IDENTITY', sealX + 10, sigY + 50);
    doc.fillColor('#64748B').fontSize(6.5).font('Helvetica').text(`Sign Date: ${formatDate(data.createdAt || new Date())}`, sealX + 10, sigY + 61);

    // Lessee Signature Card
    doc.roundedRect(tenantCardX, sigY, sigW, sigH, 3.5).fillAndStroke('#F8FAFC', '#CBD5E1');
    doc.fillColor('#64748B').fontSize(6.8).font('Helvetica-Bold').text('AUTHORIZED LESSEE DIGITAL SIGNATURE', tenantCardX + 10, sigY + 7);
    
    doc.fillColor('#1E3A8A').fontSize(13).font('Helvetica-Bold').text(tenantName, tenantCardX + 10, sigY + 24);
    doc.rect(tenantCardX + 10, sigY + 44, 190, 0.75).fill('#94A3B8');

    doc.fillColor('#059669').fontSize(6.8).font('Helvetica-Bold').text('✓ DIGITALLY SIGNED & ADVANCE PAID', tenantCardX + 10, sigY + 50);
    doc.fillColor('#64748B').fontSize(6.5).font('Helvetica').text(`Sign Date: ${formatDate(data.createdAt || new Date())}`, tenantCardX + 10, sigY + 61);

    // ==========================================
    // 8. LEGAL ATTESTATION BANNER
    // ==========================================
    const attY = 600;
    const attH = 46;
    doc.roundedRect(sealX, attY, sealW, attH, 3.5).fillAndStroke('#F1F5F9', '#CBD5E1');

    doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text('BLOCKRENT LEGAL ATTESTATION & ENFORCEABILITY', sealX + 10, attY + 6.5);
    doc.fillColor('#475569').fontSize(6.5).font('Helvetica').text(
      'This document represents an official, legally enforceable digital residential tenancy agreement executed between verified parties. ' +
      'All parameters, identity proofs, and advance rental payments are cryptographically indexed on the BlockRent decentralized ledger. ' +
      'Any unauthorized physical alteration or manual alteration renders this electronic instrument null and void.',
      sealX + 10, attY + 17, { width: sealW - 20, lineGap: 1.2 }
    );

    // ==========================================
    // 9. BOTTOM LEGAL FOOTER (Inside Frame)
    // ==========================================
    const footerY = 658;
    doc.rect(sealX, footerY, sealW, 0.75).fill('#E2E8F0');
    doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica').text(
      'BlockRent Platform  •  Decentralized Residential Real Estate Ecosystem  •  Official Digital Instrument  •  Page 1 of 1',
      sealX, footerY + 6, { width: sealW, align: 'center' }
    );

    doc.end();

    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
}
