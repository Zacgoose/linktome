/**
 * Page types for multi-page link management
 */

/**
 * Page entity representing a unique link page for a user
 */
export interface Page {
  id: string;
  userId: string;
  slug: string; // URL-friendly identifier (e.g., "main", "music", "business")
  name: string; // Display name (e.g., "Main Links", "Music Links")
  isDefault: boolean; // Whether this is the default page shown at /{username}
  createdAt: string;
  updatedAt: string;
}

/**
 * Request to create a new page
 */
export interface CreatePageRequest {
  slug: string;
  name: string;
  isDefault?: boolean; // If true, sets this as the default page
}

/**
 * Request to update an existing page
 */
export interface UpdatePageRequest {
  id: string;
  slug?: string;
  name?: string;
  isDefault?: boolean; // If true, sets this as the default page (and unsets others)
}

/**
 * Request to delete a page
 */
export interface DeletePageRequest {
  id: string;
}

/**
 * Response containing list of pages
 */
export interface PagesResponse {
  pages: Page[];
}

/**
 * Page operation types for bulk updates
 */
export interface PageOperation extends Partial<Page> {
  operation: 'add' | 'update' | 'remove';
}

/**
 * Validation result for page slug
 */
export interface PageSlugValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validate page slug format
 * - Must be 3-30 characters
 * - Can only contain lowercase letters, numbers, and hyphens
 * - Cannot start or end with a hyphen
 */
export function validatePageSlug(slug: string): PageSlugValidation {
  if (!slug || slug.length < 3 || slug.length > 30) {
    return { valid: false, error: 'Slug must be between 3 and 30 characters' };
  }
  
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
  }
  
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { valid: false, error: 'Slug cannot start or end with a hyphen' };
  }
  
  if (slug.includes('--')) {
    return { valid: false, error: 'Slug cannot contain consecutive hyphens' };
  }
  
  // Reserved slugs
  const reserved = ['admin', 'api', 'public', 'login', 'signup', 'settings'];
  if (reserved.includes(slug)) {
    return { valid: false, error: 'This slug is reserved and cannot be used' };
  }
  
  return { valid: true };
}

/**
 * Generate a URL-friendly slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .substring(0, 30); // Limit length
}
