# API Request Examples - Public Profile Endpoint

## Endpoint: `GET /public/GetUserProfile`

This document clarifies exactly what parameters are sent to the API in different scenarios.

---

## Scenario 1: User visits main username URL (Default Page)

**URL visited by user:**
```
https://linkto.me/public/johndoe
```

**Frontend routing:**
- Route: `/public/[username]` (no slug segments)
- `username` = "johndoe"
- `slug` = undefined

**API Request sent:**
```
GET /api/public/GetUserProfile?username=johndoe
```

**Query Parameters:**
```javascript
{
  username: "johndoe"
  // NO slug parameter
}
```

**Backend behavior:**
- Finds user by username "johndoe"
- Looks up the page where `IsDefault = true` for that user
- Returns links, appearance, and data for the default page

---

## Scenario 2: User visits username with slug (Specific Page)

**URL visited by user:**
```
https://linkto.me/public/johndoe/music
```

**Frontend routing:**
- Route: `/public/[username]/[[...slug]]` 
- `username` = "johndoe"
- `slug` = ["music"] (array with first segment)

**API Request sent:**
```
GET /api/public/GetUserProfile?username=johndoe&slug=music
```

**Query Parameters:**
```javascript
{
  username: "johndoe",
  slug: "music"
}
```

**Backend behavior:**
- Finds user by username "johndoe"
- Looks up the page where `Slug = "music"` for that user
- Returns links, appearance, and data for the "music" page
- If slug "music" doesn't exist, returns 404

---

## Code Reference

### Frontend Implementation (`src/pages/public/[username]/[[...slug]].tsx`)

```typescript
export default function PublicProfile() {
  const router = useRouter();
  const { username, slug } = router.query;
  
  // Extract slug string from array if present
  const pageSlug = Array.isArray(slug) && slug.length > 0 ? slug[0] : undefined;
  
  const { data: profile, isLoading } = useApiGet<PublicProfile>({
    url: 'public/GetUserProfile',
    queryKey: `public-profile-${username}-${pageSlug || 'default'}`,
    params: { 
      username: username as string,
      ...(pageSlug && { slug: pageSlug })  // Only include if slug exists
    },
    enabled: !!username,
  });
}
```

### Backend Logic (PowerShell)

```powershell
# Extract parameters
$username = $Request.Query.username
$slug = $Request.Query.slug  # May be null/empty

# Find user
$user = Get-AzTableRow -Table $usersTable -Filter "Username eq '$username'"

# Determine which page to return
if ($slug) {
    # Slug provided - find specific page
    $page = Get-AzTableRow -Table $pagesTable `
        -PartitionKey $user.UserId `
        -Filter "Slug eq '$slug'"
    
    if (!$page) {
        # Slug doesn't exist for this user
        return 404
    }
} else {
    # No slug - return default page
    $page = Get-AzTableRow -Table $pagesTable `
        -PartitionKey $user.UserId `
        -Filter "IsDefault eq true"
}

# Use the page to fetch links and appearance
$pageId = $page.RowKey
$links = Get-AzTableRow -Table $linksTable `
    -Filter "PartitionKey eq '$($user.UserId)' and (PageId eq '$pageId' or PageId eq null)"
```

---

## Summary Table

| User URL | Frontend Route Match | API Query Params | Backend Action |
|----------|---------------------|------------------|----------------|
| `/public/johndoe` | `[username]` | `?username=johndoe` | Get default page (IsDefault=true) |
| `/public/johndoe/music` | `[username]/[[...slug]]` | `?username=johndoe&slug=music` | Get page with Slug="music" |
| `/public/johndoe/business` | `[username]/[[...slug]]` | `?username=johndoe&slug=business` | Get page with Slug="business" |

---

## Key Points

1. **No slug parameter** = Request for default page
2. **With slug parameter** = Request for specific page by slug
3. The `slug` parameter is **optional** - only sent when present
4. Backend must handle both cases:
   - `slug` present → Find page by slug
   - `slug` absent → Find default page
5. If a slug is provided but doesn't exist, return 404
6. Every user should have exactly one default page (IsDefault=true)
