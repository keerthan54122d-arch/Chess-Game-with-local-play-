import React from 'react';

interface PieceIconProps {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
  className?: string;
}

export const PieceIcon: React.FC<PieceIconProps> = ({ type, color, className = 'w-full h-full pointer-events-none select-none' }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#FFFFFF' : '#1E293B';
  const stroke = isWhite ? '#1E293B' : '#0F172A';
  const highlight = isWhite ? '#F8FAFC' : '#334155';

  switch (type) {
    case 'p': // Pawn
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 l 23,0 c 0,-7.92 -4.41,-12.41 -7.41,-13.47 1.47,-1.19 2.41,-3 2.41,-5.03 0,-2.41 -1.33,-4.5 -3.28,-5.62 C 26.21,14.71 26.5,13.89 26.5,13 26.5,10.79 24.71,9 22.5,9 z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'n': // Knight
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="m 22,10 c 10.5,1 16.5,8 16,29 l -23,0 c 0,-9 10,-6.5 8,-21"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
          />
          <path
            d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 c -1.5,1 -4,2 -4,2 l -2,-5 c 0,0 3,-1 5,-2 2,-1 2.4,-3 2.4,-3 z"
            fill={highlight}
            stroke={stroke}
            strokeWidth="1.5"
          />
          <path
            d="m 9.5,25.5 a 0.5,0.5 0 1 1 -1,0 0.5,0.5 0 1 1 1,0 z"
            fill={stroke}
            stroke={stroke}
            strokeWidth="1.5"
          />
          <path
            d="m 15,15.5 c 0,0 2.5,-3.5 7,-3.5 4.5,0 7,3.5 7,3.5"
            fill="none"
            stroke={stroke}
            strokeWidth="1.5"
          />
        </svg>
      );

    case 'b': // Bishop
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.14,39.99 35,40 C 31.08,39.99 13.92,39.99 10,40 C 7.86,39.99 6.68,38.97 6,38 C 7.35,36.54 9,36 9,36 z"
              fill={fill}
            />
            <path
              d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z"
              fill={fill}
            />
            <path d="M 25 8 A 2.5 2.5 0 1 1  20,8 A 2.5 2.5 0 1 1  25 8 z" fill={fill} />
          </g>
          <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case 'r': // Rook
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9,39 L 36,39 L 36,36 L 9,36 z" />
            <path d="M 12,36 L 12,32 L 33,32 L 33,36 z" />
            <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 z" />
            <path d="M 34,14 L 31,17 L 14,17 L 11,14 z" />
            <path d="M 14,17 L 14,29.5 L 31,29.5 L 31,17 z" />
            <path d="M 14,29.5 L 11,32 L 34,32 L 31,29.5 z" />
          </g>
        </svg>
      );

    case 'q': // Queen
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 22.5,10 L 14,25 L 6.5,13.5 z" />
            <path d="M 9,26 L 9,36 L 36,36 L 36,26 z" />
            <path d="M 11,38.5 A 35,35 1 0 0 34,38.5 L 34,40 L 11,40 z" />
            <circle cx="6" cy="12" r="2" />
            <circle cx="14" cy="9" r="2" />
            <circle cx="22.5" cy="8" r="2" />
            <circle cx="31" cy="9" r="2" />
            <circle cx="39" cy="12" r="2" />
          </g>
        </svg>
      );

    case 'k': // King
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 22.5,11.63 L 22.5,6" stroke={stroke} />
            <path d="M 20,8 L 25,8" stroke={stroke} />
            <path
              d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 24,11.5 21,11.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25"
              fill={fill}
            />
            <path
              d="M 11.5,37 C 17,40.5 28,40.5 33.5,37 C 36.5,31 34.5,26.5 31,24 C 27.5,21.5 25,23.5 22.5,25.5 C 20,23.5 17.5,21.5 14,24 C 10.5,26.5 8.5,31 11.5,37 z"
              fill={fill}
            />
            <path d="M 11.5,30 C 17,27 28,27 33.5,30" />
            <path d="M 11.5,33.5 C 17,30.5 28,30.5 33.5,33.5" />
            <path d="M 11.5,37 C 17,34 28,34 33.5,37" />
          </g>
        </svg>
      );

    default:
      return null;
  }
};
