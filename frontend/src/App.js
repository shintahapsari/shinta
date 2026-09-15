import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import VerifyPage from "@/pages/VerifyPage";
import DashboardPage from "@/pages/DashboardPage";
import PartnersPage from "@/pages/PartnersPage";
import PartnerDetailPage from "@/pages/PartnerDetailPage";
import DocumentsPage from "@/pages/DocumentsPage";
import ImplementationsPage from "@/pages/ImplementationsPage";
import KampusBerdampakPage from "@/pages/KampusBerdampakPage";
import AuditPage from "@/pages/AuditPage";
import ReportsPage from "@/pages/ReportsPage";
import UsersPage from "@/pages/UsersPage";

const STAFF = ["admin", "tim_kerjasama", "tim_mbkm", "tim_manajemen"];

function Protected({ children, roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
            <Route path="/partners" element={<Protected><PartnersPage /></Protected>} />
            <Route path="/partners/:id" element={<Protected><PartnerDetailPage /></Protected>} />
            <Route path="/documents" element={<Protected><DocumentsPage /></Protected>} />
            <Route path="/implementations" element={<Protected><ImplementationsPage /></Protected>} />
            <Route path="/kampus-berdampak" element={<Protected roles={STAFF}><KampusBerdampakPage /></Protected>} />
            <Route path="/reports" element={<Protected roles={STAFF}><ReportsPage /></Protected>} />
            <Route path="/audit" element={<Protected roles={STAFF}><AuditPage /></Protected>} />
            <Route path="/users" element={<Protected roles={["admin"]}><UsersPage /></Protected>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
