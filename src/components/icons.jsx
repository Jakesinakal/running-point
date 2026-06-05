// Ikon garis tipis untuk Running Point (stroke mengikuti currentColor).
// Diporting dari desain Claude Design.
function Ic({ size = 20, fill, sw = 1.7, children, vb = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${vb} ${vb}`}
      fill={fill || 'none'}
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export const IconSun = (p) => (
  <Ic {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Ic>
)
export const IconMoon = (p) => (
  <Ic {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Ic>
)
export const IconTarget = (p) => (
  <Ic {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
  </Ic>
)
export const IconClose = (p) => (
  <Ic {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Ic>
)
export const IconRoute = (p) => (
  <Ic {...p}>
    <circle cx="6" cy="18" r="2.6" />
    <circle cx="18" cy="6" r="2.6" />
    <path d="M8.5 18H14a3.5 3.5 0 0 0 0-7H10a3.5 3.5 0 0 1 0-7h5.5" />
  </Ic>
)
export const IconPin = (p) => (
  <Ic {...p}>
    <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.4" />
  </Ic>
)
export const IconClock = (p) => (
  <Ic {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Ic>
)
export const IconCheck = (p) => (
  <Ic {...p} sw={2.4}>
    <path d="M5 12.5 10 17 19 7" />
  </Ic>
)
export const IconSliders = (p) => (
  <Ic {...p}>
    <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
    <circle cx="16" cy="8" r="2.2" />
    <circle cx="8" cy="16" r="2.2" />
  </Ic>
)
export const IconChevronLeft = (p) => (
  <Ic {...p}>
    <path d="M15 18l-6-6 6-6" />
  </Ic>
)
export const IconRunner = (p) => (
  <Ic {...p} sw={1.8}>
    <circle cx="15.5" cy="5" r="1.8" />
    <path d="M5 13l3-2 3 1 1.5 3M12.5 12l-1.5 3 3 4M11 16l-3 4M14 9l-2.5 1.5L9 9" />
  </Ic>
)
