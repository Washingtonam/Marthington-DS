import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";

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

        {/* FOOTER */}
        <Footer />
      </main>

      {/* Floating WhatsApp Contact Button */}
      <a
        href="https://wa.me/2348179736442"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-xl flex items-center justify-center"
        title="Contact us on WhatsApp"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
          <path d="M20.52 3.48A11.88 11.88 0 0012.03 0C5.38 0 .02 5.36.02 12c0 2.11.55 4.17 1.6 5.99L0 24l6.25-1.63A11.9 11.9 0 0012.03 24c6.65 0 12.01-5.36 12.01-12 0-3.21-1.25-6.22-3.52-8.52zM12.03 21.5a9.38 9.38 0 01-4.79-1.29l-.34-.21-3.71.97.99-3.62-.22-.36A9.28 9.28 0 012.75 12c0-5.02 4.08-9.1 9.08-9.1 2.43 0 4.71.95 6.43 2.68 1.71 1.72 2.66 4 2.66 6.42 0 5-4.08 9.1-9.07 9.1z" />
          <path d="M17.2 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.18.2-.36.225-.66.075-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.65-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2 0-.37-.05-.52-.05-.15-.67-1.62-.92-2.21-.24-.57-.48-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.075-.8.37-.27.3-1.05 1.03-1.05 2.5 0 1.48 1.08 2.93 1.23 3.13.15.2 2.13 3.4 5.17 4.77 3.04 1.37 3.04.91 3.58.85.54-.06 1.77-.72 2.02-1.42.25-.7.25-1.3.175-1.42-.07-.12-.27-.18-.57-.33z" />
        </svg>
      </a>
    </div>
  );
}