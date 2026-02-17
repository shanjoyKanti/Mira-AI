import { Link } from 'react-router-dom';

/**
 * Single source of truth for the Mira AI logo - used on every page
 * (landing nav, app navbar, auth pages, footer) so the brand mark
 * stays identical everywhere. Matches the favicon gradient.
 */
export const BrandMark = ({ className = 'w-8 h-8 text-sm' }) => (
  <span
    className={`${className} rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 text-white font-bold flex items-center justify-center shadow-sm flex-shrink-0`}
  >
    M
  </span>
);

export const BrandLogo = ({ to = '/', dark = false, markClass = 'w-8 h-8 text-sm', textClass = 'text-xl' }) => (
  <Link to={to} className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded">
    <BrandMark className={markClass} />
    <span
      className={`${textClass} font-bold ${
        dark ? 'text-white' : 'bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent'
      }`}
    >
      Mira AI
    </span>
  </Link>
);
