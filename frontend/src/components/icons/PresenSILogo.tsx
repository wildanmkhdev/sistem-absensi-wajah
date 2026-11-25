import React from 'react';

interface PresenSILogoProps {
  className?: string;
  size?: number;
  /** Optional accessible label when rendered standalone without visible brand text */
  label?: string;
}

/**
 * Bespoke PresenSI geometric brand mark ("Aperture Monogram"):
 * Hand-crafted editorial stamp combining a bold geometric "P" stem & counter,
 * diagonal optical viewfinder brackets, and a centered presence pupil dot.
 * Zero gradients, zero generic AI shields/stars/sparkles.
 */
export const PresenSILogo: React.FC<PresenSILogoProps> = ({
  className = 'w-9 h-9',
  size,
  label,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    focusable="false"
  >
    {/* Tactile paper-craft offset shadow plate */}
    <rect x="6" y="6" width="38" height="38" rx="10" fill="#232323" />
    {/* Primary warm yellow stamp body */}
    <rect
      x="4"
      y="4"
      width="38"
      height="38"
      rx="10"
      fill="#FFD21E"
      stroke="#232323"
      strokeWidth="2.5"
    />
    {/* Subtle top-left & bottom-right optical viewfinder notches */}
    <path
      d="M10.5 15V11.5C10.5 10.95 10.95 10.5 11.5 10.5H15"
      stroke="#232323"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M35.5 31V34.5C35.5 35.05 35.05 35.5 34.5 35.5H31"
      stroke="#232323"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {/* Architectural "P" monogram constructed from crisp geometric primitives */}
    <path
      d="M17.5 34V14H26C30.1421 14 33.5 17.134 33.5 21C33.5 24.866 30.1421 28 26 28H22.5V34H17.5Z"
      fill="#232323"
    />
    {/* Inner counter cutout in warm cream paper */}
    <path
      d="M22.5 18.2H25.7C27.5225 18.2 29 19.4536 29 21C29 22.5464 27.5225 23.8 25.7 23.8H22.5V18.2Z"
      fill="#FBF8F1"
    />
    {/* Presence / Verified aperture dot */}
    <circle cx="25.6" cy="21" r="1.9" fill="#232323" />
  </svg>
);

export default PresenSILogo;
