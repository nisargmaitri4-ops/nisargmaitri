const PDFDocument = require('pdfkit');

/**
 * Generates a polished, professional PDF invoice for an order.
 * Matches the dashboard invoice layout with refined spacing and typography.
 * Returns a Promise that resolves to a Buffer containing the PDF data.
 */
const generateInvoicePDF = (order) => {
    return new Promise((resolve, reject) => {
        try {
            if (!order || !order.orderId || !order.customer || !order.items) {
                throw new Error('Invalid order data for invoice generation');
            }

            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const M = 50; // margin
            const PW = 595.28; // A4 width
            const CW = PW - M * 2; // content width
            const brand = '#1A3329';

            // ── Helpers ──
            const rs = (n) => 'Rs. ' + Number(n || 0).toFixed(2);
            const fmtDate = (d) => {
                if (!d) return '—';
                const dt = new Date(d);
                return isNaN(dt) ? '—' : dt.toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                });
            };

            // ═════════════════════════════════════════════════════
            //  HEADER
            // ═════════════════════════════════════════════════════

            // Top accent bar
            doc.rect(0, 0, PW, 5).fill(brand);

            // Company name
            doc.fontSize(22).font('Helvetica-Bold').fillColor(brand)
                .text('Nisarg Maitri', M, 28);
            doc.fontSize(9).font('Helvetica').fillColor('#888888')
                .text('Eco-Friendly Products', M, 52);

            // "INVOICE" watermark — right side
            doc.fontSize(30).font('Helvetica-Bold').fillColor('#E0E0E0')
                .text('INVOICE', 0, 30, { width: PW - M, align: 'right' });

            // Divider
            const divY = 68;
            doc.moveTo(M, divY).lineTo(PW - M, divY)
                .strokeColor('#E0E0E0').lineWidth(0.5).stroke();

            // ═════════════════════════════════════════════════════
            //  INVOICE META  (two-column layout)
            // ═════════════════════════════════════════════════════
            const metaTop = 82;
            const halfW = CW / 2;

            // ── LEFT COLUMN: Invoice Details ──
            doc.fontSize(8).font('Helvetica-Bold').fillColor(brand)
                .text('INVOICE DETAILS', M, metaTop);

            const metaLabelX = M;
            const metaValX = M + 70;
            const metaRows = [
                ['Invoice No:', order.orderId],
                ['Order Date:', fmtDate(order.createdAt)],
                ['Delivery Date:', fmtDate(new Date())],
                ['Payment:', (() => {
                    const label = order.paymentMethod === 'COD' ? 'COD'
                        : order.razorpayMethod ? 'Prepaid - ' + order.razorpayMethod : 'Prepaid';
                    return label + ' (' + (order.paymentStatus || 'N/A') + ')';
                })()],
                ['Status:', order.orderStatus || 'Confirmed'],
            ];

            metaRows.forEach((row, i) => {
                const y = metaTop + 16 + i * 14;
                doc.fontSize(8.5).font('Helvetica').fillColor('#888888')
                    .text(row[0], metaLabelX, y);
                doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#333333')
                    .text(row[1], metaValX, y, { width: halfW - 80 });
            });

            // ── RIGHT COLUMN: Bill To ──
            const rightCol = M + halfW + 15;

            doc.fontSize(8).font('Helvetica-Bold').fillColor(brand)
                .text('BILL TO', rightCol, metaTop);

            const custName = ((order.customer.firstName || '') + ' ' + (order.customer.lastName || '')).trim() || 'N/A';

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333')
                .text(custName, rightCol, metaTop + 16);

            doc.fontSize(8.5).font('Helvetica').fillColor('#555555');
            let billY = metaTop + 30;
            if (order.customer.email) {
                doc.text(order.customer.email, rightCol, billY);
                billY += 13;
            }
            if (order.customer.phone) {
                doc.text(order.customer.phone, rightCol, billY);
                billY += 13;
            }

            // ── SHIPPING ADDRESS ──
            const addr = order.shippingAddress || {};
            billY += 5;
            doc.fontSize(8).font('Helvetica-Bold').fillColor(brand)
                .text('SHIPPING ADDRESS', rightCol, billY);
            billY += 14;

            doc.fontSize(8.5).font('Helvetica').fillColor('#555555');
            const addrLines = [
                addr.address1,
                addr.address2,
                [addr.city, addr.state, addr.pincode].filter(Boolean).join(', '),
                addr.country || 'India',
            ].filter(Boolean);

            addrLines.forEach((line) => {
                doc.text(line, rightCol, billY, { width: halfW - 20 });
                billY += 12;
            });

            // ═════════════════════════════════════════════════════
            //  ITEMS TABLE
            // ═════════════════════════════════════════════════════
            const tableTop = Math.max(billY + 10, metaTop + 16 + metaRows.length * 14 + 20);

            // Column layout (carefully sized to avoid overflow)
            const col = {
                hash: { x: M, w: 28 },
                product: { x: M + 28, w: CW - 28 - 50 - 75 - 75 },
                qty: { x: PW - M - 200, w: 50 },
                price: { x: PW - M - 150, w: 75 },
                total: { x: PW - M - 75, w: 75 },
            };
            const rowH = 26;

            // Table header
            doc.rect(M, tableTop, CW, 24).fill(brand);
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
            doc.text('#', col.hash.x + 8, tableTop + 8, { width: col.hash.w });
            doc.text('Product', col.product.x + 6, tableTop + 8, { width: col.product.w });
            doc.text('Qty', col.qty.x, tableTop + 8, { width: col.qty.w, align: 'center' });
            doc.text('Price', col.price.x, tableTop + 8, { width: col.price.w, align: 'right' });
            doc.text('Total', col.total.x, tableTop + 8, { width: col.total.w, align: 'right' });

            // Table rows
            let rowY = tableTop + 24;
            let subtotal = 0;

            (order.items || []).forEach((item, i) => {
                const itemTotal = (item.quantity || 0) * (item.price || 0);
                subtotal += itemTotal;

                // Alternate row background
                doc.rect(M, rowY, CW, rowH).fill(i % 2 === 0 ? '#F7F9F8' : '#FFFFFF');

                doc.fontSize(8.5).font('Helvetica').fillColor('#444444');
                doc.text(String(i + 1), col.hash.x + 8, rowY + 8, { width: col.hash.w });

                const name = item.variant ? `${item.name} (${item.variant})` : (item.name || 'N/A');
                doc.text(name, col.product.x + 6, rowY + 8, { width: col.product.w - 10 });

                doc.text(String(item.quantity || 0), col.qty.x, rowY + 8, { width: col.qty.w, align: 'center' });
                doc.text(rs(item.price), col.price.x, rowY + 8, { width: col.price.w, align: 'right' });

                doc.font('Helvetica-Bold').fillColor('#333333')
                    .text(rs(itemTotal), col.total.x, rowY + 8, { width: col.total.w, align: 'right' });

                // Bottom border
                doc.moveTo(M, rowY + rowH).lineTo(PW - M, rowY + rowH)
                    .strokeColor('#E8E8E8').lineWidth(0.3).stroke();

                rowY += rowH;
            });

            // ═════════════════════════════════════════════════════
            //  TOTALS SUMMARY
            // ═════════════════════════════════════════════════════
            const shippingCost = order.shippingMethod?.cost || 0;
            const discount = order.coupon?.discount || 0;
            const total = order.total || (subtotal + shippingCost - discount);

            const sumLabelW = 140;
            const sumValW = 90;
            const sumX = PW - M - sumLabelW - sumValW;
            let sumY = rowY + 16;

            // Helper to draw a summary row
            const drawSumRow = (label, value, opts = {}) => {
                const { bold, big, color } = opts;
                doc.fontSize(big ? 11 : 9.5)
                    .font(bold ? 'Helvetica-Bold' : 'Helvetica')
                    .fillColor(color || '#555555')
                    .text(label, sumX, sumY, { width: sumLabelW, align: 'right' });
                doc.fontSize(big ? 11 : 9.5)
                    .font(bold ? 'Helvetica-Bold' : 'Helvetica')
                    .fillColor(color || '#333333')
                    .text(value, sumX + sumLabelW, sumY, { width: sumValW, align: 'right' });
                sumY += big ? 20 : 16;
            };

            drawSumRow('Subtotal', rs(subtotal));

            const shipType = order.shippingMethod?.type || 'Standard';
            const shipVal = shippingCost === 0 ? 'Free' : rs(shippingCost);
            drawSumRow('Shipping (' + shipType + ')', shipVal);

            if (discount > 0) {
                const discLabel = 'Coupon' + (order.coupon?.code ? ' (' + order.coupon.code + ')' : '');
                drawSumRow(discLabel, '- ' + rs(discount), { color: '#16a34a' });
            }

            // Divider before total
            sumY += 2;
            doc.moveTo(sumX, sumY).lineTo(sumX + sumLabelW + sumValW, sumY)
                .strokeColor('#CCCCCC').lineWidth(0.5).stroke();
            sumY += 10;

            drawSumRow('Total', rs(total), { bold: true, big: true, color: brand });

            // ═════════════════════════════════════════════════════
            //  FOOTER
            // ═════════════════════════════════════════════════════
            const footY = Math.max(sumY + 40, 700);

            doc.moveTo(M, footY).lineTo(PW - M, footY)
                .strokeColor('#E0E0E0').lineWidth(0.3).stroke();

            doc.fontSize(8).font('Helvetica').fillColor('#AAAAAA')
                .text('Thank you for your order!', M, footY + 10, { width: CW, align: 'center' })
                .text('Nisarg Maitri  |  Eco-Friendly Products  |  nisargmaitri.com', M, footY + 22, { width: CW, align: 'center' })
                .text('This is a computer-generated invoice.', M, footY + 34, { width: CW, align: 'center' });

            doc.end();
        } catch (error) {
            console.error('Error generating invoice PDF:', error.message);
            reject(error);
        }
    });
};

module.exports = { generateInvoicePDF };
