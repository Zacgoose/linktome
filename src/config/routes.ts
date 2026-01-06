/**
 * Centralized Route Configuration
 * Defines all application routes with their required permissions and roles
 */

export interface RoutePermission {
  path: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  allowedFor?: 'public' | 'authenticated' | 'admin';
  children?: RoutePermission[];
}

/**
 * Route configuration with RBAC rules
 * 
 * Routes are evaluated in order:
 * 1. Public routes - accessible to everyone
 * 2. Authenticated routes - require valid token
 * 3. Role-based routes - require specific role(s)
 * 4. Permission-based routes - require specific permission(s)
 */
export const ROUTE_CONFIG: RoutePermission[] = [
  // Public routes
  {
    path: '/',
    allowedFor: 'public',
  },
  {
    path: '/login',
    allowedFor: 'public',
  },
  {
    path: '/signup',
    allowedFor: 'public',
  },
  {
    path: '/public/:username',
    allowedFor: 'public',
  },

  // Authenticated user routes
  {
    path: '/admin/dashboard',
    allowedFor: 'authenticated',
    requiredPermissions: ['read:dashboard'],
  },
  {
    path: '/admin/profile',
    allowedFor: 'authenticated',
    requiredPermissions: ['read:profile', 'write:profile'],
  },
  {
    path: '/admin/links',
    allowedFor: 'authenticated',
    requiredPermissions: ['read:links', 'write:links'],
  },
  {
    path: '/admin/appearance',
    allowedFor: 'authenticated',
    requiredPermissions: ['read:appearance', 'write:appearance'],
  },
  {
    path: '/admin/analytics',
    allowedFor: 'authenticated',
    requiredPermissions: ['read:analytics'],
  },
  {
    path: '/admin/apiauth',
    allowedFor: 'authenticated',
    requiredPermissions: ['read:apiauth'],
  },
  {
    path: '/admin/settings',
    allowedFor: 'authenticated',
    requiredPermissions: ['read:profile'],
  },
  {
    path: '/admin/subscription',
    allowedFor: 'authenticated',
    requiredPermissions: ['read:subscription'],
  },

  // Admin-only routes
  {
    path: '/admin/users',
    allowedFor: 'admin',
    requiredRoles: ['admin'],
    requiredPermissions: ['read:users', 'manage:users'],
  },
  {
    path: '/admin/users/create',
    allowedFor: 'admin',
    requiredRoles: ['admin'],
    requiredPermissions: ['write:users'],
  },
  {
    path: '/admin/users/:UserId/edit',
    allowedFor: 'admin',
    requiredRoles: ['admin'],
    requiredPermissions: ['write:users'],
  },
];

/**
 * Permission definitions
 * Maps permission strings to their descriptions
 */
export const PERMISSIONS = {
  // Dashboard permissions
  'read:dashboard': 'View dashboard and statistics',

  // Profile permissions
  'read:profile': 'View own profile',
  'write:profile': 'Edit own profile',

  // Links permissions
  'read:links': 'View own links',
  'write:links': 'Create, edit, and delete own links',
  'manage:links': 'Manage links for all users',

  // Appearance permissions
  'read:appearance': 'View appearance settings',
  'write:appearance': 'Edit appearance settings',

  // Analytics permissions
  'read:analytics': 'View analytics data',

  // User management permissions
  'read:users': 'View user list',
  'write:users': 'Create and edit users',
  'manage:users': 'Full user management including deletion',

  // User-to-user management permissions
  'invite:user_manager': 'Invite another user to manage your account',
  'list:user_manager': 'List user managers and managed users',
  'remove:user_manager': 'Remove a user manager or managed user',
  'respond:user_manager': 'Accept or reject a user manager invitation',

  // API Authentication permissions
  'read:apiauth': 'View API authentication keys',
  'create:apiauth': 'Create new API authentication keys',
  'update:apiauth': 'Update existing API authentication keys',
  'delete:apiauth': 'Delete API authentication keys',

  // Subscription permissions
  'read:subscription': 'View subscription details',
  'write:subscription': 'Manage subscription settings',
} as const;

/**
 * Role definitions
 * Maps role names to their default permissions
 */
export const ROLES = {
  user: {
    name: 'User',
    description: 'Standard user with access to their own profile and links',
    defaultPermissions: [
      'read:dashboard',
      'read:profile',
      'write:profile',
      'read:links',
      'write:links',
      'read:appearance',
      'write:appearance',
      'read:analytics',
      'read:users',
      'manage:users',
      'invite:user_manager',
      'list:user_manager',
      'remove:user_manager',
      'respond:user_manager',
      'read:apiauth',
      'create:apiauth',
      'update:apiauth',
      'delete:apiauth',
      'read:subscription',
      'write:subscription',
    ],
  },
  user_manager: {
    name: 'User Manager',
    description: 'User manager with limited access to manage specific users',
    defaultPermissions: [
      'read:dashboard',
      'read:profile',
      'write:profile',
      'read:links',
      'write:links',
      'read:appearance',
      'write:appearance',
      'read:analytics'
    ],
  },
} as const;

/**
 * Helper function to find route configuration by path
 */
export function findRouteConfig(path: string): RoutePermission | null {
  for (const route of ROUTE_CONFIG) {
    // Exact match
    if (route.path === path) {
      return route;
    }

    // Pattern match (e.g., /admin/users/:UserId)
    const pattern = route.path.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    if (regex.test(path)) {
      return route;
    }
  }
  return null;
}

/**
 * Check if a user has access to a specific route
 */
export function checkRouteAccess(
  path: string,
  userRoles: string[],
  userPermissions: string[]
): { allowed: boolean; reason?: string } {
  const routeConfig = findRouteConfig(path);

  // If route not found, deny access
  if (!routeConfig) {
    return { allowed: false, reason: 'Route not found' };
  }

  // Public routes are always accessible
  if (routeConfig.allowedFor === 'public') {
    return { allowed: true };
  }

  // Authenticated routes require any valid token
  if (routeConfig.allowedFor === 'authenticated') {
    // Check if user has required permissions (if specified)
    if (routeConfig.requiredPermissions) {
      const hasAllPermissions = routeConfig.requiredPermissions.every((perm) =>
        userPermissions.includes(perm)
      );
      if (!hasAllPermissions) {
        return { allowed: false, reason: 'Missing required permissions' };
      }
    }
    return { allowed: true };
  }

  // Role-based access
  if (routeConfig.requiredRoles && routeConfig.requiredRoles.length > 0) {
    const hasRequiredRole = routeConfig.requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRequiredRole) {
      return { allowed: false, reason: 'Missing required role' };
    }
  }

  // Permission-based access
  if (routeConfig.requiredPermissions && routeConfig.requiredPermissions.length > 0) {
    const hasAllPermissions = routeConfig.requiredPermissions.every((perm) =>
      userPermissions.includes(perm)
    );
    if (!hasAllPermissions) {
      return { allowed: false, reason: 'Missing required permissions' };
    }
  }

  return { allowed: true };
}
