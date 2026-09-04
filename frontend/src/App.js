import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LangProvider } from "@/contexts/LangContext";
import { Toaster } from "sonner";

import Login from "@/pages/Login";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import HarvestForm from "@/pages/HarvestForm";
import CollectionForm from "@/pages/CollectionForm";
import ProductionForm from "@/pages/ProductionForm";
import ShipmentForm from "@/pages/ShipmentForm";
import SalesForm from "@/pages/SalesForm";
import Traceability from "@/pages/Traceability";
import BatchDetail from "@/pages/BatchDetail";
import BlockchainExplorer from "@/pages/BlockchainExplorer";
import SmartContracts from "@/pages/SmartContracts";
import QualityIoT from "@/pages/QualityIoT";
import Exceptions from "@/pages/Exceptions";
import AuditLog from "@/pages/AuditLog";
import UserManagement from "@/pages/UserManagement";
import ConsumerPortal from "@/pages/ConsumerPortal";
import Analytics from "@/pages/Analytics";

function Protected({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <div className="flex items-center justify-center h-screen text-emerald-700 font-mono">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <LangProvider>
          <AuthProvider>
            <Toaster position="top-right" theme="light" richColors />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/verify" element={<ConsumerPortal />} />
              <Route path="/verify/:productId" element={<ConsumerPortal />} />
              <Route path="/" element={<Protected><Layout /></Protected>}>
                <Route index element={<Dashboard />} />
                <Route path="harvest" element={<HarvestForm />} />
                <Route path="collection" element={<CollectionForm />} />
                <Route path="production" element={<ProductionForm />} />
                <Route path="shipment" element={<ShipmentForm />} />
                <Route path="sales" element={<SalesForm />} />
                <Route path="trace" element={<Traceability />} />
                <Route path="batch/:batchId" element={<BatchDetail />} />
                <Route path="explorer" element={<BlockchainExplorer />} />
                <Route path="contracts" element={<SmartContracts />} />
                <Route path="quality" element={<QualityIoT />} />
                <Route path="exceptions" element={<Exceptions />} />
                <Route path="audit" element={<AuditLog />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="analytics" element={<Analytics />} />
              </Route>
            </Routes>
          </AuthProvider>
        </LangProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
