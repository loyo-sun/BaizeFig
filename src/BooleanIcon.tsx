export function BooleanIcon({
  operation,
}: {
  operation: "union" | "subtract" | "intersect" | "exclude" | "mask";
}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      {operation === "mask" ? (
        <>
          <rect
            x="2"
            y="2"
            width="14"
            height="14"
            rx="2"
            stroke="currentColor"
          />
          <path d="M9 3a6 6 0 0 0 0 12Z" fill="currentColor" />
          <circle cx="9" cy="9" r="6" stroke="currentColor" />
        </>
      ) : (
        <>
          <rect
            x="2"
            y="2"
            width="9"
            height="9"
            stroke="currentColor"
            opacity=".4"
          />
          <rect
            x="7"
            y="7"
            width="9"
            height="9"
            stroke="currentColor"
            opacity=".4"
          />
          {operation === "union" ? (
            <path d="M2 2H11V7H16V16H7V11H2Z" fill="currentColor" />
          ) : operation === "subtract" ? (
            <path d="M2 2H11V7H7V11H2Z" fill="currentColor" />
          ) : operation === "intersect" ? (
            <rect x="7" y="7" width="4" height="4" fill="currentColor" />
          ) : (
            <path
              d="M2 2H11V7H7V11H2Z M11 7H16V16H7V11H11Z"
              fill="currentColor"
            />
          )}
        </>
      )}
    </svg>
  );
}
