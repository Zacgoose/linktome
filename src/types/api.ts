/**
 * Standardized API response types following the LinkToMe API Response Format
 * See: API_RESPONSE_FORMAT.md in linktome-api repository
 */

/**
 * Standard error response format
 * HTTP Status: 4xx or 5xx
 */
export interface ApiError {
  error: string;
}

/**
 * User authentication data returned in login/signup/refresh responses
 */
export interface UserAuth {
  UserId: string;
  email: string;
  username: string;
  userRole: string;
  roles: string[];
  permissions: string[];
  userManagements: UserManagement[];
}

/**
 * User management relationship
 */
export interface UserManagement {
  UserId: string;
  DisplayName: string;
  Email: string;
  role: string;
  state: string;
  direction: 'manager' | 'managed';
  permissions: string[];
  created?: string;
  updated?: string;
}

/**
 * Login/Signup response
 * HTTP Status: 200 (success) or 400/401 (error)
 */
export interface LoginResponse {
  user: UserAuth;
}

/**
 * User profile data
 */
export interface UserProfile {
  UserId: string;
  username: string;
  email: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
}

/**
 * Link data
 */
export interface Link {
  id: string;
  title: string;
  url: string;
  order: number;
  active: boolean;
  icon?: string;
}

/**
 * Links list response
 */
export interface LinksResponse {
  links: Link[];
}

/**
 * Generic list response wrapper
 */
export interface ListResponse<T> {
  items?: T[];
  [key: string]: any;
}
