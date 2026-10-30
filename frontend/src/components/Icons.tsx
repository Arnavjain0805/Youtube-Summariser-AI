interface IconProps {
  className?: string
}

function svg(path: React.ReactNode, className?: string) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'h-5 w-5'}
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

export const SunIcon = ({ className }: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
    </>,
    className,
  )

export const MoonIcon = ({ className }: IconProps) =>
  svg(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />, className)

export const PlusIcon = ({ className }: IconProps) =>
  svg(<path d="M12 5v14M5 12h14" />, className)

export const HistoryIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </>,
    className,
  )

export const SettingsIcon = ({ className }: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h0a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
    </>,
    className,
  )

export const KeyIcon = ({ className }: IconProps) =>
  svg(
    <path d="M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8Zm0 0L15.5 7m0 0 3 3L22 6l-3-3-3.5 4Z" />,
    className,
  )

export const UserIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>,
    className,
  )

export const LogoutIcon = ({ className }: IconProps) =>
  svg(
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />,
    className,
  )

export const SendIcon = ({ className }: IconProps) =>
  svg(<path d="m22 2-7 20-4-9-9-4Z M22 2 11 13" />, className)

export const CopyIcon = ({ className }: IconProps) =>
  svg(
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>,
    className,
  )

export const CheckIcon = ({ className }: IconProps) =>
  svg(<path d="M20 6 9 17l-5-5" />, className)

export const TrashIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6m4-6v6" />
    </>,
    className,
  )

export const MenuIcon = ({ className }: IconProps) =>
  svg(<path d="M4 6h16M4 12h16M4 18h16" />, className)

export const CloseIcon = ({ className }: IconProps) =>
  svg(<path d="M18 6 6 18M6 6l12 12" />, className)

export const PlayIcon = ({ className }: IconProps) =>
  svg(<path d="M6 4.5v15l13-7.5-13-7.5Z" />, className)

export const SpinnerIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className ?? 'h-5 w-5 animate-spin'}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
    <path
      d="M22 12a10 10 0 0 0-10-10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
)

export const LogoMark = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className ?? 'h-6 w-6'} aria-hidden="true">
    <path d="M8.5 3.5v17l13-8.5-13-8.5Z" opacity="0.95" />
    <rect x="3" y="4" width="3.2" height="16" rx="1.2" />
  </svg>
)
