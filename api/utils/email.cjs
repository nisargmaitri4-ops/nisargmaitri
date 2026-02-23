const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development',
});

const generateOrderEmail = (order) => {
  // Enhanced validation with more specific error messages
  if (!order) {
    console.error('Order object is null or undefined');
    throw new Error('Order object is required');
  }

  const requiredFields = ['orderId', 'customer', 'items', 'shippingAddress', 'shippingMethod'];
  const missingFields = requiredFields.filter(field => !order[field]);

  if (missingFields.length > 0) {
    console.error('Missing required order fields:', missingFields, { order });
    throw new Error(`Missing required order fields: ${missingFields.join(', ')}`);
  }

  // Validate customer object
  if (!order.customer.firstName || !order.customer.lastName) {
    console.error('Invalid customer data - missing name fields', { customer: order.customer });
    throw new Error('Customer first name and last name are required');
  }

  // Validate items array
  if (!Array.isArray(order.items) || order.items.length === 0) {
    console.error('Invalid items data - must be non-empty array', { items: order.items });
    throw new Error('Order must contain at least one item');
  }

  // Validate each item
  order.items.forEach((item, index) => {
    if (!item.name || typeof item.quantity !== 'number' || typeof item.price !== 'number') {
      console.error(`Invalid item at index ${index}:`, item);
      throw new Error(`Item at index ${index} is missing required fields (name, quantity, price)`);
    }
  });

  // Safe value extraction with defaults
  const safeGet = (obj, path, defaultValue = '') => {
    try {
      return path.split('.').reduce((current, key) => current && current[key], obj) || defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // Format the order date — use createdAt (Mongoose timestamp), fallback to current date
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    : new Date().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  // Enhanced items list generation
  const itemsRows = order.items
    .map((item, index) => {
      try {
        const itemTotal = (item.quantity * item.price).toFixed(2);
        return `
          <tr>
            <td style="border-bottom: 1px solid #e8e8e8; padding: 14px 12px; text-align: left; font-size: 14px; color: #333;">${item.name || 'Unknown Item'}${item.variant ? `<br><span style="font-size: 12px; color: #888;">${item.variant}</span>` : ''}</td>
            <td style="border-bottom: 1px solid #e8e8e8; padding: 14px 12px; text-align: center; font-size: 14px; color: #555;">${item.quantity || 0}</td>
            <td style="border-bottom: 1px solid #e8e8e8; padding: 14px 12px; text-align: right; font-size: 14px; color: #555;">₹${(item.price || 0).toFixed(2)}</td>
            <td style="border-bottom: 1px solid #e8e8e8; padding: 14px 12px; text-align: right; font-size: 14px; font-weight: 600; color: #333;">₹${itemTotal}</td>
          </tr>
        `;
      } catch (error) {
        console.error(`Error processing item at index ${index}:`, error, item);
        return `
          <tr>
            <td colspan="4" style="border-bottom: 1px solid #e8e8e8; padding: 14px 12px; color: #dc2626; text-align: center; font-size: 13px;">
              Error displaying item details
            </td>
          </tr>
        `;
      }
    })
    .join('');

  // Calculate totals with error handling
  const calculateSubtotal = () => {
    try {
      return order.items.reduce((sum, item) => {
        const itemTotal = (item.quantity || 0) * (item.price || 0);
        return sum + itemTotal;
      }, 0);
    } catch (error) {
      console.error('Error calculating subtotal:', error);
      return 0;
    }
  };

  const subtotal = calculateSubtotal();
  const shippingCost = safeGet(order, 'shippingMethod.cost', 0);
  const discount = safeGet(order, 'coupon.discount', 0);
  const total = order.total || (subtotal + shippingCost - discount);

  // Payment method display — show Razorpay's actual method if available
  const paymentMethodDisplay = order.razorpayMethod
    ? `${order.razorpayMethod} (Online)`
    : safeGet(order, 'paymentMethod', 'N/A');

  // Payment status color
  const paymentStatusColor = order.paymentStatus === 'Success' ? '#16a34a' : '#d97706';

  // Premium HTML email template
  const html = `
    <div style="font-family: 'Segoe UI', Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f4f7f5;">
      
      <!-- Main Card -->
      <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); margin: 20px;">
        
        <!-- Top Brand Bar -->
        <div style="background: linear-gradient(135deg, #1a3329, #2c5f41); padding: 28px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">NISARG MAITRI</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase;">Eco-Friendly Products</p>
        </div>

        <!-- Status Badge -->
        <div style="text-align: center; padding: 28px 30px 0;">
          <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 50px; padding: 8px 24px;">
            <span style="color: #065f46; font-size: 13px; font-weight: 600; letter-spacing: 0.3px;">✓ ORDER CONFIRMED</span>
          </div>
          <p style="color: #9ca3af; margin: 12px 0 0; font-size: 13px;">Order #${order.orderId}</p>
        </div>

        <!-- Greeting -->
        <div style="padding: 24px 30px 0;">
          <p style="font-size: 15px; color: #374151; margin: 0 0 6px;">Dear <strong>${order.customer.firstName} ${order.customer.lastName}</strong>,</p>
          <p style="font-size: 14px; color: #6b7280; margin: 0; line-height: 1.6;">
            Thank you for your order! We're preparing your items and will notify you once they're shipped.
          </p>
        </div>

        <!-- Order Details Card -->
        <div style="padding: 20px 30px;">
          <div style="background-color: #f8faf9; padding: 20px; border-radius: 10px; border-left: 4px solid #2c5f41;">
            <h3 style="color: #1a3329; margin: 0 0 14px; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Order Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; font-size: 13px; color: #6b7280; width: 130px;">Order ID</td>
                <td style="padding: 5px 0; font-size: 13px; color: #1f2937; font-weight: 600;">${order.orderId}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-size: 13px; color: #6b7280;">Date</td>
                <td style="padding: 5px 0; font-size: 13px; color: #1f2937; font-weight: 600;">${orderDate}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-size: 13px; color: #6b7280;">Payment</td>
                <td style="padding: 5px 0; font-size: 13px; color: #1f2937; font-weight: 600;">${paymentMethodDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-size: 13px; color: #6b7280;">Status</td>
                <td style="padding: 5px 0; font-size: 13px;">
                  <span style="display: inline-block; background-color: ${order.paymentStatus === 'Success' ? '#dcfce7' : '#fef3c7'}; color: ${paymentStatusColor}; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">${safeGet(order, 'paymentStatus', 'Pending')}</span>
                </td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Items Table -->
        <div style="padding: 0 30px 20px;">
          <h3 style="color: #1a3329; margin: 0 0 12px; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Items Ordered</h3>
          <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #1a3329;">
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #ffffff; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; color: #ffffff; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; color: #ffffff; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; color: #ffffff; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
              </tr>
            </thead>
            <tbody style="background-color: #ffffff;">
              ${itemsRows}
            </tbody>
          </table>
        </div>

        <!-- Pricing Summary -->
        <div style="padding: 0 30px 20px;">
          <div style="background-color: #f8faf9; padding: 18px 20px; border-radius: 10px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Subtotal</td>
                <td style="padding: 6px 0; font-size: 14px; color: #374151; text-align: right;">₹${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Shipping</td>
                <td style="padding: 6px 0; font-size: 14px; color: #374151; text-align: right;">${Number(shippingCost) === 0 ? '<span style="color: #16a34a; font-weight: 600;">FREE</span>' : '₹' + Number(shippingCost).toFixed(2)}</td>
              </tr>
              ${discount > 0 ? `
              <tr>
                <td style="padding: 6px 0; font-size: 14px; color: #16a34a;">Discount${order.coupon && order.coupon.code ? ` (${order.coupon.code})` : ''}</td>
                <td style="padding: 6px 0; font-size: 14px; color: #16a34a; text-align: right; font-weight: 600;">-₹${Number(discount).toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr>
                <td colspan="2" style="padding: 10px 0 0;"><hr style="border: none; border-top: 2px solid #d1d5db; margin: 0;"></td>
              </tr>
              <tr>
                <td style="padding: 10px 0 0; font-size: 18px; font-weight: 700; color: #1a3329;">Total</td>
                <td style="padding: 10px 0 0; font-size: 18px; font-weight: 700; color: #1a3329; text-align: right;">₹${Number(total).toFixed(2)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Shipping Address -->
        <div style="padding: 0 30px 20px;">
          <div style="background-color: #f8faf9; padding: 20px; border-radius: 10px; border-left: 4px solid #6b7280;">
            <h3 style="color: #374151; margin: 0 0 10px; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Shipping Address</h3>
            <p style="margin: 3px 0; font-size: 14px; color: #4b5563; line-height: 1.5;">
              ${safeGet(order, 'shippingAddress.address1', 'N/A')}${safeGet(order, 'shippingAddress.address2') ? ', ' + safeGet(order, 'shippingAddress.address2') : ''}<br>
              ${safeGet(order, 'shippingAddress.city', 'N/A')}, ${safeGet(order, 'shippingAddress.state', 'N/A')} ${safeGet(order, 'shippingAddress.pincode', 'N/A')}<br>
              ${safeGet(order, 'shippingAddress.country', 'India')}
            </p>
          </div>
        </div>

        <!-- Next Steps -->
        <div style="padding: 0 30px 24px;">
          <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); padding: 22px; border-radius: 10px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 15px; font-weight: 700; color: #065f46;">What's Next?</p>
            <p style="margin: 0; font-size: 13px; color: #047857; line-height: 1.5;">
              We'll send you a notification once your order is shipped.<br>
              You can expect delivery within 5-7 business days.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding: 20px 30px; text-align: center; background-color: #fafafa;">
          <p style="margin: 0; color: #1a3329; font-size: 13px; font-weight: 600;">Nisarg Maitri</p>
          <p style="margin: 4px 0 0; color: #9ca3af; font-size: 11px;">Eco-Friendly Products · Sustainable Living</p>
          <p style="margin: 10px 0 0; color: #9ca3af; font-size: 11px;">
            Questions? Reply to this email or write to ${process.env.SUPPORT_EMAIL || 'support@nisargmaitri.in'}
          </p>
        </div>

      </div>
    </div>
  `;

  console.log('Generated email content for orderId:', order.orderId, {
    htmlLength: html.length,
    itemCount: order.items.length,
    total: total
  });

  return html;
};

const sendEmail = async ({ email, subject, html, attachments }) => {
  // Enhanced parameter validation
  const errors = [];

  if (!email || typeof email !== 'string') {
    errors.push('email (valid email address)');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('email (valid format)');
  }

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    errors.push('subject (non-empty string)');
  }

  if (!html || typeof html !== 'string' || html.trim().length === 0) {
    errors.push('html (non-empty content)');
  }

  if (errors.length > 0) {
    const errorMessage = `Missing or invalid required fields: ${errors.join(', ')}`;
    console.error('Email validation failed:', {
      email,
      subject,
      htmlLength: html ? html.length : 0,
      errors
    });
    throw new Error(errorMessage);
  }

  // Verify transporter configuration
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configuration missing - check environment variables');
    throw new Error('Email service not configured properly');
  }

  const mailOptions = {
    from: `"Nisarg Maitri" <${process.env.EMAIL_USER}>`,
    to: email.trim(),
    subject: subject.trim(),
    html: html.trim(),
    ...(attachments && attachments.length > 0 && { attachments }),
  };


  try {
    console.log(`Attempting to send email to ${email} with subject: "${subject}"`);

    const info = await transporter.sendMail(mailOptions);

    console.log(`Email sent successfully to ${email}`, {
      messageId: info.messageId,
      response: info.response,
      subject: subject
    });

    return info;
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, {
      error: error.message,
      code: error.code,
      command: error.command,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Provide more specific error messages
    let errorMessage = 'Failed to send email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed - check credentials';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Failed to connect to email service';
    } else if (error.responseCode === 550) {
      errorMessage = 'Email address not found or rejected';
    } else {
      errorMessage = `Failed to send email: ${error.message}`;
    }

    throw new Error(errorMessage);
  }
};

const generateDeliveryEmail = (order) => {
  if (!order || !order.orderId || !order.customer) {
    throw new Error('Order data is required for delivery email');
  }

  const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
  const addr = [
    order.shippingAddress?.address1,
    order.shippingAddress?.address2,
    order.shippingAddress?.city,
    order.shippingAddress?.state,
    order.shippingAddress?.pincode,
  ].filter(Boolean).join(', ');

  const itemsRows = (order.items || []).map(item => `
    <tr>
      <td style="border: 1px solid #e0e0e0; padding: 10px; text-align: left;">${item.name || 'Item'}</td>
      <td style="border: 1px solid #e0e0e0; padding: 10px; text-align: center;">${item.quantity}</td>
      <td style="border: 1px solid #e0e0e0; padding: 10px; text-align: right;">₹${Number(item.price || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f7f5;">
      <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 25px; padding-top: 10px; border-top: 4px solid #2c5f41;">
          <h2 style="color: #2c5f41; margin: 15px 0 0; font-size: 24px;">Order Delivered</h2>
          <p style="color: #888; margin: 8px 0 0; font-size: 14px;">Order #${order.orderId}</p>
        </div>

        <!-- Message -->
        <p style="font-size: 15px; color: #333; margin-bottom: 5px;">Dear ${customerName},</p>
        <p style="font-size: 15px; color: #555; margin-bottom: 25px; line-height: 1.6;">
          Your order has been <strong style="color: #2c5f41;">successfully delivered</strong>. 
          We hope you enjoy your products from Nisarg Maitri.
        </p>

        <!-- Order Summary -->
        <div style="background-color: #f8faf9; padding: 18px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2c5f41;">
          <h3 style="color: #2c5f41; margin: 0 0 12px; font-size: 16px;">Order Summary</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Order ID:</strong> ${order.orderId}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Total:</strong> ₹${Number(order.total || 0).toFixed(2)}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Delivered to:</strong> ${addr || 'N/A'}</p>
        </div>

        <!-- Items -->
        <h3 style="color: #2c5f41; margin: 0 0 10px; font-size: 16px;">Items Delivered</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #2c5f41; color: white;">
              <th style="border: 1px solid #2c5f41; padding: 10px; text-align: left; font-size: 13px;">Product</th>
              <th style="border: 1px solid #2c5f41; padding: 10px; text-align: center; font-size: 13px;">Qty</th>
              <th style="border: 1px solid #2c5f41; padding: 10px; text-align: right; font-size: 13px;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- CTA -->
        <div style="text-align: center; padding: 20px; background-color: #f8faf9; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #2c5f41; font-weight: bold; font-size: 15px;">
            Thank you for choosing Nisarg Maitri
          </p>
          <p style="margin: 0; color: #666; font-size: 13px;">
            Your purchase supports sustainable and eco-friendly living.
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
          <p style="margin: 0; color: #aaa; font-size: 12px;">
            Nisarg Maitri | Eco-Friendly Products
          </p>
          <p style="margin: 5px 0 0; color: #aaa; font-size: 12px;">
            Questions? Reply to this email or write to ${process.env.SUPPORT_EMAIL || 'support@nisargmaitri.in'}
          </p>
        </div>
      </div>
    </div>
  `;
};

const generateCancellationEmail = (order) => {
  if (!order || !order.orderId || !order.customer) {
    throw new Error('Order data is required for cancellation email');
  }

  const customerName = `${order.customer.firstName} ${order.customer.lastName}`;

  const itemsRows = (order.items || []).map(item => `
    <tr>
      <td style="border: 1px solid #e0e0e0; padding: 10px; text-align: left;">${item.name || 'Item'}</td>
      <td style="border: 1px solid #e0e0e0; padding: 10px; text-align: center;">${item.quantity}</td>
      <td style="border: 1px solid #e0e0e0; padding: 10px; text-align: right;">₹${Number(item.price || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const isCOD = order.paymentMethod === 'COD';
  const refundNote = isCOD
    ? 'Since this was a Cash on Delivery order, no payment was charged.'
    : 'If any payment was made, it will be refunded to your original payment method within 5-7 business days.';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fdf4f4;">
      <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 25px; padding-top: 10px; border-top: 4px solid #dc2626;">
          <h2 style="color: #dc2626; margin: 15px 0 0; font-size: 24px;">Order Cancelled</h2>
          <p style="color: #888; margin: 8px 0 0; font-size: 14px;">Order #${order.orderId}</p>
        </div>

        <!-- Message -->
        <p style="font-size: 15px; color: #333; margin-bottom: 5px;">Dear ${customerName},</p>
        <p style="font-size: 15px; color: #555; margin-bottom: 25px; line-height: 1.6;">
          We regret to inform you that your order <strong>#${order.orderId}</strong> has been 
          <strong style="color: #dc2626;">cancelled</strong>. We apologize for any inconvenience.
        </p>

        <!-- Order Summary -->
        <div style="background-color: #fef8f8; padding: 18px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
          <h3 style="color: #b91c1c; margin: 0 0 12px; font-size: 16px;">Order Details</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Order ID:</strong> ${order.orderId}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Total:</strong> ₹${Number(order.total || 0).toFixed(2)}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}</p>
        </div>

        <!-- Items -->
        <h3 style="color: #b91c1c; margin: 0 0 10px; font-size: 16px;">Items in This Order</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #b91c1c; color: white;">
              <th style="border: 1px solid #b91c1c; padding: 10px; text-align: left; font-size: 13px;">Product</th>
              <th style="border: 1px solid #b91c1c; padding: 10px; text-align: center; font-size: 13px;">Qty</th>
              <th style="border: 1px solid #b91c1c; padding: 10px; text-align: right; font-size: 13px;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Refund Info -->
        <div style="padding: 18px; background-color: #fffbeb; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #d97706;">
          <h3 style="margin: 0 0 8px; color: #92400e; font-size: 14px;">Refund Information</h3>
          <p style="margin: 0; color: #78350f; font-size: 13px;">
            ${refundNote}
          </p>
        </div>

        <!-- CTA -->
        <div style="text-align: center; padding: 18px; background-color: #f8faf9; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #2c5f41; font-weight: bold; font-size: 14px;">
            We'd love to have you back
          </p>
          <p style="margin: 0; color: #666; font-size: 13px;">
            Visit <a href="https://nisargmaitri.in" style="color: #2c5f41; text-decoration: underline;">nisargmaitri.in</a> to explore our eco-friendly products.
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
          <p style="margin: 0; color: #aaa; font-size: 12px;">
            Nisarg Maitri | Eco-Friendly Products
          </p>
          <p style="margin: 5px 0 0; color: #aaa; font-size: 12px;">
            Questions? Reply to this email or write to ${process.env.SUPPORT_EMAIL || 'support@nisargmaitri.in'}
          </p>
        </div>
      </div>
    </div>
  `;
}; const generateAdminOrderNotificationEmail = (order) => {
  if (!order || !order.orderId || !order.customer) {
    throw new Error('Order data is required for admin notification email');
  }

  const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
  const addr = [
    order.shippingAddress?.address1,
    order.shippingAddress?.address2,
    order.shippingAddress?.city,
    order.shippingAddress?.state,
    order.shippingAddress?.pincode,
  ].filter(Boolean).join(', ');

  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const itemsRows = (order.items || []).map(item => `
    <tr>
      <td style="border: 1px solid #e0e0e0; padding: 10px; text-align: left; font-size: 14px;">${item.name || 'Item'}${item.variant ? ` (${item.variant})` : ''}</td>
      <td style="border: 1px solid #e0e0e0; padding: 10px; text-align: center; font-size: 14px;">${item.quantity}</td>
      <td style="border: 1px solid #e0e0e0; padding: 10px; text-align: right; font-size: 14px;">₹${Number(item.price || 0).toFixed(2)}</td>
      <td style="border: 1px solid #e0e0e0; padding: 10px; text-align: right; font-size: 14px; font-weight: 600;">₹${(item.quantity * item.price).toFixed(2)}</td>
    </tr>
  `).join('');

  const subtotal = (order.items || []).reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);
  const shipping = order.shippingMethod?.cost || 0;
  const discount = order.coupon?.discount || 0;
  const total = order.total || (subtotal + shipping - discount);

  const paymentMethod = order.razorpayMethod
    ? `${order.razorpayMethod} (Online)`
    : order.paymentMethod || 'N/A';

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f0f4f8;">
      <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin: 20px;">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a3329, #2c5f41); padding: 24px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">🛒 New Order Received!</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px;">${orderDate}</p>
        </div>

        <!-- Quick Summary -->
        <div style="padding: 24px 30px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; width: 130px;">Order ID</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 700;">${order.orderId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Customer</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Email</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1f2937;">${order.customer.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Phone</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1f2937;">${order.customer.phone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Payment</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600;">${paymentMethod}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Total</td>
              <td style="padding: 8px 0; font-size: 20px; color: #065f46; font-weight: 700;">₹${Number(total).toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <!-- Items -->
        <div style="padding: 0 30px 20px;">
          <h3 style="color: #1a3329; margin: 0 0 10px; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Items Ordered</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #1a3329; color: white;">
                <th style="padding: 10px; text-align: left; font-size: 12px;">Product</th>
                <th style="padding: 10px; text-align: center; font-size: 12px;">Qty</th>
                <th style="padding: 10px; text-align: right; font-size: 12px;">Price</th>
                <th style="padding: 10px; text-align: right; font-size: 12px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        </div>

        <!-- Pricing -->
        <div style="padding: 0 30px 20px;">
          <div style="background-color: #f8faf9; padding: 16px; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; font-size: 13px; color: #6b7280;">Subtotal</td>
                <td style="padding: 4px 0; font-size: 13px; text-align: right;">₹${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-size: 13px; color: #6b7280;">Shipping</td>
                <td style="padding: 4px 0; font-size: 13px; text-align: right;">${Number(shipping) === 0 ? '<span style="color:#16a34a;">FREE</span>' : '₹' + Number(shipping).toFixed(2)}</td>
              </tr>
              ${discount > 0 ? `<tr><td style="padding: 4px 0; font-size: 13px; color: #16a34a;">Discount${order.coupon?.code ? ` (${order.coupon.code})` : ''}</td><td style="padding: 4px 0; font-size: 13px; color: #16a34a; text-align: right;">-₹${Number(discount).toFixed(2)}</td></tr>` : ''}
            </table>
          </div>
        </div>

        <!-- Shipping Address -->
        <div style="padding: 0 30px 24px;">
          <div style="background-color: #f8faf9; padding: 16px; border-radius: 8px; border-left: 4px solid #6b7280;">
            <h4 style="margin: 0 0 8px; color: #374151; font-size: 14px;">Shipping Address</h4>
            <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.5;">${addr || 'N/A'}</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding: 16px 30px; text-align: center; background-color: #fafafa;">
          <p style="margin: 0; color: #9ca3af; font-size: 11px;">This is an automated notification from Nisarg Maitri</p>
        </div>
      </div>
    </div>
  `;
};

module.exports = { sendEmail, generateOrderEmail, generateDeliveryEmail, generateCancellationEmail, generateAdminOrderNotificationEmail };