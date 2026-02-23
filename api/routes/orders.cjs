const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const sanitize = require('sanitize-html');
const Order = require('../models/Order.cjs');
const { authenticateAdmin } = require('../middleware/authenticateAdmin.cjs');
const { sendEmail, generateOrderEmail, generateDeliveryEmail, generateCancellationEmail, generateAdminOrderNotificationEmail } = require('../utils/email.cjs');
const { generateInvoicePDF } = require('../utils/invoice.cjs');

// Use VITE_ prefixed env var for Razorpay key ID (shared with frontend)
const razorpay = new Razorpay({
  key_id: process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const handleError = (res, error, message, status = 500) => {
  console.error(message, { message: error.message, stack: error.stack });
  res.status(status).json({ error: message, details: error.message });
};

// Helper to calculate shipping cost based on subtotal (updated logic)
const calculateShippingCost = (subtotal) => {
  if (subtotal >= 500) return 0; // Free shipping for orders ₹500 and above
  return 50; // ₹50 shipping for orders under ₹500
};

// Helper to validate and calculate order totals
const validateOrderTotals = (orderData) => {
  const subtotal = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const expectedShippingCost = calculateShippingCost(subtotal);
  let shippingCost = expectedShippingCost;
  let couponDiscount = 0;

  // Handle FREESHIPPING coupon
  if (orderData.coupon.code && orderData.coupon.code.toUpperCase() === 'FREESHIPPING') {
    couponDiscount = expectedShippingCost;
    shippingCost = 0;
  }

  const calculatedTotal = Math.max(1, subtotal + shippingCost - couponDiscount);

  return {
    subtotal,
    shippingCost,
    couponDiscount,
    calculatedTotal,
    expectedShippingCost,
  };
};

// Helper to check if order is within valid time window (30 minutes)
const isOrderValid = (createdAt) => {
  const ORDER_TIMEOUT_MINUTES = 30;
  const now = new Date();
  const orderAgeMinutes = (now - new Date(createdAt)) / (1000 * 60);
  return orderAgeMinutes <= ORDER_TIMEOUT_MINUTES;
};

// Input validation regex
const VALIDATION_REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[0-9]{10}$/,
  pincode: /^[0-9]{6}$/,
};

router.post('/', async (req, res) => {
  try {
    // Sanitize and validate input data
    const orderData = {
      ...req.body,
      customer: {
        firstName: sanitize(req.body.customer?.firstName || ''),
        lastName: sanitize(req.body.customer?.lastName || ''),
        email: sanitize(req.body.customer?.email || ''),
        phone: sanitize(req.body.customer?.phone || ''),
      },
      shippingAddress: {
        address1: sanitize(req.body.shippingAddress?.address1 || ''),
        address2: sanitize(req.body.shippingAddress?.address2 || ''),
        city: sanitize(req.body.shippingAddress?.city || ''),
        state: sanitize(req.body.shippingAddress?.state || ''),
        pincode: sanitize(req.body.shippingAddress?.pincode || ''),
        country: sanitize(req.body.shippingAddress?.country || 'India'),
      },
      coupon: {
        code: sanitize(req.body.coupon?.code || ''),
        discount: Number(req.body.coupon?.discount) || 0,
      },
      gstDetails: {
        gstNumber: sanitize(req.body.gstDetails?.gstNumber || ''),
        state: sanitize(req.body.gstDetails?.state || ''),
        city: sanitize(req.body.gstDetails?.city || ''),
      },
      items: req.body.items?.map((item) => ({
        productId: sanitize(item.productId || ''),
        name: sanitize(item.name || ''),
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        variant: sanitize(item.variant || ''),
      })),
      shippingMethod: {
        type: sanitize(req.body.shippingMethod?.type || 'Standard'),
        cost: Number(req.body.shippingMethod?.cost) || 0,
      },
      paymentMethod: sanitize(req.body.paymentMethod || 'COD'),
      total: Number(req.body.total) || 0,
    };

    // Validate required fields
    if (
      !orderData.customer.firstName ||
      !orderData.customer.lastName ||
      !orderData.customer.email ||
      !orderData.customer.phone ||
      !orderData.shippingAddress.address1 ||
      !orderData.shippingAddress.city ||
      !orderData.shippingAddress.state ||
      !orderData.shippingAddress.pincode ||
      !orderData.items?.length ||
      !orderData.total ||
      !orderData.paymentMethod
    ) {
      console.warn('Missing required fields:', Object.keys(orderData));
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Additional input validation
    if (!VALIDATION_REGEX.email.test(orderData.customer.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!VALIDATION_REGEX.phone.test(orderData.customer.phone)) {
      return res.status(400).json({ error: 'Invalid phone number (must be 10 digits)' });
    }
    if (!VALIDATION_REGEX.pincode.test(orderData.shippingAddress.pincode)) {
      return res.status(400).json({ error: 'Invalid pincode (must be 6 digits)' });
    }
    if (orderData.items.some((item) => item.quantity < 1 || item.price < 0)) {
      return res.status(400).json({ error: 'Invalid item quantity or price' });
    }
    if (orderData.gstDetails.gstNumber && (!orderData.gstDetails.state || !orderData.gstDetails.city)) {
      return res.status(400).json({ error: 'GST state and city are required when GST number is provided' });
    }

    const validPaymentMethods = ['COD', 'Razorpay'];
    if (!validPaymentMethods.includes(orderData.paymentMethod)) {
      console.warn(`Invalid payment method: ${orderData.paymentMethod}`);
      return res.status(400).json({
        error: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`,
      });
    }

    // Validate order totals
    const totals = validateOrderTotals(orderData);

    // Validate coupon and shipping cost
    if (orderData.coupon.code) {
      if (orderData.coupon.code.toUpperCase() === 'FREESHIPPING') {
        if (orderData.shippingMethod.cost !== 0) {
          console.warn(`Invalid shipping cost for FREESHIPPING coupon: received ${orderData.shippingMethod.cost}, expected 0`);
          return res.status(400).json({
            error: `Invalid shipping cost for FREESHIPPING coupon: expected ₹0, received ₹${orderData.shippingMethod.cost}`,
          });
        }
        orderData.coupon.discount = totals.couponDiscount;
      } else {
        console.warn(`Invalid coupon code: ${orderData.coupon.code}`);
        orderData.coupon.code = '';
        orderData.coupon.discount = 0;
        if (orderData.shippingMethod.cost !== totals.expectedShippingCost) {
          return res.status(400).json({
            error: `Invalid shipping cost for no coupon: expected ₹${totals.expectedShippingCost}, received ₹${orderData.shippingMethod.cost}`,
          });
        }
      }
    } else {
      if (orderData.shippingMethod.cost !== totals.expectedShippingCost) {
        console.warn(`Invalid shipping cost: received ${orderData.shippingMethod.cost}, expected ${totals.expectedShippingCost}`);
        return res.status(400).json({
          error: `Invalid shipping cost: expected ₹${totals.expectedShippingCost}, received ₹${orderData.shippingMethod.cost}`,
        });
      }
      orderData.coupon.discount = 0;
    }

    // Validate total
    if (Math.abs(totals.calculatedTotal - orderData.total) > 0.01) {
      console.warn(`Total mismatch: received ${orderData.total}, calculated ${totals.calculatedTotal}`, {
        subtotal: totals.subtotal,
        shippingCost: totals.shippingCost,
        couponDiscount: totals.couponDiscount,
        items: orderData.items,
      });
      return res.status(400).json({
        error: `Invalid total: expected ₹${totals.calculatedTotal}, received ₹${orderData.total}`,
      });
    }

    // Generate unique order ID
    const orderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Set initial payment status
    const initialPaymentStatus = orderData.paymentMethod === 'COD' ? 'Success' : 'Pending';

    // COD orders are confirmed immediately; Razorpay orders stay Pending until payment succeeds
    const initialOrderStatus = orderData.paymentMethod === 'COD' ? 'Confirmed' : 'Pending';

    const order = new Order({
      ...orderData,
      orderId,
      paymentStatus: initialPaymentStatus,
      orderStatus: initialOrderStatus,
      emailSent: false,
      createdAt: new Date(),
    });

    await order.save();
    console.log(`${orderData.paymentMethod} order created: ${orderId}`, {
      customerEmail: order.customer.email.replace(/(.{2}).*@/, '$1***@'),
      subtotal: totals.subtotal,
      shippingCost: totals.shippingCost,
      couponDiscount: totals.couponDiscount,
      total: orderData.total,
      paymentStatus: initialPaymentStatus,
    });

    // Send email for COD orders
    if (orderData.paymentMethod === 'COD') {
      try {
        const html = await generateOrderEmail({
          ...order.toObject(),
          createdAt: order.createdAt.toISOString().split('T')[0],
        });
        await sendEmail({
          email: order.customer.email,
          subject: `Order Confirmation - ${order.orderId}`,
          html,
        });
        order.emailSent = true;
        await order.save();
        console.log(`Confirmation email sent for COD order: ${orderId}`);
      } catch (emailError) {
        console.error(`Failed to send email for COD order ${orderId}:`, emailError.message);
      }

      // Send admin notification email
      try {
        const adminEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;
        if (adminEmail) {
          const adminHtml = generateAdminOrderNotificationEmail(order.toObject());
          await sendEmail({
            email: adminEmail,
            subject: `🛒 New Order - ${order.orderId} | ₹${order.total}`,
            html: adminHtml,
          });
          console.log(`Admin notification sent for COD order: ${orderId}`);
        }
      } catch (adminEmailError) {
        console.error(`Failed to send admin notification for COD order ${orderId}:`, adminEmailError.message);
      }
    }

    return res.status(201).json({ order });
  } catch (error) {
    if (error.code === 11000) {
      return handleError(res, error, 'Duplicate order ID', 400);
    }
    if (error.name === 'ValidationError') {
      return handleError(res, error, 'Validation error', 400);
    }
    handleError(res, error, 'Failed to process order');
  }
});

router.post('/initiate-razorpay-payment', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      console.warn('Missing orderId for Razorpay payment:', req.body);
      return res.status(400).json({ error: 'Missing orderId' });
    }

    // Fetch order
    const order = await Order.findOne({
      orderId,
      paymentStatus: 'Pending',
      paymentMethod: 'Razorpay',
    });

    if (!order) {
      console.warn(`Order not found or invalid for orderId: ${orderId}`);
      return res.status(404).json({ error: 'Order not found or not in pending state' });
    }

    // Check order timeout
    if (!isOrderValid(order.createdAt)) {
      console.warn(`Order timed out for orderId: ${orderId}`);
      return res.status(400).json({ error: 'Order has expired. Please create a new order.' });
    }

    // Validate order totals
    const totals = validateOrderTotals(order);

    // Verify shipping cost and coupon
    let validationError = null;
    if (order.coupon.code && order.coupon.code.toUpperCase() === 'FREESHIPPING') {
      if (order.shippingMethod.cost !== 0) {
        validationError = `Invalid shipping cost for FREESHIPPING coupon: expected ₹0, received ₹${order.shippingMethod.cost}`;
      }
    } else if (order.shippingMethod.cost !== totals.expectedShippingCost) {
      validationError = `Invalid shipping cost: expected ₹${totals.expectedShippingCost}, received ₹${order.shippingMethod.cost}`;
    }

    if (validationError) {
      console.warn(`Validation error in Razorpay initiation: ${validationError}`);
      return res.status(400).json({ error: validationError });
    }

    // Verify total
    if (Math.abs(totals.calculatedTotal - order.total) > 0.01) {
      console.warn(`Total mismatch in Razorpay initiation: stored ${order.total}, calculated ${totals.calculatedTotal}`, {
        orderId,
        subtotal: totals.subtotal,
        shippingCost: totals.shippingCost,
        couponDiscount: totals.couponDiscount,
        items: order.items,
      });
      return res.status(400).json({
        error: `Invalid order total: expected ₹${totals.calculatedTotal}, received ₹${order.total}`,
      });
    }

    // Calculate amount in paise
    const amount = Math.max(100, Math.round(order.total * 100));
    const currency = 'INR';
    const receipt = orderId;

    // Create Razorpay order
    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount,
        currency,
        receipt,
        notes: {
          orderId,
          customerEmail: order.customer.email,
          customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        },
      });
    } catch (razorpayError) {
      console.error(`Razorpay API error for orderId: ${orderId}`, razorpayError);
      return res.status(500).json({ error: 'Failed to create Razorpay order due to payment gateway issue' });
    }

    if (!razorpayOrder.id) {
      console.error(`Failed to create Razorpay order for orderId: ${orderId}`);
      return res.status(500).json({ error: 'Failed to create Razorpay order' });
    }

    // Store razorpayOrderId
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    console.log(`Razorpay order created for orderId: ${orderId}, razorpayOrderId: ${razorpayOrder.id}`, {
      amount: order.total,
      couponCode: order.coupon.code,
      couponDiscount: totals.couponDiscount,
    });

    res.status(200).json({
      razorpayOrderId: razorpayOrder.id,
      keyId: process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      orderData: {
        orderId: order.orderId,
        amount: order.total,
        customer: {
          name: `${order.customer.firstName} ${order.customer.lastName}`,
          email: order.customer.email,
          contact: order.customer.phone,
        },
      },
    });
  } catch (error) {
    handleError(res, error, 'Failed to initiate Razorpay payment');
  }
});

router.post('/verify-razorpay-payment', async (req, res) => {
  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      console.warn('Missing required fields for Razorpay verification:', {
        orderId: !!orderId,
        razorpay_payment_id: !!razorpay_payment_id,
        razorpay_order_id: !!razorpay_order_id,
        razorpay_signature: !!razorpay_signature,
      });
      return res.status(400).json({ error: 'Missing required fields for payment verification' });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.warn(`Invalid Razorpay signature for orderId: ${orderId}`, {
        expected: generatedSignature,
        received: razorpay_signature,
      });
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Find and verify order
    const order = await Order.findOne({ orderId });
    if (!order) {
      console.warn(`Order not found for orderId: ${orderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify order eligibility
    if (order.paymentMethod !== 'Razorpay') {
      console.warn(`Invalid payment method for verification: ${order.paymentMethod} for orderId: ${orderId}`);
      return res.status(400).json({ error: 'Invalid payment method for this order' });
    }

    if (order.paymentStatus === 'Success') {
      console.warn(`Order already processed for orderId: ${orderId}`);
      return res.status(400).json({ error: 'Order already processed' });
    }

    if (order.razorpayOrderId !== razorpay_order_id) {
      console.warn(`Razorpay order ID mismatch for orderId: ${orderId}`, {
        stored: order.razorpayOrderId,
        received: razorpay_order_id,
      });
      return res.status(400).json({ error: 'Razorpay order ID mismatch' });
    }

    // Check order timeout
    if (!isOrderValid(order.createdAt)) {
      console.warn(`Order timed out for orderId: ${orderId}`);
      return res.status(400).json({ error: 'Order has expired. Please create a new order.' });
    }

    // Update order
    order.razorpayPaymentId = razorpay_payment_id;
    order.paymentStatus = 'Success';
    order.orderStatus = 'Confirmed'; // Payment succeeded → confirm the order

    // Fetch actual payment method from Razorpay (UPI / Card / Net Banking / Wallet)
    try {
      const rpPayment = await razorpay.payments.fetch(razorpay_payment_id);
      if (rpPayment && rpPayment.method) {
        const methodMap = {
          upi: 'UPI',
          card: rpPayment.card ? (rpPayment.card.network || 'Card') : 'Card',
          netbanking: 'Net Banking',
          wallet: rpPayment.wallet || 'Wallet',
          emi: 'EMI',
          bank_transfer: 'Bank Transfer',
          paylater: 'Pay Later',
        };
        order.razorpayMethod = methodMap[rpPayment.method] || rpPayment.method;
      }
    } catch (fetchErr) {
      console.warn(`Could not fetch Razorpay payment method for ${razorpay_payment_id}:`, fetchErr.message);
      // Non-critical — order still succeeds, method just stays empty
    }

    // Save order
    await order.save();

    console.log(`Razorpay payment verified and order updated: ${orderId}`, {
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      customerEmail: order.customer.email.replace(/(.{2}).*@/, '$1***@'),
      total: order.total,
    });

    // Send confirmation email
    if (!order.emailSent) {
      try {
        const html = await generateOrderEmail({
          ...order.toObject(),
          createdAt: order.createdAt.toISOString().split('T')[0],
        });
        await sendEmail({
          email: order.customer.email,
          subject: `Order Confirmation - ${order.orderId}`,
          html,
        });
        order.emailSent = true;
        await order.save();
        console.log(`Confirmation email sent for Razorpay order: ${orderId}`);
      } catch (emailError) {
        console.error(`Failed to send email for Razorpay order ${orderId}:`, emailError.message);
      }

      // Send admin notification email
      try {
        const adminEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;
        if (adminEmail) {
          const adminHtml = generateAdminOrderNotificationEmail(order.toObject());
          await sendEmail({
            email: adminEmail,
            subject: `🛒 New Order - ${order.orderId} | ₹${order.total}`,
            html: adminHtml,
          });
          console.log(`Admin notification sent for Razorpay order: ${orderId}`);
        }
      } catch (adminEmailError) {
        console.error(`Failed to send admin notification for Razorpay order ${orderId}:`, adminEmailError.message);
      }
    }

    res.status(200).json({
      success: true,
      order: {
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        razorpayPaymentId: order.razorpayPaymentId,
        razorpayOrderId: order.razorpayOrderId,
        total: order.total,
        customer: order.customer,
        shippingAddress: order.shippingAddress,
        items: order.items,
        shippingMethod: order.shippingMethod,
        coupon: order.coupon,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    handleError(res, error, 'Failed to verify Razorpay payment');
  }
});

router.get('/pending', authenticateAdmin, async (req, res) => {
  try {
    const pendingOrders = await Order.find({
      paymentStatus: 'Pending',
      paymentMethod: 'Razorpay',
    }).sort({ createdAt: -1 });

    console.log(`Fetched ${pendingOrders.length} pending Razorpay orders`);
    res.status(200).json(pendingOrders);
  } catch (error) {
    handleError(res, error, 'Failed to fetch pending orders');
  }
});

router.get('/pending/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      return res.status(400).json({ error: 'Invalid orderId' });
    }

    const order = await Order.findOne({
      orderId,
      paymentStatus: 'Pending',
      paymentMethod: 'Razorpay',
    });

    if (!order) {
      console.warn(`Pending order not found for orderId: ${orderId}`);
      return res.status(404).json({ error: 'Pending order not found' });
    }

    console.log(`Fetched pending order: ${orderId}`);
    res.status(200).json(order);
  } catch (error) {
    handleError(res, error, 'Failed to fetch pending order');
  }
});

router.delete('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      return res.status(400).json({ error: 'Invalid orderId' });
    }

    const order = await Order.findOne({
      orderId,
      paymentStatus: 'Pending',
      paymentMethod: 'Razorpay',
    });

    if (!order) {
      console.warn(`Pending order not found for cancellation: ${orderId}`);
      return res.status(404).json({ error: 'Pending order not found' });
    }

    await Order.deleteOne({ orderId });
    console.log(`Cancelled pending order: ${orderId}`);
    res.status(200).json({ success: true });
  } catch (error) {
    handleError(res, error, 'Failed to cancel pending order');
  }
});

router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { date, orderId } = req.query;
    const query = { paymentStatus: 'Success' };

    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    if (orderId) {
      if (typeof orderId !== 'string' || orderId.trim() === '') {
        return res.status(400).json({ error: 'Invalid orderId' });
      }
      query.orderId = { $regex: orderId.trim(), $options: 'i' };
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    console.log(`Fetched ${orders.length} successful orders with query:`, JSON.stringify(query));
    res.status(200).json(orders);
  } catch (error) {
    handleError(res, error, 'Failed to fetch orders');
  }
});

router.get('/debug/:orderId', authenticateAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      return res.status(400).json({ error: 'Invalid orderId' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      console.warn(`Order not found for debug: ${orderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log(`Fetched order for debug: ${orderId}`, {
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      total: order.total,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
    });
    res.status(200).json(order);
  } catch (error) {
    handleError(res, error, 'Failed to fetch order for debug');
  }
});

router.post('/force-update/:orderId', authenticateAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      return res.status(400).json({ error: 'Invalid orderId' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      console.warn(`Order not found for force update: ${orderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentStatus === 'Success') {
      console.warn(`Order already successful for force update: ${orderId}`);
      return res.status(400).json({ error: 'Order already processed' });
    }

    order.paymentStatus = 'Success';
    if (!order.emailSent) {
      try {
        const html = await generateOrderEmail({
          ...order.toObject(),
          createdAt: order.createdAt.toISOString().split('T')[0],
        });
        await sendEmail({
          email: order.customer.email,
          subject: `Order Confirmation - ${order.orderId}`,
          html,
        });
        order.emailSent = true;
      } catch (emailError) {
        console.error(`Failed to send email for force updated order ${orderId}:`, emailError.message);
      }

      // Send admin notification email
      try {
        const adminEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;
        if (adminEmail) {
          const adminHtml = generateAdminOrderNotificationEmail(order.toObject());
          await sendEmail({
            email: adminEmail,
            subject: `🛒 New Order - ${order.orderId} | ₹${order.total}`,
            html: adminHtml,
          });
          console.log(`Admin notification sent for force-updated order: ${orderId}`);
        }
      } catch (adminEmailError) {
        console.error(`Failed to send admin notification for force-updated order ${orderId}:`, adminEmailError.message);
      }
    }

    await order.save();
    console.log(`Force updated order to Success: ${orderId}`);
    res.status(200).json({ success: true, order });
  } catch (error) {
    handleError(res, error, 'Failed to force update order');
  }
});

// ── Update order status (admin only) ──
router.put('/:orderId/status', authenticateAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus } = req.body;

    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      return res.status(400).json({ error: 'Invalid orderId' });
    }

    const validStatuses = ['Confirmed', 'Delivered', 'Cancelled'];
    if (!orderStatus || !validStatuses.includes(orderStatus)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findOne({ orderId, paymentStatus: 'Success' });
    if (!order) {
      return res.status(404).json({ error: 'Order not found or payment not completed' });
    }

    if (order.orderStatus === 'Delivered') {
      return res.status(400).json({ error: 'Delivered orders cannot be updated' });
    }
    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({ error: 'Cancelled orders cannot be updated' });
    }

    order.orderStatus = orderStatus;
    await order.save();

    console.log(`Order status updated: ${orderId} → ${orderStatus}`);

    // Send delivery confirmation email with invoice PDF when marked as Delivered
    if (orderStatus === 'Delivered' && order.customer?.email) {
      try {
        const html = generateDeliveryEmail(order.toObject());

        // Generate invoice PDF
        let attachments = [];
        try {
          const invoiceBuffer = await generateInvoicePDF(order.toObject());
          attachments = [{
            filename: `Invoice-${order.orderId}.pdf`,
            content: invoiceBuffer,
            contentType: 'application/pdf',
          }];
          console.log(`Invoice PDF generated for order: ${orderId} (${(invoiceBuffer.length / 1024).toFixed(1)} KB)`);
        } catch (pdfError) {
          console.error(`Failed to generate invoice PDF for ${orderId}:`, pdfError.message);
          // Continue sending email without attachment
        }

        await sendEmail({
          email: order.customer.email,
          subject: `Order Delivered - ${order.orderId} | Nisarg Maitri`,
          html,
          attachments,
        });
        console.log(`Delivery email with invoice sent for order: ${orderId} to ${order.customer.email.replace(/(.{2}).*@/, '$1***@')}`);
      } catch (emailError) {
        console.error(`Failed to send delivery email for ${orderId}:`, emailError.message);
      }
    }

    // Send cancellation email when marked as Cancelled
    if (orderStatus === 'Cancelled' && order.customer?.email) {
      try {
        const html = generateCancellationEmail(order.toObject());
        await sendEmail({
          email: order.customer.email,
          subject: `Order Cancelled - ${order.orderId} | Nisarg Maitri`,
          html,
        });
        console.log(`Cancellation email sent for order: ${orderId} to ${order.customer.email.replace(/(.{2}).*@/, '$1***@')}`);
      } catch (emailError) {
        console.error(`Failed to send cancellation email for ${orderId}:`, emailError.message);
      }
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    handleError(res, error, 'Failed to update order status');
  }
});

function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = router;