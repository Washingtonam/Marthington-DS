import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleToggle = (e) => {
      setSidebarOpen(e.detail);
    };

    window.addEventListener("sidebar-toggle", handleToggle);
    return () => {
      window.removeEventListener("sidebar-toggle", handleToggle);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0B1120] transition-colors duration-300 flex">
      
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN VIEWPORT WORKSPACE — FORCED VIA INLINE STYLE MARGINS */}
      <main 
        className="min-h-screen flex-1 transition-all duration-300"
        style={{
          paddingLeft: window.innerWidth >= 1024 ? (sidebarOpen ? "310px" : "85px") : "0px"
        }}
      >
        {/* TOP STATUS CONTROL BAR */}
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 dark:bg-[#0F172A]/70 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between px-6 py-4 pl-20 lg:pl-6">
            <div>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
                Xcombinator Platform
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Identity Verification Infrastructure
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 px-4 py-2 rounded-2xl text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              System Active
            </div>
          </div>
        </div>

        {/* INJECTED PAGE BODY */}
        <div className="p-4 md:p-6 lg:p-8 animate-fadeIn">
          {children}
        </div>
      </main>

    </div>
  );
}