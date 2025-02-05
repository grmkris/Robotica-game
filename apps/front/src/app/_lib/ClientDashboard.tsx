"use client";

import type React from "react";

interface DashboardProps {
  children?: React.ReactNode;
}

export const ClientDashboard: React.FC<DashboardProps> = ({ children }) => {
  return <>{children}</>;
};
