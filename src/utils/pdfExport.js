/**
 * PDF Export Utility
 * Uses browser's native print-to-PDF functionality with custom styling
 * Works for both Contract and Proposal pages
 */

/**
 * Generate and download a PDF from HTML content
 * @param {Object} options - PDF generation options
 * @param {string} options.title - Document title
 * @param {string} options.content - HTML content to render
 * @param {string} options.filename - Output filename
 */
export const exportToPDF = ({ title, content, filename }) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
        alert('Please allow popups to download the PDF.');
        return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #1a1a1a;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #2563eb;
        }
        .header h1 {
            font-size: 24px;
            color: #1e40af;
            margin-bottom: 5px;
        }
        .header .subtitle {
            color: #6b7280;
            font-size: 14px;
        }
        .header .contract-id {
            color: #9ca3af;
            font-size: 11px;
            margin-top: 5px;
        }
        .section {
            margin-bottom: 20px;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e7eb;
        }
        .content-text {
            white-space: pre-wrap;
            font-size: 11px;
            line-height: 1.8;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        th, td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
            font-size: 11px;
        }
        th {
            background: #f3f4f6;
            font-weight: 600;
            color: #374151;
        }
        .signature-section {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
        }
        .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 20px;
        }
        .signature-box {
            text-align: center;
        }
        .signature-box .label {
            font-weight: 600;
            margin-bottom: 10px;
            color: #374151;
        }
        .signature-box .line {
            border-bottom: 1px solid #1a1a1a;
            padding-bottom: 5px;
            margin-bottom: 5px;
            min-height: 40px;
        }
        .signature-box .date {
            color: #6b7280;
            font-size: 10px;
        }
        .signature-image {
            max-height: 50px;
            margin: 5px auto;
            display: block;
        }
        .legal-footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            font-size: 9px;
            color: #9ca3af;
            text-align: center;
        }
        .metadata {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 10px;
            margin-top: 15px;
            font-size: 10px;
        }
        .metadata-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
        }
        .metadata-label {
            color: #6b7280;
        }
        .metadata-value {
            color: #1a1a1a;
            font-weight: 500;
        }
        .pricing-total {
            font-weight: bold;
            color: #059669;
            font-size: 14px;
        }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
        }
        .badge-green {
            background: #d1fae5;
            color: #065f46;
        }
        .badge-blue {
            background: #dbeafe;
            color: #1e40af;
        }
        .watermark {
            position: fixed;
            bottom: 20px;
            right: 20px;
            font-size: 9px;
            color: #d1d5db;
        }
        @media print {
            body { padding: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    ${content}
    <div class="watermark">Generated by CronzPH System</div>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
            }, 300);
        };
    </script>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};

/**
 * Generate PDF content for a Contract
 */
export const generateContractPDF = (project, contract) => {
    const signedDate = contract?.signedAt?.toDate
        ? contract.signedAt.toDate().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : contract?.signatureTimestamp
            ? new Date(contract.signatureTimestamp).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
            : 'Not yet signed';

    const signatureImageHtml = contract?.signatureImage
        ? `<img src="${contract.signatureImage}" class="signature-image" alt="Digital Signature" />`
        : '<div style="min-height: 40px;"></div>';

    const metadataHtml = contract?.signatureId ? `
        <div class="metadata">
            <p style="font-weight: 600; margin-bottom: 5px;">🔐 Signature Verification</p>
            <div class="metadata-grid">
                <span class="metadata-label">Signature ID:</span>
                <span class="metadata-value">${contract.signatureId}</span>
                <span class="metadata-label">IP Address:</span>
                <span class="metadata-value">${contract.signatureIp || 'N/A'}</span>
                <span class="metadata-label">Timestamp:</span>
                <span class="metadata-value">${contract.signatureTimestamp || 'N/A'}</span>
                <span class="metadata-label">Timezone:</span>
                <span class="metadata-value">${contract.signatureTimezone || 'N/A'}</span>
            </div>
        </div>
    ` : '';

    const content = `
        <div class="header">
            <h1>CronzPH</h1>
            <div class="subtitle">Software Development Agreement</div>
            ${contract?.contractId ? `<div class="contract-id">Contract ID: ${contract.contractId}</div>` : ''}
        </div>

        ${contract?.signedBy ? `
        <div class="section">
            <span class="badge badge-green">✅ SIGNED</span>
            <span style="margin-left: 10px; font-size: 11px; color: #6b7280;">
                Signed by ${contract.signedBy} on ${signedDate}
            </span>
        </div>
        ` : `
        <div class="section">
            <span class="badge badge-blue">⏳ AWAITING SIGNATURE</span>
        </div>
        `}

        <div class="section">
            <div class="content-text">${contract?.fullText || 'Contract content not available.'}</div>
        </div>

        <div class="section">
            <div class="section-title">Per-Issue Pricing (After Warranty)</div>
            <table>
                <thead>
                    <tr>
                        <th>Issue Type</th>
                        <th>Description</th>
                        <th>Price</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Minor (cosmetic)</td><td>Visual issues, spacing, colors</td><td>FREE always</td></tr>
                    <tr><td>Medium</td><td>Broken feature, not core</td><td>₱1,000 - ₱2,500</td></tr>
                    <tr><td>Major</td><td>Core functionality broken</td><td>₱2,500 - ₱5,000</td></tr>
                    <tr><td>Critical</td><td>System down, urgent</td><td>₱5,000+</td></tr>
                </tbody>
            </table>
            <p style="font-size: 9px; color: #6b7280; margin-top: 5px;">
                * All issues within 30 days of delivery are covered under warranty at no additional cost.
            </p>
        </div>

        <div class="signature-section">
            <div class="section-title">Signatures</div>
            <div class="signature-grid">
                <div class="signature-box">
                    <div class="label">Developer</div>
                    <div class="line">CronzPH</div>
                    <div class="date">Date: _______________</div>
                </div>
                <div class="signature-box">
                    <div class="label">Client</div>
                    <div class="line">
                        ${signatureImageHtml}
                        ${contract?.signedBy || '________________'}
                    </div>
                    <div class="date">Date: ${signedDate}</div>
                </div>
            </div>
            ${metadataHtml}
        </div>

        <div class="legal-footer">
            This document is legally binding under RA 8792 (E-Commerce Act of the Philippines) and A.M. No. 01-7-01-SC (Rules on Electronic Evidence).
            <br>Generated on ${new Date().toLocaleString('en-PH')} | CronzPH Software Development
        </div>
    `;

    exportToPDF({
        title: `Contract - ${project?.businessName || project?.clientName || 'Client'}`,
        content,
        filename: `contract-${project?.businessName || 'document'}.pdf`,
    });
};

/**
 * Generate PDF content for a Proposal
 */
export const generateProposalPDF = (project, proposalData) => {
    if (!proposalData) return;

    const formatCurrency = (amount) => {
        if (!amount) return '₱0';
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(amount);
    };

    const pricingTotal = proposalData.pricingBreakdown?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
    const timelineTotal = proposalData.timeline?.reduce((sum, item) => {
        const match = item.duration?.match(/(\d+)/);
        return sum + (match ? parseInt(match[1]) : 0);
    }, 0) || 0;
    const timelineWeeks = Math.ceil(timelineTotal / 7);

    const pricingRows = proposalData.pricingBreakdown?.map(item =>
        `<tr><td>${item.module}</td><td style="text-align: right;">${formatCurrency(item.price)}</td></tr>`
    ).join('') || '';

    const timelineRows = proposalData.timeline?.map(item =>
        `<tr><td>${item.milestone}</td><td style="text-align: right;">${item.duration}</td></tr>`
    ).join('') || '';

    const scopeHtml = proposalData.scopeOfWork?.map(item => `
        <div style="margin-bottom: 10px;">
            <strong>${item.icon || '✅'} ${item.category}</strong>
            <ul style="margin-top: 5px; padding-left: 20px;">
                ${item.items?.map(sub => `<li>${sub}</li>`).join('') || ''}
            </ul>
        </div>
    `).join('') || '';

    const outOfScopeHtml = proposalData.outOfScope?.map(item => `
        <div style="margin-bottom: 10px;">
            <strong>❌ ${item.category}</strong>
            <ul style="margin-top: 5px; padding-left: 20px;">
                ${item.items?.map(sub => `<li>${sub}</li>`).join('') || ''}
            </ul>
        </div>
    `).join('') || '';

    const termsHtml = proposalData.termsAndConditions?.map((item, idx) =>
        `<li>${item}</li>`
    ).join('') || '';

    const bugPolicyRows = proposalData.bugPolicy?.map(item =>
        `<tr><td>${item.type}</td><td>${item.freePeriod}</td><td>${item.afterFree}</td></tr>`
    ).join('') || '';

    const assumptionsHtml = proposalData.assumptions?.map(item =>
        `<li>⚠️ ${item}</li>`
    ).join('') || '';

    const signatureImageHtml = project?.clientSignature
        ? `<img src="${project.clientSignature}" class="signature-image" alt="Client Signature" />`
        : '';

    const content = `
        <div class="header">
            <h1>${proposalData.projectTitle || 'Project Proposal'}</h1>
            <div class="subtitle">${proposalData.subtitle || ''}</div>
            <div class="contract-id">Prepared by CronzPH | ${new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</div>
            <div style="margin-top: 10px; font-size: 11px; color: #6b7280;">
                Client: ${project?.clientName || project?.fullName || '-'} | Business: ${project?.businessName || '-'}
            </div>
        </div>

        ${project?.clientSignature ? `
        <div class="section">
            <span class="badge badge-green">✅ ACCEPTED</span>
            <span style="margin-left: 10px; font-size: 11px; color: #6b7280;">
                Signed by ${project?.clientName || 'Client'} on ${project?.signedAt ? new Date(project.signedAt).toLocaleDateString('en-PH') : 'N/A'}
            </span>
        </div>
        ` : ''}

        <div class="section">
            <div class="section-title">💰 Investment Summary</div>
            <table>
                <tbody>
                    <tr><td>Total Project Cost</td><td style="text-align: right; font-weight: bold; color: #059669;">${formatCurrency(proposalData.investmentSummary?.totalCost)}</td></tr>
                    <tr><td>Downpayment (50%)</td><td style="text-align: right;">${formatCurrency(proposalData.investmentSummary?.downpayment)}</td></tr>
                    <tr><td>Final Payment</td><td style="text-align: right;">${formatCurrency(proposalData.investmentSummary?.finalPayment)}</td></tr>
                    <tr><td>Payment Methods</td><td style="text-align: right;">${proposalData.investmentSummary?.paymentMethods || 'GCash / Maya / Bank Transfer'}</td></tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">📊 Pricing Breakdown</div>
            <table>
                <tbody>
                    ${pricingRows}
                    <tr style="border-top: 2px solid #e5e7eb;">
                        <td><strong>TOTAL</strong></td>
                        <td style="text-align: right;" class="pricing-total">${formatCurrency(pricingTotal)}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">📅 Timeline</div>
            <table>
                <tbody>
                    ${timelineRows}
                    <tr style="border-top: 2px solid #e5e7eb;">
                        <td><strong>Total Duration</strong></td>
                        <td style="text-align: right; font-weight: bold; color: #7c3aed;">${timelineWeeks} weeks</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">✅ Scope of Work</div>
            ${scopeHtml}
        </div>

        <div class="section">
            <div class="section-title">❌ Out of Scope</div>
            ${outOfScopeHtml}
        </div>

        <div class="section">
            <div class="section-title">🔄 Revision Policy</div>
            <table>
                <tbody>
                    <tr><td>Rounds Included</td><td style="text-align: right;">${proposalData.revisionPolicy?.roundsIncluded || 2} rounds</td></tr>
                    <tr><td>Revision Window</td><td style="text-align: right;">${proposalData.revisionPolicy?.revisionWindow || '14 days'} after each delivery</td></tr>
                    <tr><td>Additional Cost</td><td style="text-align: right;">${proposalData.revisionPolicy?.additionalCost || '₱500 per round'}</td></tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">🐛 Bug Support Policy</div>
            <table>
                <thead>
                    <tr><th>Bug Type</th><th>Free Support Period</th><th>After Free Period</th></tr>
                </thead>
                <tbody>
                    ${bugPolicyRows}
                </tbody>
            </table>
        </div>

        ${assumptionsHtml ? `
        <div class="section">
            <div class="section-title">⚠️ Assumptions & Limitations</div>
            <ul style="padding-left: 20px;">
                ${assumptionsHtml}
            </ul>
        </div>
        ` : ''}

        <div class="section">
            <div class="section-title">⚖️ Terms & Conditions</div>
            <ol style="padding-left: 20px;">
                ${termsHtml}
            </ol>
        </div>

        <div class="signature-section">
            <div class="section-title">Agreement</div>
            <div class="signature-grid">
                <div class="signature-box">
                    <div class="label">Developer</div>
                    <div class="line">CronzPH</div>
                    <div class="date">Date: _______________</div>
                </div>
                <div class="signature-box">
                    <div class="label">Client</div>
                    <div class="line">
                        ${signatureImageHtml}
                        ${project?.clientName || '________________'}
                    </div>
                    <div class="date">Date: ${project?.signedAt ? new Date(project.signedAt).toLocaleDateString('en-PH') : '_______________'}</div>
                </div>
            </div>
        </div>

        <div class="legal-footer">
            This proposal is valid for 30 days from the date of issue. Prices are subject to change after this period.
            <br>Generated on ${new Date().toLocaleString('en-PH')} | CronzPH Software Development
        </div>
    `;

    exportToPDF({
        title: `Proposal - ${project?.businessName || project?.clientName || 'Client'}`,
        content,
        filename: `proposal-${project?.businessName || 'document'}.pdf`,
    });
};
