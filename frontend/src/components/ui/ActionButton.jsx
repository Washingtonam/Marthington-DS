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
        bg-white/10 backdrop-blur-lg border border-white/20
        text-white hover:bg-white/15 hover:border-white/30
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        shadow-lg hover:shadow-xl
        ${className}
      `}
    >
      {Icon && <Icon size={24} className="text-blue-300 group-hover:text-blue-200 transition" />}
      {title && <span className="text-sm font-semibold text-center">{title}</span>}
      {children}
    </motion.button>
  );
}
