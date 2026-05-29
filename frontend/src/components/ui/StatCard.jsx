export default function StatCard({
  title,
  value,
  icon,
  color = "blue",
  subtitle,
  glassEffect = false,
}) {

  const colors = {
    blue: "from-blue-600 to-indigo-600",
    green: "from-green-600 to-emerald-600",
    red: "from-red-600 to-rose-600",
    purple: "from-purple-600 to-violet-600",
  };

  return (
    <div className={`
      relative overflow-hidden rounded-3xl p-6 text-white
      ${glassEffect 
        ? "bg-white/50 backdrop-blur-lg border border-white/20 text-gray-900" 
        : `bg-gradient-to-br ${colors[color]}`
      }
      shadow-xl hover:shadow-2xl transition-shadow duration-200
    `}>

      {/* glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

      <div className="relative z-10">

        <div className="flex justify-between items-start">

          <div>

            <p className={`text-sm mb-2 ${glassEffect ? "text-gray-600" : "text-white/70"}`}>
              {title}
            </p>

            <h2 className={`text-4xl font-bold tracking-tight ${glassEffect ? "text-gray-900" : "text-white"}`}>
              {value}
            </h2>

            {subtitle && (
              <p className={`text-xs mt-2 ${glassEffect ? "text-gray-600" : "text-white/70"}`}>
                {subtitle}
              </p>
            )}

          </div>

          <div className={`p-3 rounded-2xl backdrop-blur ${glassEffect ? "bg-blue-500/20" : "bg-white/10"}`}>
            {icon}
          </div>

        </div>

      </div>

    </div>
  );
}