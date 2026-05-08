import {
  Bell,
  Search,
  Wallet,
  Moon,
  Sun,
} from "lucide-react";
import api from "../lib/axios";
import { useTheme } from "../context/ThemeContext";

export default function Navbar() {

  const { theme, toggleTheme } = useTheme();

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  return (
    <div className="sticky top-0 z-30 mb-8">

      <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl px-5 py-4 shadow-sm">

        <div className="flex items-center justify-between gap-4">

          {/* LEFT */}
          <div className="flex items-center gap-4 flex-1">

            {/* SEARCH */}
            <div className="hidden md:flex items-center gap-3 bg-gray-100 dark:bg-[#1F2937] px-4 py-3 rounded-2xl w-full max-w-md">

              <Search size={18} className="text-gray-400" />

              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent outline-none text-sm w-full"
              />

            </div>

          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3">

            {/* UNITS */}
            <div className="hidden sm:flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-lg">

              <Wallet size={16} />

              <span className="text-sm font-semibold">
                Units Available
              </span>

            </div>

            {/* NOTIFICATION */}
            <button className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-[#1F2937] flex items-center justify-center hover:scale-105 transition">
              <Bell size={18} />
            </button>

            {/* THEME */}
            <button
              onClick={toggleTheme}
              className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-[#1F2937] flex items-center justify-center hover:scale-105 transition"
            >
              {theme === "dark"
                ? <Sun size={18} />
                : <Moon size={18} />}
            </button>

            {/* USER */}
            <div className="flex items-center gap-3 bg-gray-100 dark:bg-[#1F2937] px-4 py-2 rounded-2xl">

              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold uppercase">
                {user?.firstName?.[0] || "U"}
              </div>

              <div className="hidden md:block">

                <p className="text-sm font-semibold leading-tight">
                  {user?.firstName || "User"}
                </p>

                <p className="text-xs text-gray-500 capitalize">
                  {user?.role?.replace("_", " ")}
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}