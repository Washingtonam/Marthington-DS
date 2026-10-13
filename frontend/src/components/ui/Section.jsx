/**
 * Section - Container component for organizing dashboard sections
 * Includes optional header with title and action buttons
 */
export default function Section({ 
  title, 
  subtitle, 
  children, 
  actions, 
  className = "",
  headerClassName = ""
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className={`flex items-start justify-between ${headerClassName}`}>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      <div>
        {children}
      </div>
    </div>
  );
}
