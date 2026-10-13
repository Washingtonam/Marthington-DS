import { motion } from "framer-motion";

export default function ActionButton({
  children,
  onClick,
  icon: Icon,
  className = "",
  disabled = false,
  title,
}) {
  return (
    <motion.button
      whileHover={{ y: -6 }}
      whileTap={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative group
        flex flex-col items-center gap-2
        px-4 py-5 rounded-2xl
        bg-slate-50 border border-slate-200 text-slate-900
        dark:bg-white/10 dark:border-white/20 dark:text-white
        hover:bg-slate-100 dark:hover:bg-white/15 dark:hover:border-white/30
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        shadow-lg hover:shadow-xl
        ${className}
      `}
    >
      {Icon && (
        <Icon
          size={24}
          className="text-slate-400 group-hover:text-slate-600 dark:text-blue-300 dark:group-hover:text-blue-200 transition"
        />
      )}
      {title && (
        <span className="text-sm font-semibold text-center text-slate-900 dark:text-white">{title}</span>
      )}
      {children}
    </motion.button>
  );
}
