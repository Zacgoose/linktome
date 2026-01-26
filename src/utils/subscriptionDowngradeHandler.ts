/**
 * Subscription Downgrade Handler
 * 
 * This utility provides functions to assess and handle feature downgrades
 * when a user's subscription ends, is cancelled, or payment fails.
 * 
 * Key responsibilities:
 * - Assess the impact of downgrading from one tier to another
 * - Identify which features need to be removed or restricted
 * - Provide user-friendly warnings about what will be lost
 * - Handle the actual downgrade process (with backend API calls)
 */

import { UserTier, TIER_CONFIG, TierLimits } from '@/types/tiers';
import { Page } from '@/types/pages';
import { Link, LinkGroup, AppearanceData, THEME_PRESETS, FONT_OPTIONS } from '@/types/links';
import { ShortLink, SubAccount } from '@/types/api';
import {
  SubscriptionDowngradeAssessment,
  DowngradeOptions,
  DowngradeStrategy,
  PagesDowngradeResult,
  ThemeDowngradeResult,
  LinksDowngradeResult,
  ShortLinksDowngradeResult,
  SubAccountsDowngradeResult,
  ApiAccessDowngradeResult,
  FeatureDowngradeResult,
  FeatureDowngradeStatus,
} from '@/types/subscriptionDowngrade';

/**
 * Assess the impact of downgrading from one tier to another
 */
export function assessDowngradeImpact(
  fromTier: UserTier,
  toTier: UserTier,
  userData: {
    pages?: Page[];
    links?: Link[];
    groups?: LinkGroup[];
    appearance?: AppearanceData;
    shortLinks?: ShortLink[];
    subAccounts?: SubAccount[];
    apiKeys?: Array<{ keyId: string; name: string }>;
  },
  options: DowngradeOptions = {}
): SubscriptionDowngradeAssessment {
  const fromLimits = TIER_CONFIG[fromTier];
  const toLimits = TIER_CONFIG[toTier];
  
  const assessment: SubscriptionDowngradeAssessment = {
    fromTier,
    toTier,
    effectiveDate: new Date(),
    features: {},
    requiresUserAction: false,
    warnings: [],
    impactSummary: '',
  };

  // Assess pages
  if (userData.pages && userData.pages.length > 0) {
    const pagesResult = assessPagesDowngrade(
      userData.pages,
      toLimits.maxPages,
      options.strategy || 'keep-default',
      options.userSelections?.pageIds
    );
    if (pagesResult) {
      assessment.features.pages = pagesResult;
      if (pagesResult.pagesToRemove.length > 0) {
        assessment.warnings.push(
          `${pagesResult.pagesToRemove.length} page(s) will be removed: ${pagesResult.pagesToRemove.map(p => p.name).join(', ')}`
        );
        if (!options.userSelections?.pageIds && userData.pages.length > toLimits.maxPages) {
          assessment.requiresUserAction = true;
        }
      }
    }
  }

  // Assess theme
  if (userData.appearance) {
    const themeResult = assessThemeDowngrade(
      userData.appearance,
      toLimits.customThemes,
      toLimits.premiumFonts
    );
    if (themeResult && themeResult.willRevert) {
      assessment.features.theme = themeResult;
      assessment.warnings.push(
        `Your current theme "${themeResult.currentTheme}" will be reverted to a free theme`
      );
    }
  }

  // Assess links
  if (userData.links && userData.links.length > 0) {
    const linksResult = assessLinksDowngrade(
      userData.links,
      toLimits,
      options.strategy || 'keep-first',
      options.userSelections?.linkIds
    );
    if (linksResult && (linksResult.linksToRemove.length > 0 || linksResult.featuresRemoved.length > 0)) {
      assessment.features.links = linksResult;
      if (linksResult.linksToRemove.length > 0) {
        assessment.warnings.push(
          `${linksResult.linksToRemove.length} link(s) will be removed to fit within the ${toLimits.maxLinks} link limit`
        );
        if (!options.userSelections?.linkIds && userData.links.length > toLimits.maxLinks) {
          assessment.requiresUserAction = true;
        }
      }
      if (linksResult.featuresRemoved.length > 0) {
        assessment.warnings.push(
          `Premium link features will be removed: ${linksResult.featuresRemoved.join(', ')}`
        );
      }
    }
  }

  // Assess short links
  if (userData.shortLinks && userData.shortLinks.length > 0) {
    const shortLinksResult = assessShortLinksDowngrade(
      userData.shortLinks,
      toLimits.maxShortLinks,
      options.strategy || 'keep-first',
      options.userSelections?.shortLinkSlugs
    );
    if (shortLinksResult && shortLinksResult.shortLinksToRemove.length > 0) {
      assessment.features.shortLinks = shortLinksResult;
      assessment.warnings.push(
        `${shortLinksResult.shortLinksToRemove.length} short link(s) will be deactivated`
      );
      if (!options.userSelections?.shortLinkSlugs && userData.shortLinks.length > toLimits.maxShortLinks) {
        assessment.requiresUserAction = true;
      }
    }
  }

  // Assess subaccounts
  if (userData.subAccounts && userData.subAccounts.length > 0) {
    const subAccountsResult = assessSubAccountsDowngrade(userData.subAccounts);
    assessment.features.subAccounts = subAccountsResult;
    if (subAccountsResult.subAccountsToSuspend.length > 0) {
      assessment.warnings.push(
        `All sub-accounts will be suspended (sub-accounts are only available with User Packs)`
      );
    }
  }

  // Assess API access
  if (userData.apiKeys && userData.apiKeys.length > 0 && !toLimits.apiAccess) {
    const apiResult = assessApiAccessDowngrade(userData.apiKeys, toLimits);
    assessment.features.apiAccess = apiResult;
    if (apiResult.apiKeysToRevoke.length > 0) {
      assessment.warnings.push(
        `${apiResult.apiKeysToRevoke.length} API key(s) will be revoked`
      );
    }
  }

  // Assess other premium features
  if (!toLimits.customLogos && fromLimits.customLogos) {
    assessment.features.customLogos = {
      featureName: 'customLogos',
      status: 'reverted',
      details: 'Custom logo will be removed',
    };
    assessment.warnings.push('Custom logo feature will be disabled');
  }

  if (!toLimits.videoBackgrounds && fromLimits.videoBackgrounds) {
    assessment.features.videoBackgrounds = {
      featureName: 'videoBackgrounds',
      status: 'reverted',
      details: 'Video backgrounds will be removed',
    };
    assessment.warnings.push('Video backgrounds will be disabled');
  }

  if (!toLimits.customDomain && fromLimits.customDomain) {
    assessment.features.customDomain = {
      featureName: 'customDomain',
      status: 'removed',
      details: 'Custom domain will be disconnected',
    };
    assessment.warnings.push('Custom domain will be disconnected');
  }

  if (!toLimits.whiteLabel && fromLimits.whiteLabel) {
    assessment.features.whiteLabel = {
      featureName: 'whiteLabel',
      status: 'reverted',
      details: 'LinkToMe branding will be restored',
    };
    assessment.warnings.push('LinkToMe branding will be restored');
  }

  if (!toLimits.analyticsExport && fromLimits.analyticsExport) {
    assessment.features.analytics = {
      featureName: 'analytics',
      status: 'restricted',
      details: 'Analytics export will be disabled',
    };
    assessment.warnings.push('Analytics export feature will be disabled');
  }

  // Generate impact summary
  assessment.impactSummary = generateImpactSummary(assessment);

  return assessment;
}

/**
 * Assess pages downgrade
 */
function assessPagesDowngrade(
  pages: Page[],
  maxPages: number,
  strategy: DowngradeStrategy,
  userSelectedIds?: string[]
): PagesDowngradeResult | null {
  // If unlimited pages or within limit, no action needed
  if (maxPages === -1 || pages.length <= maxPages) {
    return null;
  }

  let pagesToKeep: Page[];
  let pagesToRemove: Page[];

  if (userSelectedIds && userSelectedIds.length > 0) {
    // User has selected which pages to keep
    pagesToKeep = pages.filter(p => userSelectedIds.includes(p.id)).slice(0, maxPages);
    pagesToRemove = pages.filter(p => !pagesToKeep.find(k => k.id === p.id));
  } else {
    // Apply strategy
    switch (strategy) {
      case 'keep-default':
        // Keep the default page and most recent pages
        const defaultPage = pages.find(p => p.isDefault);
        const otherPages = pages.filter(p => !p.isDefault).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        pagesToKeep = defaultPage 
          ? [defaultPage, ...otherPages.slice(0, maxPages - 1)]
          : otherPages.slice(0, maxPages);
        pagesToRemove = pages.filter(p => !pagesToKeep.find(k => k.id === p.id));
        break;
      
      case 'keep-newest':
        const sortedByNewest = [...pages].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        pagesToKeep = sortedByNewest.slice(0, maxPages);
        pagesToRemove = sortedByNewest.slice(maxPages);
        break;
      
      case 'keep-oldest':
        const sortedByOldest = [...pages].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        pagesToKeep = sortedByOldest.slice(0, maxPages);
        pagesToRemove = sortedByOldest.slice(maxPages);
        break;
      
      case 'keep-first':
      default:
        pagesToKeep = pages.slice(0, maxPages);
        pagesToRemove = pages.slice(maxPages);
        break;
    }
  }

  // Ensure there's a default page
  let defaultPageId = pagesToKeep.find(p => p.isDefault)?.id || pagesToKeep[0]?.id;

  return {
    featureName: 'pages',
    status: pagesToRemove.length > 0 ? 'restricted' : 'retained',
    details: `Keeping ${pagesToKeep.length} of ${pages.length} pages`,
    affectedItems: pagesToRemove.map(p => p.id),
    pagesToKeep,
    pagesToRemove,
    defaultPageId: defaultPageId || '',
  };
}

/**
 * Assess theme downgrade
 */
function assessThemeDowngrade(
  appearance: AppearanceData,
  customThemesAllowed: boolean,
  premiumFontsAllowed: boolean
): ThemeDowngradeResult | null {
  const currentTheme = appearance.theme || 'custom';
  const themePreset = THEME_PRESETS.find(t => t.id === currentTheme);
  const isPremiumTheme = themePreset?.isPro || false;
  
  // Check if using premium fonts
  const titleFont = FONT_OPTIONS.find(f => f.value === appearance.text?.titleFont);
  const bodyFont = FONT_OPTIONS.find(f => f.value === appearance.text?.bodyFont);
  const usingPremiumFonts = !premiumFontsAllowed && (titleFont?.isPro || bodyFont?.isPro);

  // Check if current theme needs to be reverted
  const needsRevert = (isPremiumTheme && !customThemesAllowed) || usingPremiumFonts;

  if (!needsRevert) {
    return null;
  }

  // Find a free theme to revert to
  const freeThemes = THEME_PRESETS.filter(t => !t.isPro);
  const defaultTheme = freeThemes[0]?.id || 'custom';

  return {
    featureName: 'theme',
    status: 'reverted',
    details: `Premium theme "${currentTheme}" will be reverted to "${defaultTheme}"`,
    currentTheme,
    isPremium: isPremiumTheme,
    willRevert: needsRevert,
    defaultTheme,
  };
}

/**
 * Assess links downgrade
 */
function assessLinksDowngrade(
  links: Link[],
  toLimits: TierLimits,
  strategy: DowngradeStrategy,
  userSelectedIds?: string[]
): LinksDowngradeResult | null {
  let linksToKeep: Link[];
  let linksToRemove: Link[];
  const featuresRemoved: string[] = [];

  // Check if need to remove links due to count limit
  const maxLinks = toLimits.maxLinks;
  if (maxLinks !== -1 && links.length > maxLinks) {
    if (userSelectedIds && userSelectedIds.length > 0) {
      linksToKeep = links.filter(l => userSelectedIds.includes(l.id)).slice(0, maxLinks);
      linksToRemove = links.filter(l => !linksToKeep.find(k => k.id === l.id));
    } else {
      // Apply strategy
      switch (strategy) {
        case 'keep-newest':
          linksToKeep = [...links].sort((a, b) => b.order - a.order).slice(0, maxLinks);
          break;
        case 'keep-first':
        default:
          linksToKeep = links.slice(0, maxLinks);
          break;
      }
      linksToRemove = links.filter(l => !linksToKeep.find(k => k.id === l.id));
    }
  } else {
    linksToKeep = links;
    linksToRemove = [];
  }

  // Check which premium features will be removed
  if (!toLimits.linkAnimations && links.some(l => l.animation && l.animation !== 'none')) {
    featuresRemoved.push('animations');
  }
  if (!toLimits.linkScheduling && links.some(l => l.schedule?.enabled)) {
    featuresRemoved.push('scheduling');
  }
  if (!toLimits.linkLocking && links.some(l => l.lock?.enabled)) {
    featuresRemoved.push('link locking');
  }
  if (!toLimits.customLayouts && links.some(l => l.layout && l.layout !== 'classic')) {
    featuresRemoved.push('custom layouts');
  }

  if (linksToRemove.length === 0 && featuresRemoved.length === 0) {
    return null;
  }

  return {
    featureName: 'links',
    status: linksToRemove.length > 0 ? 'restricted' : 'retained',
    details: `Keeping ${linksToKeep.length} of ${links.length} links. ${featuresRemoved.length} premium features will be removed.`,
    affectedItems: linksToRemove.map(l => l.id),
    linksToKeep,
    linksToRemove,
    featuresRemoved,
  };
}

/**
 * Assess short links downgrade
 */
function assessShortLinksDowngrade(
  shortLinks: ShortLink[],
  maxShortLinks: number,
  strategy: DowngradeStrategy,
  userSelectedSlugs?: string[]
): ShortLinksDowngradeResult | null {
  // If within limit, no action needed
  if (maxShortLinks === -1 || shortLinks.length <= maxShortLinks) {
    return null;
  }

  let shortLinksToKeep: ShortLink[];
  let shortLinksToRemove: ShortLink[];

  if (maxShortLinks === 0) {
    // No short links allowed in free tier
    shortLinksToKeep = [];
    shortLinksToRemove = shortLinks;
  } else if (userSelectedSlugs && userSelectedSlugs.length > 0) {
    shortLinksToKeep = shortLinks.filter(sl => userSelectedSlugs.includes(sl.slug)).slice(0, maxShortLinks);
    shortLinksToRemove = shortLinks.filter(sl => !shortLinksToKeep.find(k => k.slug === sl.slug));
  } else {
    // Apply strategy
    switch (strategy) {
      case 'keep-newest':
        const sortedByNewest = [...shortLinks].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        shortLinksToKeep = sortedByNewest.slice(0, maxShortLinks);
        shortLinksToRemove = sortedByNewest.slice(maxShortLinks);
        break;
      
      case 'keep-first':
      default:
        shortLinksToKeep = shortLinks.slice(0, maxShortLinks);
        shortLinksToRemove = shortLinks.slice(maxShortLinks);
        break;
    }
  }

  return {
    featureName: 'shortLinks',
    status: 'restricted',
    details: `Keeping ${shortLinksToKeep.length} of ${shortLinks.length} short links`,
    affectedItems: shortLinksToRemove.map(sl => sl.slug),
    shortLinksToKeep,
    shortLinksToRemove,
  };
}

/**
 * Assess subaccounts downgrade
 */
function assessSubAccountsDowngrade(subAccounts: SubAccount[]): SubAccountsDowngradeResult {
  // Sub-accounts are tied to User Packs, not subscription tiers
  // When subscription ends, sub-accounts should be suspended
  const activeSubAccounts = subAccounts.filter(sa => sa.status === 'active');

  return {
    featureName: 'subAccounts',
    status: activeSubAccounts.length > 0 ? 'restricted' : 'retained',
    details: `${activeSubAccounts.length} sub-account(s) will be suspended`,
    affectedItems: activeSubAccounts.map(sa => sa.userId),
    subAccountsToSuspend: activeSubAccounts,
    message: 'Sub-accounts require an active User Pack subscription',
  };
}

/**
 * Assess API access downgrade
 */
function assessApiAccessDowngrade(
  apiKeys: Array<{ keyId: string; name: string }>,
  toLimits: TierLimits
): ApiAccessDowngradeResult {
  const apiKeysToRevoke = toLimits.apiAccess ? [] : apiKeys.map(k => k.keyId);

  return {
    featureName: 'apiAccess',
    status: apiKeysToRevoke.length > 0 ? 'removed' : 'restricted',
    details: toLimits.apiAccess 
      ? 'API rate limits will be reduced'
      : 'All API keys will be revoked',
    affectedItems: apiKeysToRevoke,
    apiKeysToRevoke,
    newRateLimits: {
      requestsPerMinute: toLimits.apiRequestsPerMinute,
      requestsPerDay: toLimits.apiRequestsPerDay,
    },
  };
}

/**
 * Generate a user-friendly impact summary
 */
function generateImpactSummary(assessment: SubscriptionDowngradeAssessment): string {
  const { warnings, features } = assessment;

  if (warnings.length === 0) {
    return 'Your account will downgrade without any data loss. All your content is compatible with the free tier.';
  }

  const impactCount = warnings.length;
  const summary = [
    `Your account will be downgraded from ${assessment.fromTier.toUpperCase()} to ${assessment.toTier.toUpperCase()}.`,
    `This will affect ${impactCount} feature${impactCount > 1 ? 's' : ''}:`,
    ...warnings.map((w, i) => `${i + 1}. ${w}`),
  ];

  if (assessment.requiresUserAction) {
    summary.push('');
    summary.push('⚠️ You need to choose which items to keep before the downgrade can proceed.');
  }

  return summary.join('\n');
}

/**
 * Get default free theme for downgrade
 */
export function getDefaultFreeTheme(): string {
  const freeThemes = THEME_PRESETS.filter(t => !t.isPro);
  return freeThemes[0]?.id || 'custom';
}

/**
 * Strip premium features from a link
 */
export function stripPremiumLinkFeatures(link: Link, limits: TierLimits): Link {
  const strippedLink = { ...link };

  // Remove animations if not allowed
  if (!limits.linkAnimations) {
    strippedLink.animation = 'none';
  }

  // Remove scheduling if not allowed
  if (!limits.linkScheduling) {
    strippedLink.schedule = undefined;
  }

  // Remove locking if not allowed
  if (!limits.linkLocking) {
    strippedLink.lock = undefined;
  }

  // Reset custom layouts if not allowed
  if (!limits.customLayouts) {
    strippedLink.layout = 'classic';
  }

  return strippedLink;
}

/**
 * Get default free appearance settings
 */
export function getDefaultFreeAppearance(): Partial<AppearanceData> {
  const freeTheme = THEME_PRESETS.find(t => !t.isPro);
  const freeFonts = FONT_OPTIONS.filter(f => !f.isPro);

  return {
    theme: freeTheme?.id || 'custom',
    text: {
      titleFont: freeFonts[0]?.value || 'inter',
      bodyFont: freeFonts[0]?.value || 'inter',
      titleColor: '#010101',
      titleSize: 'small',
      pageTextColor: '#010101',
    },
    wallpaper: {
      type: 'fill',
      color: '#ffffff',
    },
  };
}
