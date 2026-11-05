/**
 * Centralized Application Configuration & Brand Constants
 * Single Source of Truth for footer, credits, support, and company details.
 */

export const APP_CONFIG = {
  appName: 'SmartCart KE',
  companyName: 'SmartCart KE',
  tagline: 'Scan items as you shop, track your budget, and skip the queue.',
  developerCredit: 'Made by Ace Systems',
  developerPhone: '+254115868897',
  supportEmail: 'hirammarkkaranja@gmail.com',
  get currentYear(): number {
    return new Date().getFullYear();
  },
  shortFooterText: `© ${new Date().getFullYear()} SmartCart KE · Made by Ace Systems · Help · Staff login`,
};
