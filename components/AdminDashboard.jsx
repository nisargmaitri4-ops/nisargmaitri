import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* ── Sub-components ── */
import { getApiUrl, fmt, money, paymentLabel } from "./admin/helpers";
import Sidebar from "./admin/Sidebar";
import Header from "./admin/Header";
import OverviewTab from "./admin/OverviewTab";
import OrdersTab from "./admin/OrdersTab";
import OrderDetail from "./admin/OrderDetail";
import ProductsTab from "./admin/ProductsTab";
import SettingsTab from "./admin/SettingsTab";
import DeleteModal from "./admin/DeleteModal";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  /* ── Navigation state ── */
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── Orders state ── */
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [orderLoading, setOrderLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderDateFilter, setOrderDateFilter] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSort, setOrderSort] = useState("newest");
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const reconnectAttempts = useRef(0);

  /* ── Products state ── */
  const [products, setProducts] = useState([]);
  const [productLoading, setProductLoading] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    comparePrice: "",
    image: "",
    category: "Bamboo",
    tag: "",
    stock: "",
    sku: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [savingProduct, setSavingProduct] = useState(false);

  /* ── Other state ── */
  const [stats, setStats] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [adminName, setAdminName] = useState(
    () => localStorage.getItem("adminName") || ""
  );

  /* ════════════════════════════════════════════════
     AUTH CHECK
     ════════════════════════════════════════════════ */
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const checkAdmin = async () => {
      try {
        const r = await axios.get(getApiUrl() + "/api/auth/check-admin", {
          headers: { Authorization: "Bearer " + token },
          timeout: 15000,
        });
        if (!r.data.isAdmin) navigate("/");
      } catch (e) {
        // Only redirect to login on auth errors, not network timeouts
        if (e.response?.status === 401 || e.response?.status === 403) {
          navigate("/login");
        }
        // Network errors (cold start timeouts) — stay on page, don't logout
      }
    };
    checkAdmin();
  }, [token, navigate]);

  /* ── Fetch admin name for header avatar ── */
  useEffect(() => {
    if (!token) return;
    const fetchAdminName = async () => {
      try {
        const r = await axios.get(getApiUrl() + "/api/auth/profile", {
          headers: { Authorization: "Bearer " + token },
        });
        const name = r.data.name || "";
        setAdminName(name);
        localStorage.setItem("adminName", name);
      } catch {
        /* ignore – header will use cached or fallback "A" */
      }
    };
    fetchAdminName();
  }, [token]);

  /* ════════════════════════════════════════════════
     FETCH FUNCTIONS
     ════════════════════════════════════════════════ */
  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setOrderLoading(true);
    try {
      const r = await axios.get(getApiUrl() + "/api/orders", {
        headers: { Authorization: "Bearer " + token },
        timeout: 10000,
      });
      const paid = r.data.filter((o) =>
        ["Success", "Paid"].includes(o.paymentStatus),
      );
      setOrders(paid);
      setFilteredOrders(paid);
    } catch (e) {
      if (e.response?.status === 401) {
        navigate("/login");
        return;
      }
      toast.error("Failed to load orders");
    } finally {
      setOrderLoading(false);
    }
  }, [token, navigate]);

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setProductLoading(true);
    try {
      const r = await axios.get(getApiUrl() + "/api/products", {
        headers: { Authorization: "Bearer " + token },
        timeout: 10000,
      });
      setProducts(r.data);
    } catch (e) {
      if (e.response?.status === 401) {
        navigate("/login");
        return;
      }
      toast.error("Failed to load products");
    } finally {
      setProductLoading(false);
    }
  }, [token, navigate]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const r = await axios.get(getApiUrl() + "/api/products/admin/stats", {
        headers: { Authorization: "Bearer " + token },
        timeout: 10000,
      });
      setStats(r.data);
    } catch {
      /* silent */
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchStats();
  }, [fetchOrders, fetchProducts, fetchStats]);

  /* ════════════════════════════════════════════════
     SSE — live order updates
     ════════════════════════════════════════════════ */
  useEffect(() => {
    if (!token) return;
    const connect = () => {
      const es = new EventSource(
        getApiUrl() + "/api/order-updates?token=" + token,
      );
      eventSourceRef.current = es;
      es.onopen = () => {
        setSseConnected(true);
        reconnectAttempts.current = 0;
      };
      es.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (
            (d.event === "newOrder" || d.event === "orderUpdated") &&
            ["Success", "Paid"].includes(d.order?.paymentStatus)
          ) {
            setOrders((prev) => {
              const exists = prev.some((o) => o.orderId === d.order.orderId);
              return exists
                ? prev.map((o) => (o.orderId === d.order.orderId ? d.order : o))
                : [d.order, ...prev];
            });
            toast.success(
              "Order " +
                d.order.orderId +
                " " +
                (d.event === "newOrder" ? "received" : "updated"),
            );
          }
        } catch {
          /* ignore parse errors */
        }
      };
      es.onerror = () => {
        setSseConnected(false);
        es.close();
        if (reconnectAttempts.current < 5) {
          setTimeout(connect, Math.pow(2, reconnectAttempts.current) * 1000);
          reconnectAttempts.current++;
        }
      };
    };
    connect();
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [token]);

  /* ════════════════════════════════════════════════
     ORDER FILTERING
     ════════════════════════════════════════════════ */
  useEffect(() => {
    let list = orders.slice();
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderId.toLowerCase().includes(q) ||
          (o.customer.firstName + " " + o.customer.lastName)
            .toLowerCase()
            .includes(q) ||
          o.customer.email.toLowerCase().includes(q),
      );
    }
    if (orderDateFilter) {
      list = list.filter((o) => {
        const d = o.createdAt || o.date;
        return d && new Date(d).toISOString().split("T")[0] === orderDateFilter;
      });
    }
    if (orderStatusFilter !== "all") {
      list = list.filter((o) => (o.orderStatus || "Confirmed") === orderStatusFilter);
    }
    list.sort((a, b) => {
      const da = new Date(a.createdAt || a.date);
      const db = new Date(b.createdAt || b.date);
      return orderSort === "newest" ? db - da : da - db;
    });
    setFilteredOrders(list);
  }, [orders, orderSearch, orderDateFilter, orderStatusFilter, orderSort]);

  /* ════════════════════════════════════════════════
     PRODUCT FILTERING
     ════════════════════════════════════════════════ */
  const displayProducts = useMemo(() => {
    let list = products.slice();
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }
    if (productFilter === "active") list = list.filter((p) => p.isActive);
    else if (productFilter === "inactive")
      list = list.filter((p) => !p.isActive);
    else if (productFilter === "outofstock")
      list = list.filter((p) => p.stock === 0);
    return list;
  }, [products, productSearch, productFilter]);

  /* ════════════════════════════════════════════════
     PRODUCT FORM HELPERS
     ════════════════════════════════════════════════ */
  const resetForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: "",
      comparePrice: "",
      image: "",
      category: "Bamboo",
      tag: "",
      stock: "",
      sku: "",
      isActive: true,
    });
    setEditingProduct(null);
    setFormErrors({});
    setShowProductForm(false);
  };

  const openEditForm = (p) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      comparePrice: String(p.comparePrice || ""),
      image: p.image,
      category: p.category,
      tag: p.tag || "",
      stock: String(p.stock),
      sku: p.sku || "",
      isActive: p.isActive,
    });
    setFormErrors({});
    setShowProductForm(true);
  };

  const validateForm = () => {
    const e = {};
    if (!productForm.name.trim()) e.name = "Required";
    if (!productForm.description.trim()) e.description = "Required";
    if (!productForm.price || Number(productForm.price) < 1) e.price = "Min ₹1";
    if (!productForm.image.trim()) e.image = "Required";
    if (!productForm.category) e.category = "Required";
    if (productForm.stock === "" || Number(productForm.stock) < 0)
      e.stock = "Min 0";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ════════════════════════════════════════════════
     PRODUCT CRUD
     ════════════════════════════════════════════════ */
  const handleSaveProduct = async () => {
    if (!validateForm()) return;
    setSavingProduct(true);
    const payload = {
      name: productForm.name,
      description: productForm.description,
      price: Number(productForm.price),
      comparePrice: Number(productForm.comparePrice) || 0,
      image: productForm.image,
      category: productForm.category,
      tag: productForm.tag,
      stock: Number(productForm.stock),
      sku: productForm.sku,
      isActive: productForm.isActive,
    };
    try {
      if (editingProduct) {
        await axios.put(
          getApiUrl() + "/api/products/" + editingProduct._id,
          payload,
          {
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
            },
          },
        );
        toast.success("Product updated");
      } else {
        await axios.post(getApiUrl() + "/api/products", payload, {
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
        });
        toast.success("Product created");
      }
      resetForm();
      fetchProducts();
      fetchStats();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to save product");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!id && !deleteTarget) return;
    const targetId = id || deleteTarget._id;
    try {
      await axios.delete(getApiUrl() + "/api/products/" + targetId, {
        headers: { Authorization: "Bearer " + token },
      });
      toast.success("Product deleted");
      setDeleteTarget(null);
      fetchProducts();
      fetchStats();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const handleToggleActive = async (p) => {
    try {
      await axios.put(
        getApiUrl() + "/api/products/" + p._id,
        { isActive: !p.isActive },
        {
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
        },
      );
      fetchProducts();
      fetchStats();
      toast.success(
        p.isActive ? "Product hidden from shop" : "Product visible on shop",
      );
    } catch {
      toast.error("Update failed");
    }
  };

  const handleSeedProducts = async () => {
    try {
      await axios.post(
        getApiUrl() + "/api/products/seed",
        {},
        {
          headers: { Authorization: "Bearer " + token },
        },
      );
      toast.success("Products seeded from existing catalog");
      fetchProducts();
      fetchStats();
    } catch (e) {
      toast.error(e.response?.data?.error || "Seed failed");
    }
  };

  /* ════════════════════════════════════════════════
     UPDATE ORDER STATUS
     ════════════════════════════════════════════════ */
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const r = await axios.put(
        getApiUrl() + "/api/orders/" + orderId + "/status",
        { orderStatus: newStatus },
        { headers: { Authorization: "Bearer " + token } },
      );
      if (r.data.success) {
        toast.success("Order status updated to " + newStatus);
        /* Update local state so UI reflects immediately */
        setOrders((prev) =>
          prev.map((o) =>
            o.orderId === orderId ? { ...o, orderStatus: newStatus } : o,
          ),
        );
        if (selectedOrder?.orderId === orderId) {
          setSelectedOrder((prev) => ({ ...prev, orderStatus: newStatus }));
        }
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to update status");
    }
  };

  /* ════════════════════════════════════════════════
     PDF DOWNLOAD
     ════════════════════════════════════════════════ */
  const downloadPDF = (order) => {
    /* ── PDF-safe money formatter (jsPDF default font has no ₹ glyph) ── */
    const rs = (n) => "Rs. " + Number(n || 0).toFixed(2);

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;

    /* ── Brand color ── */
    const brand = [26, 51, 41]; // #1A3329

    /* ── Thin colored bar at the very top ── */
    doc.setFillColor(...brand);
    doc.rect(0, 0, pageW, 4, "F");

    /* ── Company branding ── */
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...brand);
    doc.text("Nisarg Maitri", margin, 18);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Eco-Friendly Products", margin, 24);

    /* ── INVOICE badge on top-right ── */
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(210, 210, 210);
    doc.text("INVOICE", pageW - margin, 20, { align: "right" });

    /* ── Divider line ── */
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.4);
    doc.line(margin, 30, pageW - margin, 30);

    /* ── Invoice meta ── */
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("Invoice No:", margin, 38);
    doc.text("Date:", margin, 44);
    doc.text("Payment:", margin, 50);
    doc.text("Order Status:", margin, 56);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(order.orderId, margin + 30, 38);
    doc.text(fmt(order.createdAt), margin + 30, 44);

    /* Build a PDF-safe payment string:  COD (Success)  or  Prepaid - UPI (Success)  */
    const pdfPayLabel = order.paymentMethod === "COD"
      ? "COD"
      : order.razorpayMethod
        ? "Prepaid - " + order.razorpayMethod
        : "Prepaid";
    doc.text(
      pdfPayLabel + " (" + (order.paymentStatus || "N/A") + ")",
      margin + 30,
      50
    );
    doc.text(order.orderStatus || "Confirmed", margin + 30, 56);

    /* ── Bill To section (right side) ── */
    const rightX = pageW / 2 + 10;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("Bill To:", rightX, 38);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const custName =
      ((order.customer.firstName || "") + " " + (order.customer.lastName || "")).trim() || "N/A";
    doc.text(custName, rightX, 44);
    doc.text(order.customer.email || "N/A", rightX, 50);
    doc.text(order.customer.phone || "N/A", rightX, 56);

    /* Address (wrap long text) */
    const addr = [
      order.shippingAddress.address1,
      order.shippingAddress.city,
      order.shippingAddress.state,
      order.shippingAddress.pincode ? "- " + order.shippingAddress.pincode : "",
    ]
      .filter(Boolean)
      .join(", ");
    const addrLines = doc.splitTextToSize(addr || "N/A", pageW / 2 - 20);
    doc.text(addrLines, rightX, 62);

    /* ── Items table ── */
    const itemsStartY = 80;
    autoTable(doc, {
      startY: itemsStartY,
      head: [["#", "Item", "Qty", "Price", "Total"]],
      body: (order.items || []).map((item, idx) => [
        idx + 1,
        item.name || "N/A",
        item.quantity,
        rs(item.price),
        rs(item.price * item.quantity),
      ]),
      headStyles: {
        fillColor: brand,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "left",
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [50, 50, 50],
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 32, halign: "right" },
        4: { cellWidth: 32, halign: "right" },
      },
      alternateRowStyles: { fillColor: [245, 248, 246] },
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { lineColor: [220, 220, 220], lineWidth: 0.3 },
    });

    /* ── Totals section (right-aligned summary box) ── */
    const sub = (order.items || []).reduce((s, i) => s + i.price * i.quantity, 0);
    const shippingLabel = "Shipping (" + (order.shippingMethod?.type || "Standard") + ")";
    const shippingValue =
      order.shippingMethod?.cost === 0 ? "Free" : rs(order.shippingMethod?.cost);

    const summaryRows = [
      ["Subtotal", rs(sub)],
      [shippingLabel, shippingValue],
    ];
    if (order.coupon?.discount > 0) {
      summaryRows.push(["Coupon (" + order.coupon.code + ")", "- " + rs(order.coupon.discount)]);
    }
    summaryRows.push(["Total", rs(order.total)]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      body: summaryRows,
      theme: "plain",
      styles: { fontSize: 10, textColor: [60, 60, 60] },
      columnStyles: {
        0: { cellWidth: 80, halign: "right", fontStyle: "normal" },
        1: { cellWidth: 45, halign: "right", fontStyle: "normal" },
      },
      margin: { left: pageW - margin - 125, right: margin },
      didParseCell: (d) => {
        const isLast = d.row.index === summaryRows.length - 1;
        if (isLast) {
          d.cell.styles.fontStyle = "bold";
          d.cell.styles.fontSize = 12;
          d.cell.styles.textColor = brand;
        }
      },
      didDrawCell: (d) => {
        /* Draw a top border on the Total row for separation */
        const isLast = d.row.index === summaryRows.length - 1;
        if (isLast && d.column.index === 0) {
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.4);
          doc.line(d.cell.x, d.cell.y, d.cell.x + 125, d.cell.y);
        }
      },
    });

    /* ── Footer ── */
    const footerY = doc.lastAutoTable.finalY + 20;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageW - margin, footerY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your order!", pageW / 2, footerY + 8, { align: "center" });
    doc.text("Nisarg Maitri  |  Eco-Friendly Products  |  nisargmaitri.com", pageW / 2, footerY + 14, {
      align: "center",
    });

    doc.save("Invoice_" + order.orderId + ".pdf");
  };

  /* ════════════════════════════════════════════════
     LOGOUT
     ════════════════════════════════════════════════ */
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("userName");
    navigate("/");
  };

  /* ════════════════════════════════════════════════
     COMPUTED
     ════════════════════════════════════════════════ */
  const totalRevenue = useMemo(
    () => orders.reduce((s, o) => s + (o.total || 0), 0),
    [orders],
  );
  const todayOrders = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return orders.filter(
      (o) => (o.createdAt || o.date || "").slice(0, 10) === today,
    ).length;
  }, [orders]);

  /* ════════════════════════════════════════════════
     SIDEBAR NAV HANDLER
     ════════════════════════════════════════════════ */
  const handleNav = (tabId) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
    setSelectedOrder(null);
    setShowProductForm(false);
  };

  /* ════════════════════════════════════════════════
     RENDER — Active Tab Content
     ════════════════════════════════════════════════ */
  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            orders={orders}
            totalRevenue={totalRevenue}
            todayOrders={todayOrders}
            stats={stats}
            products={products}
            setActiveTab={setActiveTab}
            setSelectedOrder={setSelectedOrder}
          />
        );
      case "orders":
        if (selectedOrder) {
          return (
            <OrderDetail
              order={selectedOrder}
              onBack={() => setSelectedOrder(null)}
              onDownload={downloadPDF}
              onUpdateStatus={updateOrderStatus}
            />
          );
        }
        return (
          <OrdersTab
            orders={orders}
            filteredOrders={filteredOrders}
            orderLoading={orderLoading}
            orderSearch={orderSearch}
            setOrderSearch={setOrderSearch}
            orderDateFilter={orderDateFilter}
            setOrderDateFilter={setOrderDateFilter}
            orderStatusFilter={orderStatusFilter}
            setOrderStatusFilter={setOrderStatusFilter}
            orderSort={orderSort}
            setOrderSort={setOrderSort}
            fetchOrders={fetchOrders}
            setSelectedOrder={setSelectedOrder}
            downloadPDF={downloadPDF}
          />
        );
      case "products":
        return (
          <ProductsTab
            products={products}
            displayProducts={displayProducts}
            productLoading={productLoading}
            productSearch={productSearch}
            setProductSearch={setProductSearch}
            productFilter={productFilter}
            setProductFilter={setProductFilter}
            showProductForm={showProductForm}
            setShowProductForm={setShowProductForm}
            editingProduct={editingProduct}
            productForm={productForm}
            setProductForm={setProductForm}
            formErrors={formErrors}
            savingProduct={savingProduct}
            handleSaveProduct={handleSaveProduct}
            resetForm={resetForm}
            openEditForm={openEditForm}
            handleToggleActive={handleToggleActive}
            setDeleteTarget={setDeleteTarget}
            handleSeedProducts={handleSeedProducts}
          />
        );
      case "settings":
        return (
          <SettingsTab
            token={token}
            onTokenRefresh={(newToken) => {
              localStorage.setItem("token", newToken);
            }}
            onNameChange={(name) => {
              setAdminName(name);
              localStorage.setItem("adminName", name);
            }}
          />
        );
      default:
        return null;
    }
  };

  /* ════════════════════════════════════════════════
     MAIN LAYOUT
     ════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans antialiased text-[#111]">
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        theme="light"
      />

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        sidebarOpen={sidebarOpen}
        sseConnected={sseConnected}
        onNav={handleNav}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Delete confirmation */}
      <DeleteModal
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        handleDeleteProduct={handleDeleteProduct}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main area */}
      <div className="lg:pl-[250px] transition-all duration-300">
        <Header
          activeTab={activeTab}
          sseConnected={sseConnected}
          onMenuClick={() => setSidebarOpen(true)}
          adminName={adminName}
        />

        <main className="p-6 sm:p-8 lg:p-10 max-w-[1360px] mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
