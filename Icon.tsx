/** 線のアイコン（外部ライブラリなし） */
const PATHS = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2',
  plus: 'M12 5v14M5 12h14',
  palette:
    'M12 3a9 9 0 0 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.7-1.3-.7-2.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.2-4-7.6-9-7.6ZM7.5 11.5h.01M10 7.5h.01M14.5 7.5h.01M17 11h.01',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7.5 8.5c.8-3.5 3.8-5.5 7.5-5.5s6.7 2 7.5 5.5',
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  redo: 'm15 14 5-5-5-5m5 5H9.5a5.5 5.5 0 0 0 0 11H13',
  bucket: 'M19 11 11 3 3.5 10.5a2 2 0 0 0 0 2.8l5.2 5.2a2 2 0 0 0 2.8 0L19 11Zm0 0H5m15 4s-1.5 2-1.5 3a1.5 1.5 0 0 0 3 0c0-1-1.5-3-1.5-3Z',
  brush: 'M18.4 2.6a2 2 0 0 1 2.9 2.9L12 14.8 9.2 12l9.2-9.4ZM9 13.5c-2.2 0-3.5 1.6-3.5 3.6 0 1.3-.8 2.4-2.5 2.9 1 .7 2.4 1 3.6 1 2.9 0 4.9-2 4.9-4.6',
  eraser: 'M7 21h13M16.5 3.5l4 4a1.5 1.5 0 0 1 0 2.1L10 20H6.5l-3-3a1.5 1.5 0 0 1 0-2.1L14.4 3.5a1.5 1.5 0 0 1 2.1 0ZM9 10l5 5',
  hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-6.5a1.5 1.5 0 0 1 3 0V11m0-5a1.5 1.5 0 0 1 3 0v5m0-3a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1.2a6 6 0 0 1-4.6-2.2L4.6 15a1.6 1.6 0 0 1 2.4-2l1 1',
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5 10 17 19 7',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  share: 'M12 15V3m0 0L8 7m4-4 4 4M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
  download: 'M12 3v12m0 0-4-4m4 4 4-4M5 19h14',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4V8Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  image: 'M4 5h16v14H4V5Zm0 11 4.5-4.5 3.5 3.5 2.5-2.5L20 18M15.5 9.5h.01',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm6.5 11 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  zoomIn: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2M11 8v6M8 11h6',
  zoomOut: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2M8 11h6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  trash: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13',
  sliders: 'M4 6h10m4 0h2M4 12h4m4 0h8M4 18h12m4 0h0M16 4v4M10 10v4M18 16v4',
  leaf: 'M5 19C5 10 10 5 20 4c0 9-5 15-14 15Zm0 0 7-7',
  shield: 'M12 3 5 6v5.5c0 4.2 3 8 7 9.5 4-1.5 7-5.3 7-9.5V6l-7-3Z',
  flame: 'M12 21c-3.6 0-6-2.5-6-5.8 0-3.6 3-5.6 3.6-9.2 2 1.2 3.4 3.4 3.4 5.5 1-.8 1.6-2 1.7-3.3C17 9.8 18 12.6 18 15.2 18 18.5 15.6 21 12 21Z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, className, stroke = 1.7 }: { name: IconName; size?: number; className?: string; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
