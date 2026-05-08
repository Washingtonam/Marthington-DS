export default function Card({
  children,
  className = "",
}) {
  return (
    <div className={`card-ui p-5 ${className}`}>
      {children}
    </div>
  );
}