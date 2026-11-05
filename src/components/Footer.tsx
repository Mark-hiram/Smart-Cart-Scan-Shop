import React from 'react';
import { APP_CONFIG } from '../config.ts';

interface FooterProps {
  onOpenHelp?: () => void;
  onStaffLogin?: () => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenHelp,
  onStaffLogin,
  className = '',
}) => {
  const currentYear = APP_CONFIG.currentYear;

  const handleHelpClick = (e: React.MouseEvent) => {
    if (onOpenHelp) {
      e.preventDefault();
      onOpenHelp();
    }
  };

  const handleStaffClick = (e: React.MouseEvent) => {
    if (onStaffLogin) {
      e.preventDefault();
      onStaffLogin();
    }
  };

  return (
    <footer
      className={`w-full py-4 px-4 text-center text-xs text-emerald-200/80 bg-emerald-950/90 border-t border-emerald-800/40 backdrop-blur-md transition-colors ${className}`}
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-medium">
        <span>&copy; {currentYear} {APP_CONFIG.appName}</span>
        <span aria-hidden="true">&middot;</span>
        <span>{APP_CONFIG.developerCredit}</span>
        <span aria-hidden="true">&middot;</span>
        {onOpenHelp ? (
          <button
            type="button"
            onClick={handleHelpClick}
            className="hover:text-amber-300 hover:underline transition-colors cursor-pointer"
            aria-label="Open customer support help center"
          >
            Help
          </button>
        ) : (
          <a
            href={`mailto:${APP_CONFIG.supportEmail}`}
            className="hover:text-amber-300 hover:underline transition-colors"
            aria-label="Contact help center via email"
          >
            Help
          </a>
        )}
        <span aria-hidden="true">&middot;</span>
        <a
          href="/admin/login"
          onClick={onStaffLogin ? handleStaffClick : undefined}
          className="text-emerald-300/70 hover:text-amber-300 hover:underline transition-colors"
          aria-label="Staff login portal"
        >
          Staff login
        </a>
      </div>
    </footer>
  );
};
