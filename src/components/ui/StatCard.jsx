export default function StatCard({
  title,
  value,
  icon,
  color = "blue",
  subtitle,
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
      bg-gradient-to-br ${colors[color]}
      shadow-xl
    `}>

      {/* glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

      <div className="relative z-10">

        <div className="flex justify-between items-start">

          <div>

            <p className="text-sm text-white/70 mb-2">
              {title}
            </p>

            <h2 className="text-4xl font-bold tracking-tight">
              {value}
            </h2>

            {subtitle && (
              <p className="text-xs text-white/70 mt-2">
                {subtitle}
              </p>
            )}

          </div>

          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur">
            {icon}
          </div>

        </div>

      </div>

    </div>
  );
}