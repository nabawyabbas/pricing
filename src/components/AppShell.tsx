"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppShellProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ title, actions, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div
        style={{
          flex: 1,
          marginLeft: 0,
          transition: "margin-left 0.3s ease-in-out",
        }}
        className="md:ml-[250px]"
      >
        <Topbar title={title} actions={actions} onMenuToggle={setSidebarOpen} />
        
        <main
          style={{
            padding: "2rem",
            maxWidth: "100%",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}



