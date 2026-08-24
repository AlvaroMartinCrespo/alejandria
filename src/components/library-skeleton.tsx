export function LibrarySkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-page" aria-label="Cargando biblioteca" aria-busy="true">
      <div className="skeleton skeleton-heading" />
      <div className="skeleton skeleton-feature" />
      <div className="skeleton-list">
        {Array.from({ length: rows }, (_, index) => (
          <div className="skeleton-row" key={index}>
            <span className="skeleton skeleton-cover" />
            <span><i className="skeleton" /><i className="skeleton short" /></span>
          </div>
        ))}
      </div>
    </div>
  );
}