import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// 1. Biometric Face Scan - Flaticon style duotone vector
export const IconFaceScan: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Scan Frame Corners */}
    <path d="M6 14V8C6 6.89543 6.89543 6 8 6H14" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
    <path d="M42 14V8C42 6.89543 41.1046 6 40 6H34" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
    <path d="M6 34V40C6 41.1046 6.89543 42 8 42H14" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
    <path d="M42 34V40C42 41.1046 41.1046 42 40 42H34" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
    {/* Face Silhouette */}
    <ellipse cx="24" cy="24" rx="11" ry="13" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="2.5" />
    {/* Eyes */}
    <ellipse cx="20" cy="21" rx="1.75" ry="2" fill="#1D4ED8" />
    <ellipse cx="28" cy="21" rx="1.75" ry="2" fill="#1D4ED8" />
    {/* Nose & Smile */}
    <path d="M24 23V26.5H25.5" stroke="#1D4ED8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20.5 30C21.5 31.5 26.5 31.5 27.5 30" stroke="#1D4ED8" strokeWidth="1.75" strokeLinecap="round" />
    {/* Laser scan line */}
    <line x1="10" y1="24" x2="38" y2="24" stroke="#60A5FA" strokeWidth="2" strokeDasharray="3 2" />
  </svg>
);

// 2. GPS Radar & Satellite Locator - Flaticon style
export const IconGpsRadar: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Radar Rings */}
    <circle cx="24" cy="24" r="18" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="2" />
    <circle cx="24" cy="24" r="12" fill="#DCFCE7" stroke="#86EFAC" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="5" fill="#22C55E" />
    {/* Radar Crosshairs */}
    <line x1="24" y1="6" x2="24" y2="42" stroke="#4ADE80" strokeWidth="1.5" strokeDasharray="2 2" />
    <line x1="6" y1="24" x2="42" y2="24" stroke="#4ADE80" strokeWidth="1.5" strokeDasharray="2 2" />
    {/* Pin point */}
    <path
      d="M24 10C20.6863 10 18 12.6863 18 16C18 20.5 24 26 24 26C24 26 30 20.5 30 16C30 12.6863 27.3137 10 24 10Z"
      fill="#16A34A"
    />
    <circle cx="24" cy="15.5" r="2.5" fill="#FFFFFF" />
  </svg>
);

// 3. Student Academic ID Card - Flaticon style
export const IconStudentCard: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Lanyard Clip */}
    <path d="M21 4H27V8H21V4Z" fill="#94A3B8" />
    <rect x="23" y="2" width="2" height="4" fill="#64748B" />
    {/* Card Body */}
    <rect x="8" y="8" width="32" height="34" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
    {/* Header Band */}
    <rect x="8" y="8" width="32" height="10" rx="4" fill="#2563EB" />
    <circle cx="16" cy="13" r="2" fill="#93C5FD" />
    {/* Photo placeholder */}
    <rect x="12" y="22" width="10" height="12" rx="2" fill="#E2E8F0" />
    <circle cx="17" cy="26" r="2.5" fill="#94A3B8" />
    <path d="M13 32C13 30 15 29.5 17 29.5C19 29.5 21 30 21 32" fill="#94A3B8" />
    {/* Data lines */}
    <rect x="25" y="23" width="11" height="2" rx="1" fill="#475569" />
    <rect x="25" y="28" width="8" height="2" rx="1" fill="#94A3B8" />
    <rect x="25" y="33" width="9" height="1.5" rx="0.75" fill="#CBD5E1" />
  </svg>
);

// 4. University / Academic Shield - Flaticon style
export const IconAcademicShield: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Shield Base */}
    <path
      d="M24 6L9 11V22C9 32.5 15.5 39.5 24 43C32.5 39.5 39 32.5 39 22V11L24 6Z"
      fill="#EFF6FF"
      stroke="#2563EB"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Inner Shield Quartering */}
    <path d="M24 9V41" stroke="#93C5FD" strokeWidth="1.5" />
    <path d="M11 23H37" stroke="#93C5FD" strokeWidth="1.5" />
    {/* Center Academic Star */}
    <path
      d="M24 16L25.8 20.5L30.5 21.2L27 24.3L28 29L24 26.5L20 29L21 24.3L17.5 21.2L22.2 20.5L24 16Z"
      fill="#2563EB"
    />
  </svg>
);

// 5. Official Verification Seal - Flaticon style
export const IconVerifiedCheck: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Ribbons */}
    <path d="M17 32L14 42L24 38L34 42L31 32" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" />
    {/* Rosette scalloped circle */}
    <circle cx="24" cy="22" r="16" fill="#F0FDF4" stroke="#16A34A" strokeWidth="2.5" />
    <circle cx="24" cy="22" r="12" fill="#DCFCE7" />
    {/* Checkmark */}
    <path
      d="M17 22.5L21.5 27L31 17.5"
      stroke="#15803D"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 6. Precision Attendance Clock - Flaticon style
export const IconAttendanceClock: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Top button */}
    <rect x="22" y="4" width="4" height="4" rx="1" fill="#475569" />
    {/* Clock face */}
    <circle cx="24" cy="26" r="17" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.5" />
    {/* Inner ring */}
    <circle cx="24" cy="26" r="13.5" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="2 2" />
    {/* Center pin */}
    <circle cx="24" cy="26" r="2.5" fill="#2563EB" />
    {/* Hands (showing 09:15) */}
    <path d="M24 26V17" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M24 26L31 26" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
    {/* Hour tick marks */}
    <line x1="24" y1="12" x2="24" y2="14" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
    <line x1="38" y1="26" x2="36" y2="26" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
    <line x1="24" y1="40" x2="24" y2="38" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
    <line x1="10" y1="26" x2="12" y2="26" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 7. Lecture Hall / Classroom - Flaticon style
export const IconClassroom: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Blackboard frame */}
    <rect x="7" y="8" width="34" height="20" rx="3" fill="#1E293B" stroke="#475569" strokeWidth="2" />
    {/* Chalkboard chalk lines */}
    <line x1="12" y1="14" x2="26" y2="14" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="19" x2="20" y2="19" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="31" y="24" width="6" height="2" rx="0.5" fill="#F8FAFC" />
    {/* Lecturer Desk / Podium */}
    <path d="M18 28H30V38H18V28Z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
    <path d="M14 38H34" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
    {/* Chair leg */}
    <line x1="20" y1="38" x2="18" y2="43" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
    <line x1="28" y1="38" x2="30" y2="43" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 8. Legal Ethics / Scales of Justice (UU PDP No. 27/2022) - Flaticon style
export const IconAuditScale: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Pillar */}
    <line x1="24" y1="8" x2="24" y2="40" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
    <circle cx="24" cy="7" r="3" fill="#2563EB" />
    {/* Crossbar */}
    <line x1="10" y1="14" x2="38" y2="14" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
    {/* Left Scale Pan */}
    <line x1="10" y1="14" x2="6" y2="24" stroke="#94A3B8" strokeWidth="1.5" />
    <line x1="10" y1="14" x2="14" y2="24" stroke="#94A3B8" strokeWidth="1.5" />
    <path d="M4 24C4 27.5 7 29 10 29C13 29 16 27.5 16 24H4Z" fill="#EFF6FF" stroke="#2563EB" strokeWidth="1.5" />
    {/* Right Scale Pan */}
    <line x1="38" y1="14" x2="34" y2="24" stroke="#94A3B8" strokeWidth="1.5" />
    <line x1="38" y1="14" x2="42" y2="24" stroke="#94A3B8" strokeWidth="1.5" />
    <path d="M32 24C32 27.5 35 29 38 29C41 29 44 27.5 44 24H32Z" fill="#EFF6FF" stroke="#2563EB" strokeWidth="1.5" />
    {/* Pedestal base */}
    <path d="M16 40H32" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
    <rect x="19" y="37" width="10" height="3" fill="#64748B" />
  </svg>
);

// 9. Camera Viewfinder Lens - Flaticon style
export const IconCameraView: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Camera Body */}
    <path
      d="M7 16C7 13.7909 8.79086 12 11 12H16L18 8H30L32 12H37C39.2091 12 41 13.7909 41 16V36C41 38.2091 39.2091 40 37 40H11C8.79086 40 7 38.2091 7 36V16Z"
      fill="#FFFFFF"
      stroke="#0F172A"
      strokeWidth="2.5"
    />
    {/* Flash & Sensor */}
    <circle cx="35" cy="17" r="2" fill="#E2E8F0" stroke="#64748B" strokeWidth="1" />
    <rect x="12" y="15" width="4" height="2" rx="1" fill="#EF4444" />
    {/* Lens outer & inner */}
    <circle cx="24" cy="26" r="9" fill="#EFF6FF" stroke="#0F172A" strokeWidth="2.5" />
    <circle cx="24" cy="26" r="6" fill="#2563EB" stroke="#1D4ED8" strokeWidth="1.5" />
    <circle cx="26" cy="24" r="2" fill="#93C5FD" opacity="0.8" />
  </svg>
);
