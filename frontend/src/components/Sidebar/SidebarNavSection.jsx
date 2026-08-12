/**
 * SidebarNavSection - Groups related navigation items with a section header
 * Displays a colored dot and section title when sidebar is open
 */
export default function SidebarNavSection({ title, dotColor = "blue", open, children }) {
  const colorClasses = {
    blue: "bg-blue-500",
    yellow: "bg-yellow-400",
    green: "bg-green-500",
    red: "bg-red-500",
  };

  return (
    <div>
      <div className="flex items-center gap-2 px-2 mb-3">
        <div className={`w-1.5 h-1.5 rounded-full ${colorClasses[dotColor]}`} />
        <p
          className={`text-[10px] uppercase tracking-[0.2em] text-white/40 whitespace-nowrap ${
            !open && "hidden"
          }`}
        >
          {title}
        </p>
      </div>

      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
