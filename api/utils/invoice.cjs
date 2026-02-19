const PDFDocument = require('pdfkit');

/**
 * Generates a professional PDF invoice for an order.
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

            const primaryColor = '#1a3329';
            const accentColor = '#2c5f41';
            const lightGray = '#f8faf9';
            const textGray = '#555555';
            const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

            // ──────────── HEADER ────────────
            // Brand bar
            doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);

            doc.fontSize(24).font('Helvetica-Bold').fillColor('#ffffff')
                .text('NISARG MAITRI', 50, 30, { width: pageWidth });
            doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.7)')
                .text('Eco-Friendly Products · Sustainable Living', 50, 58, { width: pageWidth });

            // Invoice Title
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
                .text('TAX INVOICE', doc.page.width - 200, 35, { width: 150, align: 'right' });

            // ──────────── INVOICE META ────────────
            const metaY = 120;

            // Left: Invoice To
            doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor)
                .text('INVOICE TO', 50, metaY);
            doc.fontSize(10).font('Helvetica').fillColor(textGray)
                .text(`${order.customer.firstName} ${order.customer.lastName}`, 50, metaY + 16)
                .text(order.customer.email || '', 50, metaY + 30)
                .text(order.customer.phone || '', 50, metaY + 44);

            // Right: Invoice details
            doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor)
                .text('INVOICE DETAILS', doc.page.width - 250, metaY, { width: 200, align: 'right' });

            const orderDate = order.createdAt
                ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                })
                : new Date().toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                });

            const deliveryDate = new Date().toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric'
            });

            doc.fontSize(9).font('Helvetica').fillColor(textGray);
            const rightX = doc.page.width - 250;
            const labelWidth = 90;
            const valueWidth = 110;

            const metaRows = [
                ['Invoice No:', order.orderId],
                ['Order Date:', orderDate],
                ['Delivery Date:', deliveryDate],
                ['Payment:', order.razorpayMethod ? `${order.razorpayMethod} (Online)` : (order.paymentMethod || 'COD')],
            ];

            metaRows.forEach((row, i) => {
                const y = metaY + 16 + (i * 15);
                doc.font('Helvetica').fillColor('#888888')
                    .text(row[0], rightX, y, { width: labelWidth, align: 'right' });
                doc.font('Helvetica-Bold').fillColor('#333333')
                    .text(row[1], rightX + labelWidth + 5, y, { width: valueWidth, align: 'right' });
            });

            // ──────────── SHIPPING ADDRESS ────────────
            const addrY = metaY + 90;
            doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor)
                .text('SHIPPING ADDRESS', 50, addrY);
            doc.fontSize(9).font('Helvetica').fillColor(textGray);

            const addr = order.shippingAddress || {};
            const addrLines = [
                addr.address1,
                addr.address2,
                [addr.city, addr.state, addr.pincode].filter(Boolean).join(', '),
                addr.country || 'India',
            ].filter(Boolean);

            addrLines.forEach((line, i) => {
                doc.text(line, 50, addrY + 16 + (i * 14));
            });

            // GST Details (if present)
            if (order.gstDetails && order.gstDetails.gstNumber) {
                const gstY = addrY + 16 + (addrLines.length * 14) + 5;
                doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor)
                    .text('GSTIN:', 50, gstY);
                doc.font('Helvetica').fillColor(textGray)
                    .text(order.gstDetails.gstNumber, 90, gstY);
            }

            // ──────────── ITEMS TABLE ────────────
            const tableY = addrY + 16 + (addrLines.length * 14) + (order.gstDetails?.gstNumber ? 35 : 20);
            const colWidths = {
                sno: 30,
                product: pageWidth - 230,
                qty: 50,
                price: 70,
                total: 80,
            };

            // Table header
            doc.rect(50, tableY, pageWidth, 28).fill(primaryColor);

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
            let headerX = 50;
            doc.text('#', headerX + 8, tableY + 9, { width: colWidths.sno });
            headerX += colWidths.sno;
            doc.text('Product', headerX + 5, tableY + 9, { width: colWidths.product });
            headerX += colWidths.product;
            doc.text('Qty', headerX, tableY + 9, { width: colWidths.qty, align: 'center' });
            headerX += colWidths.qty;
            doc.text('Price', headerX, tableY + 9, { width: colWidths.price, align: 'right' });
            headerX += colWidths.price;
            doc.text('Total', headerX, tableY + 9, { width: colWidths.total, align: 'right' });

            // Table rows
            let rowY = tableY + 28;
            const items = order.items || [];
            let subtotal = 0;

            items.forEach((item, index) => {
                const itemTotal = (item.quantity || 0) * (item.price || 0);
                subtotal += itemTotal;

                // Alternate row background
                if (index % 2 === 0) {
                    doc.rect(50, rowY, pageWidth, 26).fill(lightGray);
                }

                doc.fontSize(9).font('Helvetica').fillColor('#333333');
                let cellX = 50;
                doc.text(`${index + 1}`, cellX + 8, rowY + 8, { width: colWidths.sno });
                cellX += colWidths.sno;

                const productName = item.variant
                    ? `${item.name} (${item.variant})`
                    : item.name || 'Product';
                doc.text(productName, cellX + 5, rowY + 8, { width: colWidths.product - 10 });
                cellX += colWidths.product;

                doc.text(`${item.quantity}`, cellX, rowY + 8, { width: colWidths.qty, align: 'center' });
                cellX += colWidths.qty;
                doc.text(`₹${(item.price || 0).toFixed(2)}`, cellX, rowY + 8, { width: colWidths.price, align: 'right' });
                cellX += colWidths.price;
                doc.font('Helvetica-Bold')
                    .text(`₹${itemTotal.toFixed(2)}`, cellX, rowY + 8, { width: colWidths.total, align: 'right' });

                rowY += 26;
            });

            // Bottom border
            doc.moveTo(50, rowY).lineTo(50 + pageWidth, rowY).strokeColor('#e0e0e0').lineWidth(1).stroke();

            // ──────────── TOTALS ────────────
            const totalsX = 50 + pageWidth - 220;
            const totalsLabelW = 120;
            const totalsValueW = 100;
            let totalsY = rowY + 15;

            const shippingCost = order.shippingMethod?.cost || 0;
            const discount = order.coupon?.discount || 0;
            const total = order.total || (subtotal + shippingCost - discount);

            // Subtotal
            doc.fontSize(10).font('Helvetica').fillColor(textGray)
                .text('Subtotal', totalsX, totalsY, { width: totalsLabelW, align: 'right' });
            doc.font('Helvetica').fillColor('#333333')
                .text(`₹${subtotal.toFixed(2)}`, totalsX + totalsLabelW, totalsY, { width: totalsValueW, align: 'right' });

            totalsY += 18;

            // Shipping
            doc.font('Helvetica').fillColor(textGray)
                .text('Shipping', totalsX, totalsY, { width: totalsLabelW, align: 'right' });
            doc.font('Helvetica').fillColor(shippingCost === 0 ? accentColor : '#333333')
                .text(shippingCost === 0 ? 'FREE' : `₹${Number(shippingCost).toFixed(2)}`, totalsX + totalsLabelW, totalsY, { width: totalsValueW, align: 'right' });

            totalsY += 18;

            // Discount
            if (discount > 0) {
                doc.font('Helvetica').fillColor(accentColor)
                    .text(`Discount${order.coupon?.code ? ` (${order.coupon.code})` : ''}`, totalsX, totalsY, { width: totalsLabelW, align: 'right' });
                doc.font('Helvetica-Bold').fillColor(accentColor)
                    .text(`-₹${Number(discount).toFixed(2)}`, totalsX + totalsLabelW, totalsY, { width: totalsValueW, align: 'right' });
                totalsY += 18;
            }

            // Divider line
            totalsY += 5;
            doc.moveTo(totalsX, totalsY).lineTo(totalsX + totalsLabelW + totalsValueW, totalsY)
                .strokeColor(accentColor).lineWidth(2).stroke();
            totalsY += 10;

            // Total
            doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor)
                .text('Total', totalsX, totalsY, { width: totalsLabelW, align: 'right' });
            doc.text(`₹${Number(total).toFixed(2)}`, totalsX + totalsLabelW, totalsY, { width: totalsValueW, align: 'right' });

            // ──────────── FOOTER ────────────
            const footerY = doc.page.height - 80;

            doc.moveTo(50, footerY).lineTo(50 + pageWidth, footerY)
                .strokeColor('#e0e0e0').lineWidth(0.5).stroke();

            doc.fontSize(8).font('Helvetica').fillColor('#aaaaaa')
                .text('This is a computer-generated invoice and does not require a signature.', 50, footerY + 12, { width: pageWidth, align: 'center' })
                .text(`Nisarg Maitri | Eco-Friendly Products | ${process.env.SUPPORT_EMAIL || 'support@nisargmaitri.in'}`, 50, footerY + 26, { width: pageWidth, align: 'center' });

            doc.end();
        } catch (error) {
            console.error('Error generating invoice PDF:', error.message);
            reject(error);
        }
    });
};

module.exports = { generateInvoicePDF };
