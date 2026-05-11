import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AppNav from "@/components/AppNav";
import DashboardPage from "@/components/DashboardPage";
import AttendancePage from "@/components/AttendancePage";
import MembersPage from "@/components/MembersPage";
import ReportsPage from "@/components/ReportsPage";
import AchieversPage from "@/components/AchieversPage";

const Index = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-display text-2xl text-accent animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <AppNav active={activeTab} onChange={setActiveTab} />
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "dashboard" && <DashboardPage />}
        {activeTab === "attendance" && <AttendancePage />}
        {activeTab === "members" && <MembersPage />}
        {activeTab === "reports" && <ReportsPage />}
        {activeTab === "achievers" && <AchieversPage />}
      </main>
      <footer className="text-center py-4 text-muted-foreground text-xs border-t border-border mt-10 bg-secondary">
        © {new Date().getFullYear()} <span className="text-primary font-semibold">Victory Vocals Ghana</span>. All rights reserved.
      </footer>
    </div>
  );
};

export default Index;
