import { useEffect } from "react";
import axios from "axios";

// Use relative URL in production for same-domain deployment
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) return '';
  return 'http://localhost:5001';
};

const loadScript = (src) =>
  new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      console.log("✅ Razorpay script loaded");
      resolve(true);
    };
    script.onerror = () => {
      console.log("❌ Failed to load Razorpay script");
      resolve(false);
    };
    document.body.appendChild(script);
  });

const RenderRazorpay = ({ orderId, keyId, currency, amount }) => {
  useEffect(() => {
    const startPayment = async () => {
      console.log("🔄 Starting Razorpay checkout");

      const res = await loadScript(
        "https://checkout.razorpay.com/v1/checkout.js"
      );

      if (!res) {
        alert("Razorpay SDK failed to load. Check your internet connection.");
        return;
      }

      console.log("✅ SDK Loaded. Creating options");

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "Your Store Name",
        description: "Thank you for shopping with us!",
        order_id: orderId,
        handler: function (response) {
          console.log("💰 Payment success response:", response);
          alert(
            "Payment successful! Payment ID: " + response.razorpay_payment_id
          );
          axios.post(`${getApiUrl()}/api/orders/payment`, {
            status: "success",
            orderDetails: response,
          });
        },
        prefill: {
          name: "John Doe",
          email: "john@example.com",
          contact: "9999999999",
        },
        theme: {
          color: "#3399cc",
        },
        modal: {
          ondismiss: () => {
            console.log("❌ Payment popup dismissed");
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      console.log("🚀 Opening Razorpay modal...");
      paymentObject.open();
    };

    if (orderId && amount && currency && keyId) {
      console.log("🔑 Order ready. Triggering Razorpay modal...");
      startPayment();
    } else {
      console.warn("⚠ Missing Razorpay config", {
        orderId,
        amount,
        currency,
        keyId,
      });
    }
  }, [orderId, amount, currency, keyId]);

  return null;
};

export default RenderRazorpay;
