export default function Button({
  children,
  onClick,
  className = "",
  variant = "primary",
  disabled = false,
  type = "button",
  style,
}) {
  const styles = {
    primary: "btn-primary",
    secondary: "btn-secondary",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`
        ${styles[variant]}
        disabled:opacity-50
        disabled:cursor-not-allowed
        transition
        ${className}
      `}
    >
      {children}
    </button>
  );
}