import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import "./App.css";

// Import pages from old components folder (backward compatible)
import LandingPage from "../components/LandingPage";
import ShopPage from "../components/ShopPage";
import ContactPage from "../components/ContactPage";
import AboutUsPage from "../components/AboutUs";
import CheckoutPage from "../components/CheckoutPage";
import AdminDashboard from "../components/AdminDashboard";
import Login from "../components/Login";
import PrivacyPolicy from "../components/PrivacyPolicy";
import TermsAndConditions from "../components/TermsAndConditions";
import ServicesPage from "../components/ServicesPage";
import WasteManagementPage from "../components/WasteManagementPage";

// ProtectedRoute component to restrict access to admin-only routes
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem("token");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/about" element={<AboutUsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/waste-management" element={<WasteManagementPage />} />
        <Route path="/terms-condition" element={<TermsAndConditions />} />
        <Route path="/login" element={<Login />} />

        {/* Admin-Only Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback Route for 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
