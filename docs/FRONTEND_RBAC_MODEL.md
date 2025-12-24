# Frontend RBAC Model and Types

## Overview
This document describes the frontend Role-Based Access Control (RBAC) model, types, and how the authentication and authorization system works in the LinkToMe app as of December 2025.

---

## UserAuth Type

The main user object in the frontend is `UserAuth`:

```ts
export interface CompanyMembership {
  companyId: string;
  companyName?: string;
  role: string; // e.g. 'company_owner', 'admin', 'user'
  permissions: string[];
}

export interface UserAuth {
  UserId: string;
  username: string;
  email: string;
  userRole: string; // global role (e.g. 'user', 'admin')
  roles: string[]; // always includes userRole as first element
  permissions: string[]; // global permissions
  companyMemberships?: CompanyMembership[]; // company-specific roles/permissions
}
```

- `userRole`: The user's global role (e.g. 'user', 'admin').
- `roles`: Array of roles for backward compatibility (always includes `userRole`).
- `permissions`: Global permissions for the user.
- `companyMemberships`: Array of company memberships, each with its own role and permissions.

---

## Auth Context

The frontend provides an auth context with:
- `user`: The current user (`UserAuth | null`)
- `userRole`: The user's global role
- `companyMemberships`: Array of company memberships
- `hasRole(role: string)`: Checks global role
- `hasPermission(permission: string)`: Checks global permission
- `canAccessRoute(path: string)`: Checks if user can access a route (uses global roles/permissions)

---

## Company Role Checks

To check company-specific roles/permissions:

```ts
const { companyMemberships } = useAuthContext();
const myCompany = companyMemberships?.[0]; // or select by companyId
if (myCompany?.role === 'company_owner') {
  // Show company owner UI/actions
}
```

---

## API Response Example

The backend returns user info in this format:

```json
{
  "UserId": "string",
  "username": "string",
  "email": "string",
  "userRole": "user",
  "roles": ["user"],
  "permissions": ["read:dashboard", ...],
  "companyMemberships": [
    {
      "companyId": "abc123",
      "companyName": "Acme Inc.",
      "role": "company_owner",
      "permissions": ["read:company", "manage:company"]
    }
  ]
}
```

---

## Migration Notes
- All RBAC checks in the frontend should use the new `userRole` and `companyMemberships` fields.
- Company admin pages (company, users) use the company role from `companyMemberships`.
- Global admin features use `userRole` and global `permissions`.

---

## See Also
- `src/hooks/useAuth.ts` for type definitions and logic
- `src/providers/AuthProvider.tsx` for context implementation
- Backend RBAC docs for API contract
