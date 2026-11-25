import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Curated Flaticon "Lineal Color" Editorial Icon System — Soft UINSU Sage-Mint Edition.
 * - Uniform 2.4px deep forest-charcoal outlines (#1C2620)
 * - Soft UINSU Sage-Mint (#86CFA2), Soft Sage Paper (#E4F2E7), Deep UINSU Emerald (#1E7F54),
 *   Warm Cream (#FBF8F1), Warm Amber (#FCE8B2), Soft Coral (#F6C7C4 / #DC433B)
 */

// 1. Biometric Face Scan — Lineal Color Viewfinder
export const IconFaceScan: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
    <rect x="9" y="9" width="30" height="30" rx="7" fill="#E4F2E7" />
    <path d="M7 16V10C7 8.34 8.34 7 10 7H16" stroke="#1C2620" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M41 16V10C41 8.34 39.66 7 38 7H32" stroke="#1C2620" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 32V38C7 39.66 8.34 41 10 41H16" stroke="#1C2620" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M41 32V38C41 39.66 39.66 41 38 41H32" stroke="#1C2620" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="24" cy="20" r="6" fill="#FBF8F1" stroke="#1C2620" strokeWidth="2.4" />
    <path d="M14.5 34.5C15.5 29.8 19.2 27.5 24 27.5C28.8 27.5 32.5 29.8 33.5 34.5" fill="#86CFA2" stroke="#1C2620" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="11" y1="23.5" x2="37" y2="23.5" stroke="#1E7F54" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3 3" />
  </svg>
);

// 2. GPS Radar & Geofence Pin — Lineal Color
export const IconGpsRadar: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
    <ellipse cx="24" cy="36.5" rx="16" ry="5.5" fill="#E4F2E7" stroke="#1C2620" strokeWidth="2.4" />
    <ellipse cx="24" cy="36.5" rx="8.5" ry="2.6" fill="#1E7F54" fillOpacity="0.22" stroke="#1E7F54" strokeWidth="1.6" />
    <path d="M24 7C17.37 7 12 12.2 12 18.6C12 26.8 24 36.5 24 36.5C24 36.5 36 26.8 36 18.6C36 12.2 30.63 7 24 7Z" fill="#86CFA2" stroke="#1C2620" strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="24" cy="18.5" r="5" fill="#FBF8F1" stroke="#1C2620" strokeWidth="2.3" />
    <circle cx="24" cy="18.5" r="1.8" fill="#1E7F54" />
  </svg>
);

// 3. Student Academic ID Card — Lineal Color
export const IconStudentCard: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
    <rect x="20" y="5" width="8" height="6" rx="2" fill="#1E7F54" stroke="#1C2620" strokeWidth="2.3" />
    <rect x="7" y="10" width="34" height="32" rx="5" fill="#FBF8F1" stroke="#1C2620" strokeWidth="2.5" />
    <path d="M7 15C7 12.24 9.24 10 12 10H36C38.76 10 41 12.24 41 15V18H7V15Z" fill="#86CFA2" stroke="#1C2620" strokeWidth="2.4" />
    <rect x="12" y="22.5" width="11" height="14" rx="2.5" fill="#E4F2E7" stroke="#1C2620" strokeWidth="2" />
    <circle cx="17.5" cy="27.2" r="2.3" fill="#1C2620" />
    <path d="M14.2 34C14.7 31.8 16 31 17.5 31C19 31 20.3 31.8 20.8 34" stroke="#1C2620" strokeWidth="2" strokeLinecap="round" />
    <line x1="27" y1="25" x2="36" y2="25" stroke="#1C2620" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="27" y1="30" x2="34" y2="30" stroke="#4B5750" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="27" y1="35" x2="35" y2="35" stroke="#4B5750" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 4. Academic Governance Crest (UU PDP & Integrity) — Lineal Color
export const IconAcademicShield: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
    <path d="M24 6L9.5 11.2V22.8C9.5 32.4 15.8 39.2 24 42.5C32.2 39.2 38.5 32.4 38.5 22.8V11.2L24 6Z" fill="#E4F2E7" stroke="#1C2620" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M24 8.5V39.8C30.8 36.8 35.8 31 35.8 22.8V12.8L24 8.5Z" fill="#86CFA2" />
    <circle cx="24" cy="23.5" r="7.5" fill="#FBF8F1" stroke="#1C2620" strokeWidth="2.3" />
    <path d="M20.5 23.6L22.9 26L27.8 21.1" stroke="#1E7F54" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 5. Official Verification Seal — Lineal Color
export const IconVerifiedCheck: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
    <path d="M17 31L13.5 42.5L24 38.5L34.5 42.5L31 31" fill="#86CFA2" stroke="#1C2620" strokeWidth="2.4" strokeLinejoin="round" />
    <circle cx="24" cy="21" r="14.5" fill="#CDEBD6" stroke="#1C2620" strokeWidth="2.5" />
    <circle cx="24" cy="21" r="10" fill="#FBF8F1" stroke="#1C2620" strokeWidth="2" strokeDasharray="3 2.5" />
    <path d="M18.5 21.2L22.2 25L29.8 17.2" stroke="#1E7F54" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 6. Precision Attendance Stopwatch — Lineal Color
export const IconAttendanceClock: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
    <rect x="20" y="5" width="8" height="4.5" rx="1.5" fill="#86CFA2" stroke="#1C2620" strokeWidth="2.3" />
    <line x1="24" y1="9.5" x2="24" y2="11.5" stroke="#1C2620" strokeWidth="2.4" />
    <path d="M35.5 13L38.5 10.5" stroke="#1C2620" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="24" cy="27" r="15.5" fill="#FBF8F1" stroke="#1C2620" strokeWidth="2.5" />
    <path d="M24 27V15.5A11.5 11.5 0 0 1 35.5 27H24Z" fill="#E4F2E7" />
    <path d="M24 27V17.5" stroke="#1C2620" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M24 27L31.5 27" stroke="#1E7F54" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="24" cy="27" r="2.4" fill="#86CFA2" stroke="#1C2620" strokeWidth="2" />
    <line x1="24" y1="14.5" x2="24" y2="16" stroke="#1C2620" strokeWidth="2" strokeLinecap="round" />
    <line x1="36.5" y1="27" x2="35" y2="27" stroke="#1C2620" strokeWidth="2" strokeLinecap="round" />
    <line x1="24" y1="39.5" x2="24" y2="38" stroke="#1C2620" strokeWidth="2" strokeLinecap="round" />
    <line x1="11.5" y1="27" x2="13" y2="27" stroke="#1C2620" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 7. Lecture Hall / Classroom Board — Lineal Color
export const IconClassroom: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
    <rect x="6" y="7" width="36" height="23" rx="4" fill="#86CFA2" stroke="#1C2620" strokeWidth="2.5" />
    <rect x="9.5" y="10.5" width="29" height="16" rx="2" fill="#1C2620" />
    <line x1="13" y1="15.5" x2="26" y2="15.5" stroke="#FBF8F1" strokeWidth="2" strokeLinecap="round" />
    <line x1="13" y1="20.5" x2="21" y2="20.5" stroke="#86CFA2" strokeWidth="2" strokeLinecap="round" />
    <rect x="30" y="22.5" width="5.5" height="2" rx="1" fill="#FCE8B2" />
    <rect x="17" y="30" width="14" height="9" rx="1.5" fill="#FBF8F1" stroke="#1C2620" strokeWidth="2.4" />
    <line x1="12" y1="39" x2="36" y2="39" stroke="#1C2620" strokeWidth="2.6" strokeLinecap="round" />
    <line x1="19" y1="39" x2="17" y2="43" stroke="#1C2620" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="29" y1="39" x2="31" y2="43" stroke="#1C2620" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

// 8. Legal Ethics / Scales of Justice (UU PDP No. 27/2022) — Lineal Color
export const IconAuditScale: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
    <line x1="24" y1="10" x2="24" y2="38" stroke="#1C2620" strokeWidth="2.8" strokeLinecap="round" />
    <line x1="9" y1="15" x2="39" y2="15" stroke="#1C2620" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="24" cy="11" r="3.5" fill="#86CFA2" stroke="#1C2620" strokeWidth="2.3" />
    <line x1="10.5" y1="15" x2="6.5" y2="25.5" stroke="#1C2620" strokeWidth="2" />
    <line x1="10.5" y1="15" x2="14.5" y2="25.5" stroke="#1C2620" strokeWidth="2" />
    <path d="M4.5 25.5C4.5 29 7.2 31 10.5 31C13.8 31 16.5 29 16.5 25.5H4.5Z" fill="#E4F2E7" stroke="#1C2620" strokeWidth="2.2" strokeLinejoin="round" />
    <line x1="37.5" y1="15" x2="33.5" y2="25.5" stroke="#1C2620" strokeWidth="2" />
    <line x1="37.5" y1="15" x2="41.5" y2="25.5" stroke="#1C2620" strokeWidth="2" />
    <path d="M31.5 25.5C31.5 29 34.2 31 37.5 31C40.8 31 43.5 29 43.5 25.5H31.5Z" fill="#FCE8B2" stroke="#1C2620" strokeWidth="2.2" strokeLinejoin="round" />
    <rect x="17" y="36.5" width="14" height="4.5" rx="1.5" fill="#86CFA2" stroke="#1C2620" strokeWidth="2.3" />
    <line x1="13" y1="41" x2="35" y2="41" stroke="#1C2620" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

// 9. Rangefinder Camera View — Lineal Color
export const IconCameraView: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
    <path d="M17 12L19 8.5C19.35 7.9 20 7.5 20.7 7.5H27.3C28 7.5 28.65 7.9 29 8.5L31 12H17Z" fill="#86CFA2" stroke="#1C2620" strokeWidth="2.4" strokeLinejoin="round" />
    <rect x="6" y="12" width="36" height="27" rx="5" fill="#FBF8F1" stroke="#1C2620" strokeWidth="2.5" />
    <path d="M6 17C6 14.24 8.24 12 11 12H37C39.76 12 42 14.24 42 17V18.5H6V17Z" fill="#86CFA2" stroke="#1C2620" strokeWidth="2.4" />
    <circle cx="12" cy="15.2" r="1.7" fill="#DC433B" />
    <rect x="33.5" y="13.8" width="4.5" height="2.8" rx="1" fill="#FBF8F1" stroke="#1C2620" strokeWidth="1.4" />
    <circle cx="24" cy="28" r="8.5" fill="#E4F2E7" stroke="#1C2620" strokeWidth="2.5" />
    <circle cx="24" cy="28" r="5" fill="#1C2620" />
    <circle cx="25.8" cy="26.2" r="1.6" fill="#FBF8F1" />
  </svg>
);
