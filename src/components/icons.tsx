import React from "react";

const S = ({ children, size = 20, className = "", fill = false }: { children: React.ReactNode; size?: number; className?: string; fill?: boolean }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"}
    strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden
  >
    {children}
  </svg>
);

type P = { size?: number; className?: string };
export const IcSparkle = (p: P) => <S {...p} fill><path d="M12 2.2c.75 5 2.4 7.1 7.6 7.8-5.2.7-6.85 2.8-7.6 7.8-.75-5-2.4-7.1-7.6-7.8 5.2-.7 6.85-2.8 7.6-7.8z" /><circle cx="19" cy="17.5" r="2.1" /></S>;
export const IcCalendar = (p: P) => <S {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4" /></S>;
export const IcClock = (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3.2 2" /></S>;
export const IcUsers = (p: P) => <S {...p}><circle cx="9" cy="8.5" r="3.2" /><path d="M3.2 19.5c.7-3.2 2.9-4.9 5.8-4.9s5.1 1.7 5.8 4.9" /><circle cx="16.8" cy="7.8" r="2.4" /><path d="M17.8 14.4c2 .5 3.2 1.9 3.6 4" /></S>;
export const IcUser = (p: P) => <S {...p}><circle cx="12" cy="8" r="3.4" /><path d="M5.3 19.7c.8-3.5 3.5-5.4 6.7-5.4s5.9 1.9 6.7 5.4" /></S>;
export const IcChart = (p: P) => <S {...p}><path d="M3.5 20.5h17" /><path d="M5.5 20.5v-7M10.5 20.5V5.5M15.5 20.5v-10M20.5 20.5V9" /></S>;
export const IcBell = (p: P) => <S {...p}><path d="M6 9.5a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10.3 19.5a1.9 1.9 0 0 0 3.4 0" /></S>;
export const IcSliders = (p: P) => <S {...p}><path d="M4 7h16M4 12h16M4 17h16" /><circle cx="15" cy="7" r="2" fill="var(--sl-bg,#fff)" /><circle cx="9" cy="12" r="2" fill="var(--sl-bg,#fff)" /><circle cx="13" cy="17" r="2" fill="var(--sl-bg,#fff)" /></S>;
export const IcLink = (p: P) => <S {...p}><path d="M9.5 14.5a4 4 0 0 0 6 .4l2.6-2.6a4 4 0 1 0-5.7-5.7L11.2 7.8" /><path d="M14.5 9.5a4 4 0 0 0-6-.4l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.2-1.2" /></S>;
export const IcPlus = (p: P) => <S {...p}><path d="M12 5v14M5 12h14" /></S>;
export const IcPen = (p: P) => <S {...p}><path d="M4 20l1-4L16.5 4.5a2.12 2.12 0 0 1 3 3L8 19l-4 1z" /></S>;
export const IcTrash = (p: P) => <S {...p}><path d="M4 7h16M9.5 7V4.5h5V7" /><path d="M6.5 7l1 13.5h9l1-13.5" /><path d="M10 11v6M14 11v6" /></S>;
export const IcCheck = (p: P) => <S {...p}><path d="M5 12.5l4.5 4.5L19 7" /></S>;
export const IcX = (p: P) => <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>;
export const IcArrowR = (p: P) => <S {...p}><path d="M4 12h15M13.5 6l6 6-6 6" /></S>;
export const IcArrowL = (p: P) => <S {...p}><path d="M20 12H5M10.5 6l-6 6 6 6" /></S>;
export const IcPhone = (p: P) => <S {...p}><path d="M5 4h4l1.6 4.2L8.2 10a12.5 12.5 0 0 0 5.8 5.8l1.8-2.4L20 15v4a2 2 0 0 1-2.2 2A17 17 0 0 1 3 6.2 2 2 0 0 1 5 4z" /></S>;
export const IcCoin = (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9.5 16.5v-9h3.6a2.7 2.7 0 0 1 0 5.4H8" /></S>;
export const IcLock = (p: P) => <S {...p}><rect x="5.5" y="10.5" width="13" height="10" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></S>;
export const IcStar = (p: P) => <S {...p} fill><path d="M12 3.4l2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.6l5.9-.9z" /></S>;
export const IcShield = (p: P) => <S {...p}><path d="M12 3l7 2.8V12c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V5.8z" /><path d="M9 12l2 2 4-4.5" /></S>;
export const IcBoost = (p: P) => <S {...p}><path d="M3.5 17.5l5.5-5.5 3.8 3.8L20 8.5" /><path d="M14.5 8.5H20V14" /></S>;
export const IcDownload = (p: P) => <S {...p}><path d="M12 3.5V15M7.5 10.5L12 15l4.5-4.5" /><path d="M4.5 19.5h15" /></S>;
export const IcLogout = (p: P) => <S {...p}><path d="M9.5 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3.5" /><path d="M15 8l4 4-4 4M19 12H9.5" /></S>;
export const IcSearch = (p: P) => <S {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></S>;
export const IcCopy = (p: P) => <S {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /></S>;
export const IcScissors = (p: P) => <S {...p}><circle cx="6" cy="6.5" r="2.5" /><circle cx="6" cy="17.5" r="2.5" /><path d="M8.2 8.2L20 19M8.2 15.8L20 5" /></S>;
export const IcExternal = (p: P) => <S {...p}><path d="M14 4h6v6M20 4l-9 9" /><path d="M9 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" /></S>;
export const IcBan = (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><path d="M6.2 6.2l11.6 11.6" /></S>;
export const IcWallet = (p: P) => <S {...p}><path d="M4 7.5V7a2 2 0 0 1 2-2h13.5" /><rect x="3.5" y="7.5" width="17" height="12" rx="2" /><circle cx="16.7" cy="13.5" r="1.3" fill="currentColor" stroke="none" /></S>;
export const IcHome = (p: P) => <S {...p}><path d="M4 11l8-7.5L20 11" /><path d="M6 10v10.5h12V10" /></S>;
export const IcEye = (p: P) => <S {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></S>;
export const IcPin = (p: P) => <S {...p}><path d="M12 21s-6.5-5.3-6.5-10a6.5 6.5 0 0 1 13 0c0 4.7-6.5 10-6.5 10z" /><circle cx="12" cy="11" r="2.2" /></S>;
export const IcCrown = (p: P) => <S {...p}><path d="M4 8.5l4 3 4-6 4 6 4-3-1.5 9.5h-13z" /></S>;
export const IcStore = (p: P) => <S {...p}><path d="M4 10v10h16V10" /><path d="M3 6.5L4.5 3h15L21 6.5c0 1.4-1.1 2.5-2.5 2.5S16 7.9 16 6.5c0 1.4-1.1 2.5-2.5 2.5h-3C9.1 9 8 7.9 8 6.5 8 7.9 6.9 9 5.5 9S3 7.9 3 6.5z" /><path d="M9.5 20v-5.5h5V20" /></S>;
export const IcGift = (p: P) => <S {...p}><rect x="4" y="8.5" width="16" height="12" rx="1.5" /><path d="M4 12.5h16M12 8.5v12" /><path d="M12 8.5c-1.5-4.5-6.5-4.5-6.5-1.2 0 2 3 .9 6.5 1.2zm0 0c1.5-4.5 6.5-4.5 6.5-1.2 0 2-3 .9-6.5 1.2z" /></S>;
export const IcHeart = (p: P) => <S {...p}><path d="M12 20s-7.5-4.6-9.3-9.2C1.5 7.6 3.6 4.5 6.8 4.5c2 0 3.7 1.1 5.2 3 1.5-1.9 3.2-3 5.2-3 3.2 0 5.3 3.1 4.1 6.3C19.5 15.4 12 20 12 20z" /></S>;
export const IcLifeBuoy = (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /><path d="M6 6l3.5 3.5M18 6l-3.5 3.5M18 18l-3.5-3.5M6 18l3.5-3.5" /></S>;
export const IcInbox = (p: P) => <S {...p}><path d="M3.5 13.5L6 5.5h12l2.5 8" /><path d="M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></S>;
export const IcDots = (p: P) => <S {...p} fill><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></S>;
export const IcChat = (p: P) => <S {...p}><path d="M21 11.5a7.5 7.5 0 0 1-7.5 7.5c-1.2 0-2.4-.28-3.4-.8L4 20l1.6-4.3A7.5 7.5 0 1 1 21 11.5z" /><path d="M8.5 10.5h7M8.5 13.5h4.5" /></S>;
export const IcCloud = (p: P) => <S {...p}><path d="M7 18.5a4.5 4.5 0 1 1 .9-8.9A6 6 0 0 1 19.6 11.6a3.7 3.7 0 0 1-1.1 6.9z" /></S>;
