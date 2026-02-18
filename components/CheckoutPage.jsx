import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Footer from "../components/Footer"; // Adjust path as needed

// Use config or fallback - empty string for same-domain deployment
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) return ""; // Same domain in production
  return "http://localhost:5001";
};

// Utility for API retries with exponential backoff
const withRetry = async (fn, retries = 3, delay = 6000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1)
        throw new Error(
          `API call failed after ${retries} retries: ${error.message}`,
        );
      console.warn(`Retry ${i + 1}/${retries} failed: ${error.message}`);
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, i)),
      );
    }
  }
};

// Input sanitization to prevent XSS
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  const div = document.createElement("div");
  div.textContent = input.trim();
  return div.innerHTML;
};

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    cartItems = [],
    step: initialStep = 1,
    order: initialOrder = null,
  } = location.state || {};

  const [step, setStep] = useState(initialStep);
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    customer: { firstName: "", lastName: "", email: "", phone: "" },
    shippingAddress: {
      address1: "",
      address2: "",
      city: "",
      state: "Uttar Pradesh",
      pincode: "201310",
      country: "India",
    },
    shippingMethod: { type: "Standard", cost: 50 },
    coupon: { code: "", discount: 0 },
    gstDetails: {
      gstNumber: "",
      state: "Uttar Pradesh",
      city: "Gautam Buddha Nagar",
    },
    paymentMethod: "COD",
  });
  const [stateSearch, setStateSearch] = useState(
    formData.shippingAddress.state,
  );
  const [showStateSuggestions, setShowStateSuggestions] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const token = localStorage.getItem("token");
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  // Calculate shipping cost based on backend logic
  const calculateShippingCost = (subtotal) => {
    if (subtotal >= 500) return 0; // Free shipping for orders ₹500 and above
    return 50; // ₹50 shipping for orders under ₹500
  };

  // Update shipping cost and coupon discount
  useEffect(() => {
    const originalShippingCost = calculateShippingCost(subtotal);
    const shippingCost =
      formData.coupon.code.toUpperCase() === "FREESHIPPING"
        ? 0
        : originalShippingCost;
    const couponDiscount =
      formData.coupon.code.toUpperCase() === "FREESHIPPING"
        ? originalShippingCost
        : 0;

    setFormData((prev) => ({
      ...prev,
      shippingMethod: { ...prev.shippingMethod, cost: shippingCost },
      coupon: { ...prev.coupon, discount: couponDiscount },
    }));
  }, [subtotal, formData.coupon.code]);

  // Calculate total with minimum of ₹1
  const total = useMemo(
    () =>
      Math.max(
        1,
        subtotal + formData.shippingMethod.cost - formData.coupon.discount,
      ),
    [subtotal, formData.shippingMethod.cost, formData.coupon.discount],
  );

  const stableNavigate = useCallback(
    (path, options) => navigate(path, options),
    [navigate],
  );

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleApiError = (error, operation) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.error ||
      `Failed to ${operation}. Please try again later.`;
    console.error(`${operation} error:`, {
      status,
      message,
      data: error.response?.data,
      errorMessage: error.message,
    });

    if (status === 401 || status === 403) {
      setError("Session expired or unauthorized. Please log in again.");
      localStorage.removeItem("token");
      localStorage.removeItem("isAdmin");
      localStorage.removeItem("userName");
      stableNavigate("/login");
    } else {
      setError(message);
    }
    return { isCsrfError: false, message };
  };

  // Check for pending transactions and redirect if cart is empty
  useEffect(() => {
    if (!cartItems.length && (step !== 3 || !order)) {
      stableNavigate("/shop", { replace: true });
    }
    const pendingTransaction = JSON.parse(
      localStorage.getItem("pendingTransaction"),
    );
    if (pendingTransaction && step === 2) {
      setPendingOrderId(pendingTransaction.orderId);
      setError(
        "A pending payment was detected. Please complete, retry, or cancel the payment.",
      );
    }
  }, [cartItems, stableNavigate, step, order]);

  // Scroll to error message when set
  useEffect(() => {
    if (error) scrollToSection("error-message");
  }, [error]);

  // Load Razorpay SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      console.log("Razorpay SDK loaded successfully");
      setRazorpayLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load Razorpay SDK");
      setError(
        "Failed to load payment system. Please select Cash on Delivery.",
      );
    };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError("");
    const sanitizedValue = sanitizeInput(value);
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: sanitizedValue },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
    }
  };

  const applyCoupon = async () => {
    setCouponLoading(true);
    setError("");
    const couponCode = sanitizeInput(formData.coupon.code).toUpperCase();
    const originalShippingCost = calculateShippingCost(subtotal);

    if (couponCode === "FREESHIPPING") {
      setFormData((prev) => ({
        ...prev,
        shippingMethod: { ...prev.shippingMethod, cost: 0 },
        coupon: { code: "FREESHIPPING", discount: originalShippingCost },
      }));
    } else {
      setError("Invalid coupon code");
      setFormData((prev) => ({
        ...prev,
        shippingMethod: { ...prev.shippingMethod, cost: originalShippingCost },
        coupon: { code: "", discount: 0 },
      }));
    }
    setCouponLoading(false);
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    const { customer, shippingAddress, gstDetails } = formData;

    if (!cartItems.length) return setError("Your cart is empty");
    if (!customer.firstName.trim() || !customer.lastName.trim()) {
      return setError("Please enter your full name");
    }
    if (
      !/^[a-zA-Z\s]+$/.test(customer.firstName) ||
      !/^[a-zA-Z\s]+$/.test(customer.lastName)
    ) {
      return setError("Name should contain only letters and spaces");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      return setError("Please enter a valid email");
    }
    if (!/^[0-9]{10}$/.test(customer.phone)) {
      return setError("Please enter a valid 10-digit phone number");
    }
    if (!/^[0-9]{6}$/.test(shippingAddress.pincode)) {
      return setError("Please enter a valid 6-digit pincode");
    }
    if (
      !shippingAddress.address1.trim() ||
      !shippingAddress.city.trim() ||
      !shippingAddress.state.trim()
    ) {
      return setError("Please fill all required shipping address fields");
    }
    if (
      gstDetails.gstNumber &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        gstDetails.gstNumber,
      )
    ) {
      return setError(
        "Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)",
      );
    }
    if (total < 1) {
      return setError("Order total must be at least ₹1 after discounts.");
    }

    setStep(2);
  };

  const checkPendingOrderStatus = async (orderId) => {
    try {
      setLoading(true);
      const response = await withRetry(() =>
        axios.get(`${getApiUrl()}/api/orders/pending/${orderId}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
            "Content-Type": "application/json",
          },
          timeout: 10000,
          withCredentials: true,
        }),
      );
      const pendingOrder = response.data;
      if (!pendingOrder || pendingOrder.paymentStatus !== "Pending") {
        localStorage.removeItem("pendingTransaction");
        setPendingOrderId(null);
        setError(
          "Previous payment session expired or completed. Please start a new payment.",
        );
        return null;
      }
      return pendingOrder;
    } catch (error) {
      handleApiError(error, "check pending order status");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPendingOrder = async () => {
    if (!pendingOrderId) return setError("No pending order found.");
    try {
      setLoading(true);
      await withRetry(() =>
        axios.delete(`${getApiUrl()}/api/orders/${pendingOrderId}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
            "Content-Type": "application/json",
          },
          timeout: 10000,
          withCredentials: true,
        }),
      );
      localStorage.removeItem("pendingTransaction");
      setPendingOrderId(null);
      setError("");
      setShowCancelModal(false);
      setStep(2);
    } catch (error) {
      handleApiError(error, "cancel pending order");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log("Submitting order with:", {
      subtotal,
      shippingCost: formData.shippingMethod.cost,
      couponDiscount: formData.coupon.discount,
      total,
      paymentMethod: formData.paymentMethod,
    });

    try {
      const items = cartItems.map((item) => ({
        productId: sanitizeInput(item.id),
        name: sanitizeInput(item.name),
        quantity: item.quantity,
        price: item.price,
        variant: sanitizeInput(item.variant || ""),
      }));
      const orderData = {
        customer: {
          firstName: sanitizeInput(formData.customer.firstName),
          lastName: sanitizeInput(formData.customer.lastName),
          email: sanitizeInput(formData.customer.email),
          phone: sanitizeInput(formData.customer.phone),
        },
        shippingAddress: {
          address1: sanitizeInput(formData.shippingAddress.address1),
          address2: sanitizeInput(formData.shippingAddress.address2 || ""),
          city: sanitizeInput(formData.shippingAddress.city),
          state: sanitizeInput(formData.shippingAddress.state),
          pincode: sanitizeInput(formData.shippingAddress.pincode),
          country: "India",
        },
        shippingMethod: {
          type: formData.shippingMethod.type,
          cost: formData.shippingMethod.cost,
        },
        coupon: {
          code: sanitizeInput(formData.coupon.code),
          discount: formData.coupon.discount,
        },
        gstDetails: {
          gstNumber: sanitizeInput(formData.gstDetails.gstNumber || ""),
          state: sanitizeInput(formData.gstDetails.state),
          city: sanitizeInput(formData.gstDetails.city),
        },
        items,
        total,
        paymentMethod: sanitizeInput(formData.paymentMethod),
        paymentStatus: formData.paymentMethod === "COD" ? "Success" : "Pending",
      };

      if (formData.paymentMethod === "Razorpay" && pendingOrderId) {
        const pendingOrder = await checkPendingOrderStatus(pendingOrderId);
        if (!pendingOrder) return;
      }

      const orderResponse = await withRetry(() =>
        axios.post(`${getApiUrl()}/api/orders`, orderData, {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
            "Content-Type": "application/json",
          },
          timeout: 10000,
          withCredentials: true,
        }),
      );

      const { order } = orderResponse.data || {};
      if (!order?.orderId)
        throw new Error("Order creation failed: Missing orderId");

      if (formData.paymentMethod === "Razorpay") {
        console.log("Initiating Razorpay with total:", total);
        const razorpayResponse = await withRetry(() =>
          axios.post(
            `${getApiUrl()}/api/orders/initiate-razorpay-payment`,
            { orderId: order.orderId },
            {
              headers: {
                Authorization: token ? `Bearer ${token}` : undefined,
                "Content-Type": "application/json",
              },
              timeout: 15000,
              withCredentials: true,
            },
          ),
        );

        const {
          razorpayOrderId,
          keyId,
          orderData: responseOrderData,
        } = razorpayResponse.data;
        if (!razorpayOrderId || !keyId)
          throw new Error("Invalid Razorpay response");

        localStorage.setItem(
          "pendingTransaction",
          JSON.stringify({
            orderId: order.orderId,
            razorpayOrderId,
            timestamp: Date.now(),
          }),
        );
        setPendingOrderId(order.orderId);

        initiateRazorpayPayment(
          razorpayOrderId,
          keyId,
          responseOrderData,
          total,
          order,
        );
      } else {
        setOrder(order);
        localStorage.removeItem("pendingTransaction");
        localStorage.removeItem("cart");
        setPendingOrderId(null);
        setStep(3);
      }
    } catch (error) {
      handleApiError(error, "process order");
      if (error.message.includes("duplicate key")) {
        setError("Order ID already exists. Please try again.");
      } else {
        setError(
          error.response?.data?.error ||
            "Failed to process order. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const initiateRazorpayPayment = async (
    razorpayOrderId,
    keyId,
    orderData,
    total,
    order,
  ) => {
    if (!razorpayLoaded) {
      setError("Payment system is loading. Please wait or try again.");
      setLoading(false);
      return;
    }

    console.log("Initiating Razorpay payment:", {
      razorpayOrderId,
      keyId,
      orderId: orderData.orderId,
      total,
    });

    const options = {
      key: keyId,
      amount: Math.max(100, Math.round(total * 100)), // Ensure minimum ₹1 (100 paise)
      currency: "INR",
      name: "NISARGMAITRI",
      description: `Order #${orderData.orderId}`,
      order_id: razorpayOrderId,
      handler: async (response) => {
        console.log("Razorpay payment response:", {
          payment_id: response.razorpay_payment_id,
          order_id: response.razorpay_order_id,
          signature: response.razorpay_signature,
        });

        try {
          setLoading(true);
          console.log("Verifying payment for order:", orderData.orderId);

          const verifyResponse = await withRetry(() =>
            axios.post(
              `${getApiUrl()}/api/orders/verify-razorpay-payment`,
              {
                orderId: orderData.orderId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              },
              {
                headers: {
                  Authorization: token ? `Bearer ${token}` : undefined,
                  "Content-Type": "application/json",
                },
                timeout: 10000,
                withCredentials: true,
              },
            ),
          );

          console.log("Verification response:", verifyResponse.data);

          if (verifyResponse.data.success) {
            console.log(
              "Payment verified successfully for order:",
              orderData.orderId,
            );
            setOrder(verifyResponse.data.order || order);
            localStorage.removeItem("pendingTransaction");
            localStorage.removeItem("cart");
            setPendingOrderId(null);
            setStep(3);
          } else {
            console.error(
              "Payment verification failed:",
              verifyResponse.data.message,
            );
            setError(
              "Payment verification failed. Please retry or contact support.",
            );
            setStep(2);
          }
        } catch (error) {
          console.error(
            "Payment verification error:",
            error.message,
            error.stack,
          );
          handleApiError(error, "verify payment");
          const pendingOrder = await checkPendingOrderStatus(orderData.orderId);
          setError(
            pendingOrder
              ? "Payment verification failed. Your order is pending. Please retry or cancel."
              : "Order session expired. Please start a new order.",
          );
          if (!pendingOrder) {
            localStorage.removeItem("pendingTransaction");
            setPendingOrderId(null);
          }
          setStep(2);
        } finally {
          setLoading(false);
        }
      },
      prefill: {
        name: `${sanitizeInput(formData.customer.firstName)} ${sanitizeInput(formData.customer.lastName)}`,
        email: sanitizeInput(formData.customer.email),
        contact: sanitizeInput(formData.customer.phone),
      },
      theme: { color: "#1A3329" },
      modal: {
        ondismiss: async () => {
          console.log("Razorpay modal dismissed for order:", orderData.orderId);
          const pendingOrder = await checkPendingOrderStatus(orderData.orderId);
          if (pendingOrder) {
            setError(
              "Payment was cancelled. Your order is pending. Please retry or cancel payment.",
            );
            setStep(2);
          } else {
            setError("Payment session expired. Please start a new order.");
            localStorage.removeItem("pendingTransaction");
            setPendingOrderId(null);
            setStep(2);
          }
          setLoading(false);
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (response) => {
      console.error("Payment failed:", response.error);
      setError(
        `Payment failed: ${response.error.description}. Please retry or cancel the pending order.`,
      );
      setStep(2);
      setLoading(false);
    });
    rzp.open();
  };

  const handleRetryPayment = async () => {
    if (!pendingOrderId) return setError("No pending order found.");
    const pendingOrder = await checkPendingOrderStatus(pendingOrderId);
    if (!pendingOrder) return;

    setLoading(true);
    setError("");

    try {
      const razorpayResponse = await withRetry(() =>
        axios.post(
          `${getApiUrl()}/api/orders/initiate-razorpay-payment`,
          { orderId: pendingOrderId },
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
              "Content-Type": "application/json",
            },
            timeout: 15000,
            withCredentials: true,
          },
        ),
      );

      const { razorpayOrderId, keyId, orderData } = razorpayResponse.data;
      if (!razorpayOrderId || !keyId)
        throw new Error("Invalid Razorpay response");

      localStorage.setItem(
        "pendingTransaction",
        JSON.stringify({
          orderId: pendingOrderId,
          razorpayOrderId,
          timestamp: Date.now(),
        }),
      );

      initiateRazorpayPayment(
        razorpayOrderId,
        keyId,
        orderData,
        pendingOrder.total,
        pendingOrder,
      );
    } catch (error) {
      handleApiError(error, "retry payment");
    } finally {
      setLoading(false);
    }
  };

  const handleStateSearch = (e) => {
    const value = sanitizeInput(e.target.value);
    setStateSearch(value);
    setShowStateSuggestions(true);
    setFormData((prev) => ({
      ...prev,
      shippingAddress: { ...prev.shippingAddress, state: value },
    }));
  };

  const selectState = (state) => {
    setFormData((prev) => ({
      ...prev,
      shippingAddress: { ...prev.shippingAddress, state },
    }));
    setStateSearch(state);
    setShowStateSuggestions(false);
  };

  const indianStates = [
    "Andaman and Nicobar Islands",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chandigarh",
    "Chhattisgarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jammu and Kashmir",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Ladakh",
    "Lakshadweep",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Puducherry",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
  ].sort();

  const filteredStates = indianStates.filter((state) =>
    state.toLowerCase().includes(stateSearch.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 font-serif">
      <header className="bg-[#1A3329] p-4 text-white shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">NISARGMAITRI</h1>
          <button
            onClick={() => stableNavigate("/")}
            className="flex items-center text-sm hover:underline"
            aria-label="Continue Shopping"
          >
            <svg
              className="mr-1 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Continue Shopping
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:px-6">
        <div className="mb-8 flex justify-center">
          <div className="flex w-full max-w-3xl items-center">
            {["Information", "Payment", "Confirmation"].map((label, index) => (
              <React.Fragment key={label}>
                <div
                  className={`flex flex-col items-center ${step > index + 1 ? "text-[#1A3329]" : "text-gray-400"}`}
                  aria-current={step === index + 1 ? "step" : undefined}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                      step >= index + 1
                        ? "border-[#1A3329] bg-[#1A3329] text-white"
                        : "border-gray-300"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="mt-2 text-sm font-medium">{label}</span>
                </div>
                {index < 2 && (
                  <div
                    className={`mx-2 h-1 flex-1 ${step > index + 1 ? "bg-[#1A3329]" : "bg-gray-300"}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-6xl">
          {error && (
            <div
              id="error-message"
              className="mb-6 animate-[slideDown_0.3s_ease-out] rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                  {pendingOrderId && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        onClick={handleRetryPayment}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#1A3329] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#2F6844] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={loading}
                      >
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry Payment
                      </button>
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={loading}
                      >
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel Order
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cancel Confirmation Modal */}
          {showCancelModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" onClick={() => setShowCancelModal(false)}>
              <div className="mx-4 w-full max-w-md animate-[scaleIn_0.2s_ease-out] rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <svg className="h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Cancel Order</h3>
                </div>
                <p className="mb-6 text-sm leading-relaxed text-gray-600">
                  Are you sure you want to cancel this pending order? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={loading}
                  >
                    Keep Order
                  </button>
                  <button
                    onClick={handleCancelPendingOrder}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Cancelling...
                      </>
                    ) : "Yes, Cancel Order"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <section className="lg:col-span-2 rounded-lg bg-white p-6 shadow-md">
                <h2 className="mb-6 border-b border-gray-200 pb-3 text-2xl font-bold text-gray-900">
                  Billing Information
                </h2>
                <form onSubmit={handleStep1Submit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="firstName"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        First Name*
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        name="customer.firstName"
                        value={formData.customer.firstName}
                        onChange={handleChange}
                        required
                        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1A3329]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="lastName"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Last Name*
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        name="customer.lastName"
                        value={formData.customer.lastName}
                        onChange={handleChange}
                        required
                        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1A3329]"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Email*
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="customer.email"
                      value={formData.customer.email}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1A3329]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Phone*
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      name="customer.phone"
                      value={formData.customer.phone}
                      onChange={handleChange}
                      required
                      pattern="[0-9]{10}"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1A3329]"
                      aria-describedby="phone-desc"
                    />
                    <p id="phone-desc" className="mt-1 text-xs text-gray-500">
                      Enter a 10-digit phone number
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="address1"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Address 1*
                    </label>
                    <input
                      id="address1"
                      type="text"
                      name="shippingAddress.address1"
                      value={formData.shippingAddress.address1}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1A3329]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="address2"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Address 2
                    </label>
                    <input
                      id="address2"
                      type="text"
                      name="shippingAddress.address2"
                      value={formData.shippingAddress.address2}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1A3329]"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="relative">
                      <label
                        htmlFor="state"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        State*
                      </label>
                      <input
                        id="state"
                        type="text"
                        value={stateSearch}
                        onChange={handleStateSearch}
                        onFocus={() => setShowStateSuggestions(true)}
                        onBlur={() =>
                          setTimeout(() => setShowStateSuggestions(false), 300)
                        }
                        required
                        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1A3329]"
                        aria-controls="state-suggestions"
                      />
                      {showStateSuggestions && stateSearch && (
                        <ul
                          id="state-suggestions"
                          className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg"
                          role="listbox"
                        >
                          {filteredStates.length ? (
                            filteredStates.map((state) => (
                              <li
                                key={state}
                                onClick={() => selectState(state)}
                                className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                role="option"
                                aria-selected={
                                  formData.shippingAddress.state === state
                                }
                              >
                                {state}
                              </li>
                            ))
                          ) : (
                            <li className="px-4 py-2 text-sm text-gray-500">
                              No matching states
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="city"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        City*
                      </label>
                      <input
                        id="city"
                        type="text"
                        name="shippingAddress.city"
                        value={formData.shippingAddress.city}
                        onChange={handleChange}
                        required
                        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1A3329]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pincode"
                        className="mb-1 text-sm font-medium text-gray-700"
                      >
                        Pincode*
                      </label>
                      <input
                        id="pincode"
                        type="text"
                        name="shippingAddress.pincode"
                        value={formData.shippingAddress.pincode}
                        onChange={handleChange}
                        required
                        pattern="[0-9]{6}"
                        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1A3329]"
                        aria-describedby="pincode-desc"
                      />
                      <p
                        id="pincode-desc"
                        className="mt-1 text-xs text-gray-500"
                      >
                        Enter a 6-digit pincode
                      </p>
                    </div>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                    <h3 className="mb-3 text-lg font-semibold text-gray-900">
                      GST Details (Optional)
                    </h3>
                    <div>
                      <label
                        htmlFor="gstNumber"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        GST Number
                      </label>
                      <input
                        id="gstNumber"
                        type="text"
                        name="gstDetails.gstNumber"
                        value={formData.gstDetails.gstNumber}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1A3329]"
                        aria-describedby="gst-desc"
                      />
                      <p id="gst-desc" className="mt-1 text-xs text-gray-500">
                        Enter a valid 15-digit GST number (e.g.,
                        22AAAAA0000A1Z5)
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 pt-6 sm:flex-row">
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1A3329] px-8 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#2F6844] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      disabled={loading}
                    >
                      Continue to Payment
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => stableNavigate("/shop")}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-8 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm active:scale-[0.98] sm:w-auto"
                      disabled={loading}
                    >
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                      </svg>
                      Back to Cart
                    </button>
                  </div>
                </form>
              </section>
              <aside className="h-fit rounded-lg bg-white p-6 shadow-md">
                <h2 className="mb-4 border-b border-gray-200 pb-3 text-xl font-bold text-gray-900">
                  Order Summary
                </h2>
                <div className="mb-4 space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between py-2">
                      <div className="flex items-start">
                        <span className="text-sm font-medium text-gray-800">
                          {sanitizeInput(item.name)}
                        </span>
                        <span className="ml-1 text-xs text-gray-500">
                          x{item.quantity}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span>
                      ₹{formData.shippingMethod.cost.toLocaleString("en-IN")}
                    </span>
                  </div>
                  {formData.coupon.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Coupon Discount</span>
                      <span>
                        -₹{formData.coupon.discount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold">
                    <span>Total</span>
                    <span>₹{total.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <section className="lg:col-span-2 rounded-lg bg-white p-6 shadow-md">
                <h2 className="mb-6 border-b border-gray-200 pb-3 text-2xl font-bold text-gray-900">
                  Payment Method
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <fieldset className="space-y-4">
                    <legend className="sr-only">Payment Method</legend>
                    {[
                      {
                        value: "Razorpay",
                        label: "Razorpay",
                        description: "Pay using UPI, Cards, Netbanking, etc.",
                        icon: (
                          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                          </svg>
                        ),
                      },
                      {
                        value: "COD",
                        label: "Cash on Delivery",
                        description: "Pay upon receipt",
                        icon: (
                          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                          </svg>
                        ),
                      },
                    ].map((method) => (
                      <label
                        key={method.value}
                        className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 p-4 transition-all duration-200 ${
                          formData.paymentMethod === method.value
                            ? "border-[#1A3329] bg-[#1A3329]/5 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          checked={formData.paymentMethod === method.value}
                          onChange={handleChange}
                          className="h-5 w-5 accent-[#1A3329]"
                          id={`payment-${method.value.toLowerCase()}`}
                        />
                        <div className={`flex-shrink-0 ${formData.paymentMethod === method.value ? "text-[#1A3329]" : "text-gray-400"}`}>
                          {method.icon}
                        </div>
                        <div>
                          <span className="block font-medium text-gray-900">
                            {method.label}
                          </span>
                          <span className="block text-sm text-gray-500">
                            {method.description}
                          </span>
                        </div>
                      </label>
                    ))}
                  </fieldset>
                  <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center">
                    <button
                      type="submit"
                      className="order-2 inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1A3329] px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#2F6844] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:order-1"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Processing...
                        </>
                      ) : pendingOrderId ? (
                        <>
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Retry Payment
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                          </svg>
                          Place Order
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="order-1 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:order-2"
                      disabled={loading}
                    >
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                      </svg>
                      Back to Billing
                    </button>
                    <button
                      type="button"
                      onClick={() => stableNavigate("/shop")}
                      className="order-3 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={loading}
                    >
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      Back to Cart
                    </button>
                  </div>
                </form>
              </section>
              <aside className="h-fit rounded-lg bg-white p-6 shadow-md">
                <h2 className="mb-4 border-b border-gray-200 pb-3 text-xl font-bold text-gray-900">
                  Order Summary
                </h2>
                <div className="mb-4 space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between py-2">
                      <div className="flex items-start">
                        <span className="text-sm font-medium text-gray-800">
                          {sanitizeInput(item.name)}
                        </span>
                        <span className="ml-1 text-xs text-gray-500">
                          x{item.quantity}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mb-4 border-y border-gray-200 py-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-900">
                    Apply Coupon
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={formData.coupon.code}
                      onChange={(e) =>
                        handleChange({
                          target: {
                            name: "coupon.code",
                            value: e.target.value,
                          },
                        })
                      }
                      className="flex-1 text-sm rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1A3329]"
                      aria-label="Coupon code"
                      disabled={couponLoading}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      className="rounded-md bg-[#1A3329] px-3 py-2 text-sm font-medium text-white hover:bg-[#2F6844] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={couponLoading}
                    >
                      {couponLoading ? "Applying..." : "Apply"}
                    </button>
                  </div>
                  {formData.coupon.discount > 0 && (
                    <p className="mt-2 flex items-center text-sm text-green-600">
                      <svg
                        className="mr-1 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      Free shipping applied! (Discount: ₹
                      {formData.coupon.discount})
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span>
                      ₹{formData.shippingMethod.cost.toLocaleString("en-IN")}
                    </span>
                  </div>
                  {formData.coupon.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Coupon Discount</span>
                      <span>
                        -₹{formData.coupon.discount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold">
                    <span>Total</span>
                    <span>₹{total.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {step === 3 && (
            <>
              {order ? (
              <section className="mx-auto max-w-3xl animate-[fadeIn_0.4s_ease-out]">
                  {/* Success Header Card */}
                  <div className="mb-6 rounded-xl bg-gradient-to-br from-[#1A3329] to-[#2F6844] p-8 text-center text-white shadow-lg">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm animate-[scaleIn_0.4s_ease-out]">
                      <svg className="h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold">Thank You for Your Order!</h2>
                    <p className="mt-2 text-white/80">
                      Order <span className="font-semibold text-white">#{order.orderId}</span> has been placed successfully.
                    </p>
                    <p className="mt-1 text-sm text-white/70">
                      A confirmation email has been sent to{" "}
                      <span className="font-medium text-white/90">{order.customer.email}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {/* Order Details Card */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="mb-4 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A3329]/10">
                          <svg className="h-4 w-4 text-[#1A3329]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Order Details</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Order ID</span>
                          <span className="font-mono text-xs font-medium text-gray-800">{order.orderId}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Date</span>
                          <span className="font-medium text-gray-800">
                            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Payment Method</span>
                          <span className="inline-flex items-center gap-1.5 font-medium text-gray-800">
                            {order.paymentMethod === "Razorpay" ? (
                              <svg className="h-3.5 w-3.5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                              </svg>
                            )}
                            {order.paymentMethod === "COD" ? "Cash on Delivery" : order.paymentMethod}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Status</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            order.paymentStatus === "Success"
                              ? "bg-green-100 text-green-700"
                              : order.paymentStatus === "Pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              order.paymentStatus === "Success" ? "bg-green-500" : order.paymentStatus === "Pending" ? "bg-yellow-500" : "bg-red-500"
                            }`} />
                            {order.paymentStatus}
                          </span>
                        </div>
                        {order.paymentMethod === "Razorpay" && order.razorpayPaymentId && (
                          <>
                            <div className="border-t border-gray-100 pt-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Payment ID</span>
                                <span className="font-mono text-xs text-gray-600">{order.razorpayPaymentId}</span>
                              </div>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Razorpay Order</span>
                              <span className="font-mono text-xs text-gray-600">{order.razorpayOrderId}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Shipping Address Card */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="mb-4 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A3329]/10">
                          <svg className="h-4 w-4 text-[#1A3329]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Shipping Address</h3>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-4">
                        <p className="text-sm font-semibold text-gray-800">
                          {order.customer.firstName} {order.customer.lastName}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-gray-600">
                          {order.shippingAddress.address1}
                          {order.shippingAddress.address2 && <><br />{order.shippingAddress.address2}</>}
                          <br />
                          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
                          <br />
                          {order.shippingAddress.country}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Items & Summary Card */}
                  <div className="mt-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A3329]/10">
                        <svg className="h-4 w-4 text-[#1A3329]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Items Ordered</h3>
                    </div>

                    {/* Items List */}
                    <div className="divide-y divide-gray-100">
                      {order.items.map((item) => (
                        <div key={item.productId} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1A3329]/5 text-xs font-semibold text-[#1A3329]">
                              x{item.quantity}
                            </div>
                            <span className="text-sm font-medium text-gray-800">{item.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-800">
                            ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Price Summary */}
                    <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="text-gray-700">
                          ₹{order.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Shipping</span>
                        <span className={order.shippingMethod.cost === 0 ? "font-medium text-green-600" : "text-gray-700"}>
                          {order.shippingMethod.cost === 0 ? "FREE" : `₹${order.shippingMethod.cost.toLocaleString("en-IN")}`}
                        </span>
                      </div>
                      {order.coupon.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Coupon Discount</span>
                          <span className="font-medium text-green-600">
                            -₹{order.coupon.discount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-bold">
                        <span className="text-gray-900">Total Paid</span>
                        <span className="text-[#1A3329]">₹{order.total.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => stableNavigate("/")}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A3329] px-6 py-3.5 text-sm font-medium text-white shadow-md transition-all duration-200 hover:bg-[#2F6844] hover:shadow-lg active:scale-[0.98]"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    Continue Shopping
                  </button>
                </section>
              ) : (
                <div className="mx-auto max-w-md text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <svg className="h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Order Not Found
                  </h2>
                  <p className="mt-2 text-gray-500">
                    Something went wrong. Please try again.
                  </p>
                  <button
                    onClick={() => stableNavigate("/shop")}
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1A3329] px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#2F6844] hover:shadow-md active:scale-[0.98]"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                    Back to Shop
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
