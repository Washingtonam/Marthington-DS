/**
 * Card - Reusable card component with consistent styling and variants
 * Used throughout dashboards for organizing content
 */
export default function Card({
  children,
  className = "",
  elevated = true,
  interactive = false,
  variant = "default",
}) {
  const baseClasses = "rounded-2xl border transition-all";
  
  const variantClasses = {
    default: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900",
    glass: "border-white/10 bg-white/5 dark:bg-slate-900/50 backdrop-blur-xl",
    ghost: "border-transparent bg-transparent",
  };

  const elevatedClass = elevated ? "shadow-md hover:shadow-lg" : "shadow-none";
  const interactiveClass = interactive ? "hover:scale-105 cursor-pointer" : "";

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${elevatedClass} ${interactiveClass} p-6 ${className}`}>
      {children}
    </div>
  );
}