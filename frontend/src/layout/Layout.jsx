import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

export default function Layout({ children }) {
  // Synchronize dynamic expansion track state with desktop default layouts
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  // Monitor layout shifts and broadcast responsive margins seamlessly
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    // Global listener checking window dimension states
    const checkSidebarState = () => {
      // Small timeout lets Sidebar state sync natively across memory allocations
      setTimeout(() => {
        const desktopOpen = window.innerWidth >= 1024;
        // Verify state flags directly against DOM classes if custom synchronization is required
        const backdrop = document.querySelector(".fixed.inset-0.bg-black\\/60");
        if (!desktopOpen) {
          setSidebarOpen(!!backdrop);
        }
      }, 50);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("click", checkSidebarState);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("click", checkSidebarState);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0B1120] transition-colors duration-300">
      
      {/* SIDEBAR CONTEXT HUB */}
      <Sidebar />

      {/* MAIN LAYOUT CANVAS — DYNAMIC CONTAINER PADDING SLIDE */}
      <main 
        className={`min-h-screen transition-all duration-300 ${
          sidebarOpen 
            ? "lg:ml-[310px]" 
            : "lg:ml-[85px]"
        }`}
      >
        {/* TOP STATUS CONTROL BAR */}
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 dark:bg-[#0F172A]/70 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between px-6 py-4 pl-20 lg:pl-6"> {/* Added mobile padding buffer to clear floating hamburger icon */}
            <div>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
                Xcombinator Platform
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Identity Verification Infrastructure
              </p>
            </div>

            {/* PIPELINE ACTIVITY MONITOR STATUS */}
            <div className="hidden md:flex items-center gap-2 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 px-4 py-2 rounded-2xl text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              System Active
            </div>
          </div>
        </div>

        {/* INJECTED ROUTE SPECIFIC RENDER INTERFACES */}
        <div className="p-4 md:p-6 lg:p-8 animate-fadeIn">
          {children}
        </div>
      </main>

    </div>
  );
}