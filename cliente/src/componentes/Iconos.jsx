function Trazo({ children }) {
  return (
    <svg
      className="icono"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function Microfono() {
  return (
    <Trazo>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      <path d="M8 21h8" />
    </Trazo>
  )
}

export function Camara() {
  return (
    <Trazo>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </Trazo>
  )
}

export function Lapiz() {
  return (
    <Trazo>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
      <path d="M14.5 5.5l4 4" />
    </Trazo>
  )
}

export function Tilde() {
  return (
    <Trazo>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Trazo>
  )
}
