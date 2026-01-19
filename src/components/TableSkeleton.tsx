interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          backgroundColor: "white",
          border: "1px solid #ddd",
          borderRadius: "4px",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#f8f9fa" }}>
            {Array.from({ length: columns }).map((_, i) => (
              <th
                key={i}
                style={{
                  padding: "0.75rem",
                  textAlign: "left",
                  borderBottom: "2px solid #ddd",
                }}
              >
                <div
                  style={{
                    height: "16px",
                    backgroundColor: "#e0e0e0",
                    borderRadius: "4px",
                    width: i === 0 ? "60%" : "40%",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} style={{ borderBottom: "1px solid #eee" }}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} style={{ padding: "0.75rem" }}>
                  <div
                    style={{
                      height: "20px",
                      backgroundColor: "#f0f0f0",
                      borderRadius: "4px",
                      width: colIdx === 0 ? "70%" : colIdx === columns - 1 ? "30%" : "50%",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}



