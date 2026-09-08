import type { SVGProps } from 'react';

/**
 * Hand-rolled, stroke-based icon set rather than a dependency: the dashboard needs
 * roughly a dozen glyphs, and every one here inherits `currentColor` and the
 * caller's size class, so they theme themselves. Keep new icons on the same
 * 24×24 grid with 1.75 stroke width so they stay optically consistent.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7.5" height="8.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="2" />
      <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="2" />
      <rect x="3" y="14.5" width="7.5" height="6.5" rx="2" />
    </Icon>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 9.5V19a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V9.5" />
      <path d="M2.6 9.5 4.2 4.6A2 2 0 0 1 6.1 3.2h11.8a2 2 0 0 1 1.9 1.4l1.6 4.9a3 3 0 0 1-5.7 1.4 3 3 0 0 1-5.7 0 3 3 0 0 1-5.7-1.4Z" />
      <path d="M9.5 21v-4.5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2V21" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5a8.5 8.5 0 1 0 10.8 10.8Z" />
    </Icon>
  );
}

export function MonitorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="4" width="19" height="12.5" rx="2" />
      <path d="M8.5 20.5h7M12 16.5v4" />
    </Icon>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 4.5h2.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H15" />
      <path d="M10 16.5 5.5 12 10 7.5M5.5 12h9" />
    </Icon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.5 6 8.5 12l6 6" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9.5 6 6 6-6 6" />
    </Icon>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="m12 3.6 2.55 5.17 5.7.83-4.12 4.02.97 5.68L12 16.62l-5.1 2.68.97-5.68L3.75 9.6l5.7-.83Z"
        fill="currentColor"
        stroke="none"
      />
    </Icon>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.6 3.5H5.2a2 2 0 0 0-2 2.2c.5 5 2.6 8.8 5.4 11.6 2.8 2.8 6.6 4.9 11.6 5.4a2 2 0 0 0 2.2-2v-2.4a1.5 1.5 0 0 0-1.2-1.5l-3-.6a1.5 1.5 0 0 0-1.5.6l-1 1.3a13.5 13.5 0 0 1-6.2-6.2l1.3-1a1.5 1.5 0 0 0 .6-1.5l-.6-3a1.5 1.5 0 0 0-1.2-1.4Z" />
    </Icon>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M12 7v5.2l3.2 2" />
    </Icon>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 3.5h13v17l-2.6-1.7-2.6 1.7-2.6-1.7-2.6 1.7Z" />
      <path d="M9 8.5h6M9 12.5h6" />
    </Icon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16.5v-4M12.5 16.5v-8M17 16.5v-5.5" />
    </Icon>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 11V5.4a2 2 0 0 1 2-2H11a2 2 0 0 1 1.4.6l7.6 7.6a2 2 0 0 1 0 2.8l-5.6 5.6a2 2 0 0 1-2.8 0L4.1 12.4a2 2 0 0 1-.6-1.4Z" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4.5h5.5V10M19 5l-7.5 7.5" />
      <path d="M18 14.5v4a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M12 11v5.2" />
      <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.75" />
      <path d="m16 16 4.5 4.5" />
    </Icon>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 5.5h17M6.5 12h11M10 18.5h4" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.25" y="5" width="17.5" height="16" rx="3" />
      <path d="M3.25 10h17.5M8 3v4M16 3v4" />
    </Icon>
  );
}

export function SheetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.25" y="4" width="17.5" height="16" rx="3" />
      <path d="M3.25 9.5h17.5M9.5 9.5V20M3.25 15h17.5" />
    </Icon>
  );
}

export function PrinterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 9V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V9" />
      <path d="M6 18H5a2 2 0 0 1-2-2v-4.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V16a2 2 0 0 1-2 2h-1" />
      <rect x="7" y="14" width="10" height="6.5" rx="1" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5v11M8 11l4 3.75L16 11" />
      <path d="M4 17v1.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V17" />
    </Icon>
  );
}

export function BikeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5.75" cy="17" r="3.25" />
      <circle cx="18.25" cy="17" r="3.25" />
      <path d="M9 17h5.5l-3-8.5H9M13.5 8.5h4l1.5 8" />
    </Icon>
  );
}

export function BagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 8h14l-1 11.5a2 2 0 0 1-2 1.8H8a2 2 0 0 1-2-1.8Z" />
      <path d="M9 8V6.25a3 3 0 0 1 6 0V8" />
    </Icon>
  );
}

/** The mark used in the sidebar and on the login card — an "S" cut from a rounded
 * square, drawn in the caller's colour so it works on the brand gradient and on a
 * plain surface alike. */
export function SwitchMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...props}>
      <path
        d="M16.4 7.6c-.9-1-2.4-1.6-4.2-1.6-2.6 0-4.3 1.1-4.3 2.8 0 1.5 1.2 2.3 3.9 2.7l1.4.2c2.9.4 4.4 1.5 4.4 3.5 0 2.2-2.1 3.8-5.3 3.8-2.3 0-4.2-.7-5.3-2"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
