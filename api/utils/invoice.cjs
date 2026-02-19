const PDFDocument = require('pdfkit');

/**
 * Generates a PDF invoice that matches the dashboard's existing invoice layout.
 * Uses PDFKit on the server side to replicate the same visual design as the
 * jsPDF-based downloadPDF function in AdminDashboard.jsx.
 *
 * Returns a Promise that resolves to a Buffer containing the PDF data.
 */
const generateInvoicePDF = (order) => {
    return new Promise((resolve, reject) => {
        try {
            if (!order || !order.orderId || !order.customer || !order.items) {
                throw new Error('Invalid order data for invoice generation');
            }

            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            const chunks = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const margin = 40;
            const pageW = 595.28; // A4 width in points
            const contentW = pageW - margin * 2;
            const brand = '#1A3329';
            const textDark = '#3C3C3C';
            const textMid = '#505050';
            const textLight = '#969696';

            // ── Helper: Rs. formatter (PDF fonts don't have ₹) ──
            const rs = (n) => 'Rs. ' + Number(n || 0).toFixed(2);

            // ── Helper: date formatter ──
            const fmtDate = (d) => {
                if (!d) return '—';
                const dt = new Date(d);
                return isNaN(dt) ? '—' : dt.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
            };

            // ═══════════════════════════════════════
            // TOP BAR
            // ═══════════════════════════════════════
            doc.rect(0, 0, pageW, 6).fill(brand);

            // ═══════════════════════════════════════
            // COMPANY BRANDING (left)
            // ═══════════════════════════════════════
            doc.fontSize(20).font('Helvetica-Bold').fillColor(brand)
                .text('Nisarg Maitri', margin, 22);
            doc.fontSize(9).font('Helvetica').fillColor('#646464')
                .text('Eco-Friendly Products', margin, 44);

            // ═══════════════════════════════════════
            // "INVOICE" BADGE (right)
            // ═══════════════════════════════════════
            doc.fontSize(28).font('Helvetica-Bold').fillColor('#D2D2D2')
                .text('INVOICE', pageW - margin - 120, 22, { width: 120, align: 'right' });

            // ── Divider line ──
            doc.moveTo(margin, 58).lineTo(pageW - margin, 58)
                .strokeColor('#DCDCDC').lineWidth(0.4).stroke();

            // ═══════════════════════════════════════
            // INVOICE META (left side)
            // ═══════════════════════════════════════
            const metaY = 70;
            const metaLabelX = margin;
            const metaValueX = margin + 75;

            const metaLabels = ['Invoice No:', 'Date:', 'Payment:', 'Order Status:'];

            // Payment label
            const payLabel = order.paymentMethod === 'COD'
                ? 'COD'
                : order.razorpayMethod
                    ? 'Prepaid - ' + order.razorpayMethod
                    : 'Prepaid';
            const paymentDisplay = payLabel + ' (' + (order.paymentStatus || 'N/A') + ')';

            const metaValues = [
                order.orderId,
                fmtDate(order.createdAt),
                paymentDisplay,
                order.orderStatus || 'Confirmed',
            ];

            metaLabels.forEach((label, i) => {
                const y = metaY + (i * 14);
                doc.fontSize(9).font('Helvetica-Bold').fillColor(textDark)
                    .text(label, metaLabelX, y);
                doc.fontSize(9).font('Helvetica').fillColor(textMid)
                    .text(metaValues[i], metaValueX, y);
            });

            // ═══════════════════════════════════════
            // BILL TO (right side)
            // ═══════════════════════════════════════
            const rightX = pageW / 2 + 30;

            doc.fontSize(9).font('Helvetica-Bold').fillColor(textDark)
                .text('Bill To:', rightX, metaY);

            const custName = ((order.customer.firstName || '') + ' ' + (order.customer.lastName || '')).trim() || 'N/A';

            doc.fontSize(9).font('Helvetica').fillColor(textMid);
            doc.text(custName, rightX, metaY + 14);
            doc.text(order.customer.email || 'N/A', rightX, metaY + 28);
            doc.text(order.customer.phone || 'N/A', rightX, metaY + 42);

            // Address
            const addr = order.shippingAddress || {};
            const addrText = [
                addr.address1,
                addr.address2,
                [addr.city, addr.state, addr.pincode ? '- ' + addr.pincode : ''].filter(Boolean).join(', '),
            ].filter(Boolean).join('\n');

            if (addrText) {
                doc.fontSize(9).font('Helvetica').fillColor(textMid)
                    .text(addrText, rightX, metaY + 56, { width: pageW - rightX - margin, lineGap: 2 });
            }

            // ═══════════════════════════════════════
            // ITEMS TABLE
            // ═══════════════════════════════════════
            const tableTop = 160;
            const colX = {
                hash: margin,
                item: margin + 25,
                qty: margin + contentW - 150,
                price: margin + contentW - 95,
                total: margin + contentW - 40,
            };
            const tableRight = margin + contentW;

            // Table header
            doc.rect(margin, tableTop, contentW, 22).fill(brand);

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
            doc.text('#', colX.hash + 5, tableTop + 7);
            doc.text('Item', colX.item + 5, tableTop + 7);
            doc.text('Qty', colX.qty, tableTop + 7, { width: 50, align: 'center' });
            doc.text('Price', colX.price, tableTop + 7, { width: 50, align: 'right' });
            doc.text('Total', colX.total, tableTop + 7, { width: 50, align: 'right' });

            // Table rows
            let rowY = tableTop + 22;
            const rowH = 24;
            let subtotal = 0;

            (order.items || []).forEach((item, index) => {
                const itemTotal = (item.quantity || 0) * (item.price || 0);
                subtotal += itemTotal;

                // Alternate row background
                if (index % 2 === 0) {
                    doc.rect(margin, rowY, contentW, rowH).fill('#F5F8F6');
                } else {
                    doc.rect(margin, rowY, contentW, rowH).fill('#FFFFFF');
                }

                doc.fontSize(9).font('Helvetica').fillColor('#323232');
                doc.text(String(index + 1), colX.hash + 5, rowY + 7);

                const productName = item.variant
                    ? `${item.name} (${item.variant})`
                    : item.name || 'N/A';
                doc.text(productName, colX.item + 5, rowY + 7, { width: colX.qty - colX.item - 15 });
                doc.text(String(item.quantity || 0), colX.qty, rowY + 7, { width: 50, align: 'center' });
                doc.text(rs(item.price), colX.price, rowY + 7, { width: 50, align: 'right' });
                doc.font('Helvetica-Bold')
                    .text(rs(itemTotal), colX.total, rowY + 7, { width: 50, align: 'right' });

                // Row border
                doc.moveTo(margin, rowY + rowH).lineTo(tableRight, rowY + rowH)
                    .strokeColor('#DCDCDC').lineWidth(0.3).stroke();

                rowY += rowH;
            });

            // ═══════════════════════════════════════
            // TOTALS SECTION (right-aligned)
            // ═══════════════════════════════════════
            const shippingCost = order.shippingMethod?.cost || 0;
            const discount = order.coupon?.discount || 0;
            const total = order.total || (subtotal + shippingCost - discount);
            const shippingLabel = 'Shipping (' + (order.shippingMethod?.type || 'Standard') + ')';
            const shippingValue = shippingCost === 0 ? 'Free' : rs(shippingCost);

            const totalsX = tableRight - 200;
            const totalsLabelW = 120;
            const totalsValueW = 80;
            let totY = rowY + 15;

            // Subtotal
            doc.fontSize(10).font('Helvetica').fillColor(textDark)
                .text('Subtotal', totalsX, totY, { width: totalsLabelW, align: 'right' });
            doc.text(rs(subtotal), totalsX + totalsLabelW, totY, { width: totalsValueW, align: 'right' });
            totY += 18;

            // Shipping
            doc.text(shippingLabel, totalsX, totY, { width: totalsLabelW, align: 'right' });
            doc.text(shippingValue, totalsX + totalsLabelW, totY, { width: totalsValueW, align: 'right' });
            totY += 18;

            // Discount
            if (discount > 0) {
                const discLabel = 'Coupon' + (order.coupon?.code ? ' (' + order.coupon.code + ')' : '');
                doc.text(discLabel, totalsX, totY, { width: totalsLabelW, align: 'right' });
                doc.text('- ' + rs(discount), totalsX + totalsLabelW, totY, { width: totalsValueW, align: 'right' });
                totY += 18;
            }

            // Divider
            doc.moveTo(totalsX, totY).lineTo(totalsX + totalsLabelW + totalsValueW, totY)
                .strokeColor('#C8C8C8').lineWidth(0.4).stroke();
            totY += 10;

            // Total
            doc.fontSize(12).font('Helvetica-Bold').fillColor(brand)
                .text('Total', totalsX, totY, { width: totalsLabelW, align: 'right' });
            doc.text(rs(total), totalsX + totalsLabelW, totY, { width: totalsValueW, align: 'right' });

            // ═══════════════════════════════════════
            // FOOTER
            // ═══════════════════════════════════════
            const footerY = totY + 45;

            doc.moveTo(margin, footerY).lineTo(pageW - margin, footerY)
                .strokeColor('#DCDCDC').lineWidth(0.3).stroke();

            doc.fontSize(8).font('Helvetica').fillColor(textLight)
                .text('Thank you for your order!', margin, footerY + 10, { width: contentW, align: 'center' });
            doc.text(
                'Nisarg Maitri  |  Eco-Friendly Products  |  nisargmaitri.com',
                margin, footerY + 22, { width: contentW, align: 'center' }
            );

            doc.end();
        } catch (error) {
            console.error('Error generating invoice PDF:', error.message);
            reject(error);
        }
    });
};

module.exports = { generateInvoicePDF };
