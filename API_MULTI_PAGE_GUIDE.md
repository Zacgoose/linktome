# LinkToMe Multi-Page API Implementation Guide

## Overview

This document describes the API changes required to support multiple link pages per user. The implementation uses Azure Table Storage for the PowerShell backend.

## Database Schema Changes

### Pages Table

New Azure Table: `Pages`

**Partition Key**: `UserId` (User's unique identifier)  
**Row Key**: `PageId` (Unique page identifier - GUID)

**Columns**:
- `UserId` (string): The user who owns this page
- `PageId` (string): Unique identifier for the page (GUID)
- `Slug` (string): URL-friendly identifier (e.g., "main", "music", "business")
- `Name` (string): Display name for the page
- `IsDefault` (bool): Whether this is the default page shown at /{username}
- `CreatedAt` (datetime): When the page was created
- `UpdatedAt` (datetime): When the page was last updated

**Indexes**:
- Partition Key + Row Key (automatic)
- Slug index for lookup by username+slug combination

### Updated Tables

**Links Table** - Add column:
- `PageId` (string, nullable): The page this link belongs to. NULL for backward compatibility (treated as default page).

**LinkGroups Table** - Add column:
- `PageId` (string, nullable): The page this group belongs to. NULL for backward compatibility (treated as default page).

**Appearance Table** - Add column:
- `PageId` (string, nullable): The page this appearance belongs to. NULL for backward compatibility (treated as default page).

**Analytics Tables** - Add column:
- `PageId` (string, nullable): The page associated with this analytics event

## API Endpoints

### Page Management Endpoints

#### 1. Get Pages (List all pages for user)

**Endpoint**: `GET /admin/GetPages`  
**Authentication**: Required (user token)  
**Tier**: All tiers (FREE users limited to 1 page)

**Query Parameters**: None

**Response** (200 OK):
```json
{
  "pages": [
    {
      "id": "guid-1",
      "userId": "user-guid",
      "slug": "main",
      "name": "Main Links",
      "isDefault": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "guid-2",
      "userId": "user-guid",
      "slug": "music",
      "name": "Music Links",
      "isDefault": false,
      "createdAt": "2024-01-02T00:00:00Z",
      "updatedAt": "2024-01-02T00:00:00Z"
    }
  ]
}
```

**PowerShell Implementation Notes**:
```powershell
# Query Pages table by PartitionKey (UserId)
$pages = Get-AzTableRow -Table $pagesTable -PartitionKey $userId

# Sort by IsDefault (true first), then by CreatedAt
$sortedPages = $pages | Sort-Object -Property IsDefault -Descending, CreatedAt
```

---

#### 2. Create Page

**Endpoint**: `POST /admin/CreatePage`  
**Authentication**: Required (user token)  
**Tier**: PRO+ (FREE users can only have 1 page)

**Request Body**:
```json
{
  "slug": "music",
  "name": "Music Links",
  "isDefault": false
}
```

**Validation**:
- Slug must be 3-30 characters, lowercase letters, numbers, hyphens only
- Slug cannot start/end with hyphen or contain consecutive hyphens
- Slug must be unique per user
- Reserved slugs: "admin", "api", "public", "login", "signup", "settings"
- Check user tier for max pages limit

**Response** (200 OK):
```json
{
  "message": "Page created successfully",
  "page": {
    "id": "new-guid",
    "userId": "user-guid",
    "slug": "music",
    "name": "Music Links",
    "isDefault": false,
    "createdAt": "2024-01-02T00:00:00Z",
    "updatedAt": "2024-01-02T00:00:00Z"
  }
}
```

**PowerShell Implementation Notes**:
```powershell
# Validate tier limits
$currentPageCount = (Get-AzTableRow -Table $pagesTable -PartitionKey $userId).Count
$tierLimits = Get-TierLimits -Tier $userTier
if ($currentPageCount -ge $tierLimits.MaxPages -and $tierLimits.MaxPages -ne -1) {
    return [HttpResponseContext]@{
        StatusCode = 400
        Body = @{ error = "Page limit reached for your tier" } | ConvertTo-Json
    }
}

# Check slug uniqueness
$existingPage = Get-AzTableRow -Table $pagesTable -PartitionKey $userId -Filter "Slug eq '$slug'"
if ($existingPage) {
    return [HttpResponseContext]@{
        StatusCode = 400
        Body = @{ error = "A page with this slug already exists" } | ConvertTo-Json
    }
}

# If setting as default, unset other defaults
if ($isDefault) {
    $existingPages = Get-AzTableRow -Table $pagesTable -PartitionKey $userId
    foreach ($page in $existingPages) {
        if ($page.IsDefault) {
            $page.IsDefault = $false
            Update-AzTableRow -Table $pagesTable -Entity $page
        }
    }
}

# Create new page entity
$newPage = @{
    PartitionKey = $userId
    RowKey = [guid]::NewGuid().ToString()
    Slug = $slug
    Name = $name
    IsDefault = $isDefault
    CreatedAt = (Get-Date).ToUniversalTime()
    UpdatedAt = (Get-Date).ToUniversalTime()
}

Add-AzTableRow -Table $pagesTable -Entity $newPage
```

---

#### 3. Update Page

**Endpoint**: `PUT /admin/UpdatePage`  
**Authentication**: Required (user token)  
**Tier**: All tiers

**Request Body**:
```json
{
  "id": "page-guid",
  "slug": "music-updated",
  "name": "Music & Concerts",
  "isDefault": true
}
```

**Response** (200 OK):
```json
{
  "message": "Page updated successfully"
}
```

**PowerShell Implementation Notes**:
```powershell
# Verify page ownership
$page = Get-AzTableRow -Table $pagesTable -PartitionKey $userId -RowKey $pageId
if (!$page) {
    return [HttpResponseContext]@{
        StatusCode = 404
        Body = @{ error = "Page not found" } | ConvertTo-Json
    }
}

# If changing slug, validate uniqueness
if ($newSlug -and $newSlug -ne $page.Slug) {
    $existing = Get-AzTableRow -Table $pagesTable -PartitionKey $userId -Filter "Slug eq '$newSlug'"
    if ($existing) {
        return [HttpResponseContext]@{
            StatusCode = 400
            Body = @{ error = "Slug already in use" } | ConvertTo-Json
        }
    }
}

# If setting as default, unset other defaults
if ($isDefault -and !$page.IsDefault) {
    $allPages = Get-AzTableRow -Table $pagesTable -PartitionKey $userId
    foreach ($p in $allPages) {
        if ($p.IsDefault -and $p.RowKey -ne $pageId) {
            $p.IsDefault = $false
            Update-AzTableRow -Table $pagesTable -Entity $p
        }
    }
}

# Update page
$page.Slug = if ($newSlug) { $newSlug } else { $page.Slug }
$page.Name = if ($newName) { $newName } else { $page.Name }
$page.IsDefault = $isDefault
$page.UpdatedAt = (Get-Date).ToUniversalTime()

Update-AzTableRow -Table $pagesTable -Entity $page
```

---

#### 4. Delete Page

**Endpoint**: `DELETE /admin/DeletePage`  
**Authentication**: Required (user token)  
**Tier**: All tiers

**Query Parameters**:
- `id` (required): Page ID to delete

**Validation**:
- Cannot delete the default page
- User must own the page

**Response** (200 OK):
```json
{
  "message": "Page deleted successfully"
}
```

**PowerShell Implementation Notes**:
```powershell
# Verify page ownership
$page = Get-AzTableRow -Table $pagesTable -PartitionKey $userId -RowKey $pageId
if (!$page) {
    return [HttpResponseContext]@{
        StatusCode = 404
        Body = @{ error = "Page not found" } | ConvertTo-Json
    }
}

# Prevent deleting default page
if ($page.IsDefault) {
    return [HttpResponseContext]@{
        StatusCode = 400
        Body = @{ error = "Cannot delete the default page" } | ConvertTo-Json
    }
}

# Delete associated links
$links = Get-AzTableRow -Table $linksTable -Filter "PartitionKey eq '$userId' and PageId eq '$pageId'"
foreach ($link in $links) {
    Remove-AzTableRow -Table $linksTable -Entity $link
}

# Delete associated link groups
$groups = Get-AzTableRow -Table $linkGroupsTable -Filter "PartitionKey eq '$userId' and PageId eq '$pageId'"
foreach ($group in $groups) {
    Remove-AzTableRow -Table $linkGroupsTable -Entity $group
}

# Delete appearance settings
$appearance = Get-AzTableRow -Table $appearanceTable -Filter "PartitionKey eq '$userId' and PageId eq '$pageId'"
if ($appearance) {
    Remove-AzTableRow -Table $appearanceTable -Entity $appearance
}

# Delete page
Remove-AzTableRow -Table $pagesTable -Entity $page
```

---

### Updated Existing Endpoints

#### 5. Get Links (Updated)

**Endpoint**: `GET /admin/GetLinks`  
**Authentication**: Required (user token)

**Query Parameters** (NEW):
- `pageId` (optional): Filter links by page ID. If not provided, returns links for default page.

**Response**: Same structure as before, but links now include `pageId`

**PowerShell Implementation Notes**:
```powershell
# If pageId not provided, get default page
if (!$pageId) {
    $defaultPage = Get-AzTableRow -Table $pagesTable -PartitionKey $userId -Filter "IsDefault eq true"
    $pageId = $defaultPage.RowKey
}

# Get links for specific page (or null for backward compatibility)
$filter = "PartitionKey eq '$userId' and (PageId eq '$pageId' or PageId eq null)"
$links = Get-AzTableRow -Table $linksTable -Filter $filter
```

---

#### 6. Update Links (Updated)

**Endpoint**: `PUT /admin/UpdateLinks`  
**Authentication**: Required (user token)

**Query Parameters** (NEW):
- `pageId` (optional): Page context for new links. Required when adding new links.

**Request Body**: Same as before, but link operations can include `pageId`

**PowerShell Implementation Notes**:
```powershell
# For 'add' operations, use pageId from query or body
if ($operation -eq 'add') {
    $link.PageId = if ($linkData.PageId) { $linkData.PageId } else { $pageId }
}
```

---

#### 7. Get Appearance (Updated)

**Endpoint**: `GET /admin/GetAppearance`  
**Authentication**: Required (user token)

**Query Parameters** (NEW):
- `pageId` (optional): Get appearance for specific page. If not provided, returns default page appearance.

---

#### 8. Update Appearance (Updated)

**Endpoint**: `PUT /admin/UpdateAppearance`  
**Authentication**: Required (user token)

**Query Parameters** (NEW):
- `pageId` (optional): Page context for appearance update.

---

#### 9. Get Public Profile (Updated)

**Endpoint**: `GET /public/GetUserProfile`  
**Authentication**: Not required (public endpoint)

**Query Parameters**:
- `username` (required): Username to look up
- `slug` (optional): Page slug. If not provided, returns default page.

**Response**: Same structure as before, but now filtered by page

**PowerShell Implementation Notes**:
```powershell
# Find user by username
$user = Get-AzTableRow -Table $usersTable -Filter "Username eq '$username'"
if (!$user) {
    return [HttpResponseContext]@{
        StatusCode = 404
        Body = @{ error = "User not found" } | ConvertTo-Json
    }
}

# Find page by slug or get default
if ($slug) {
    $page = Get-AzTableRow -Table $pagesTable -PartitionKey $user.UserId -Filter "Slug eq '$slug'"
    if (!$page) {
        return [HttpResponseContext]@{
            StatusCode = 404
            Body = @{ error = "Page not found" } | ConvertTo-Json
        }
    }
} else {
    $page = Get-AzTableRow -Table $pagesTable -PartitionKey $user.UserId -Filter "IsDefault eq true"
}

$pageId = $page.RowKey

# Get links for this page
$links = Get-AzTableRow -Table $linksTable -Filter "PartitionKey eq '$($user.UserId)' and (PageId eq '$pageId' or PageId eq null)"

# Get appearance for this page
$appearance = Get-AzTableRow -Table $appearanceTable -Filter "PartitionKey eq '$($user.UserId)' and (PageId eq '$pageId' or PageId eq null)"
```

---

## Migration Strategy

### For Existing Users

When a user logs in for the first time after the multi-page feature is deployed:

1. Check if they have any pages in the Pages table
2. If not, create a default page:
   - Slug: "main"
   - Name: "Main Links"
   - IsDefault: true
3. Update all existing links, groups, and appearance records to reference this default page
4. This ensures backward compatibility

**PowerShell Migration Script**:
```powershell
function Ensure-DefaultPage {
    param (
        [string]$userId
    )
    
    # Check if user has any pages
    $pages = Get-AzTableRow -Table $pagesTable -PartitionKey $userId
    
    if ($pages.Count -eq 0) {
        # Create default page
        $defaultPage = @{
            PartitionKey = $userId
            RowKey = [guid]::NewGuid().ToString()
            Slug = "main"
            Name = "Main Links"
            IsDefault = $true
            CreatedAt = (Get-Date).ToUniversalTime()
            UpdatedAt = (Get-Date).ToUniversalTime()
        }
        
        $page = Add-AzTableRow -Table $pagesTable -Entity $defaultPage
        $pageId = $page.RowKey
        
        # Update existing links
        $links = Get-AzTableRow -Table $linksTable -PartitionKey $userId -Filter "PageId eq null"
        foreach ($link in $links) {
            $link.PageId = $pageId
            Update-AzTableRow -Table $linksTable -Entity $link
        }
        
        # Update existing groups
        $groups = Get-AzTableRow -Table $linkGroupsTable -PartitionKey $userId -Filter "PageId eq null"
        foreach ($group in $groups) {
            $group.PageId = $pageId
            Update-AzTableRow -Table $linkGroupsTable -Entity $group
        }
        
        # Update appearance
        $appearance = Get-AzTableRow -Table $appearanceTable -PartitionKey $userId -Filter "PageId eq null"
        if ($appearance) {
            $appearance.PageId = $pageId
            Update-AzTableRow -Table $appearanceTable -Entity $appearance
        }
    }
}
```

## Tier Validation

Each endpoint that creates or modifies pages must validate the user's tier:

```powershell
function Get-TierLimits {
    param ([string]$tier)
    
    switch ($tier) {
        "free" { return @{ MaxPages = 1 } }
        "pro" { return @{ MaxPages = 3 } }
        "premium" { return @{ MaxPages = 10 } }
        "enterprise" { return @{ MaxPages = -1 } } # unlimited
        default { return @{ MaxPages = 1 } }
    }
}

function Test-PageLimit {
    param (
        [string]$userId,
        [string]$tier
    )
    
    $limits = Get-TierLimits -Tier $tier
    
    if ($limits.MaxPages -eq -1) {
        return $true # unlimited
    }
    
    $currentCount = (Get-AzTableRow -Table $pagesTable -PartitionKey $userId).Count
    
    return $currentCount -lt $limits.MaxPages
}
```

## Testing Checklist

- [ ] Create page for FREE tier user (should work for first page)
- [ ] Try creating second page for FREE tier user (should fail)
- [ ] Create multiple pages for PRO tier user (should work up to 3)
- [ ] Update page slug (ensure uniqueness validation)
- [ ] Set page as default (ensure only one default exists)
- [ ] Delete non-default page (should work)
- [ ] Try deleting default page (should fail)
- [ ] Verify links are isolated per page
- [ ] Verify appearance is isolated per page
- [ ] Test public profile with different slugs
- [ ] Test public profile without slug (should show default)
- [ ] Test backward compatibility (users without pages)

## Error Responses

All endpoints follow the standard LinkToMe API error format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `400` Bad Request: Validation error, limit reached, etc.
- `401` Unauthorized: Invalid or missing authentication
- `403` Forbidden: Tier restriction
- `404` Not Found: Page, user, or resource not found
- `500` Internal Server Error: Server-side error

---

## Analytics & Tracking Updates

### Page View Tracking

**Endpoint**: `POST /public/TrackPageView`  
**Authentication**: Not required (public endpoint)

**Request Body**:
```json
{
  "username": "johndoe",
  "pageId": "page-guid",
  "slug": "music"
}
```

**Response** (200 OK):
```json
{
  "message": "Page view tracked successfully"
}
```

**PowerShell Implementation Notes**:
```powershell
# Extract data from request
$username = $Request.Body.username
$pageId = $Request.Body.pageId
$slug = $Request.Body.slug

# Get user info
$user = Get-AzTableRow -Table $usersTable -Filter "Username eq '$username'"
if (!$user) {
    return [HttpResponseContext]@{
        StatusCode = 404
        Body = @{ error = "User not found" } | ConvertTo-Json
    }
}

# Record page view
$pageView = @{
    PartitionKey = $user.UserId
    RowKey = [guid]::NewGuid().ToString()
    PageId = $pageId
    Slug = $slug
    Timestamp = (Get-Date).ToUniversalTime()
    IpAddress = $Request.Headers.'X-Forwarded-For' ?? $Request.Headers.'REMOTE_ADDR'
    UserAgent = $Request.Headers.'User-Agent'
    Referrer = $Request.Headers.'Referer'
}

Add-AzTableRow -Table $pageViewsTable -Entity $pageView
```

---

### Link Click Tracking (Updated)

**Endpoint**: `POST /public/TrackLinkClick`  
**Authentication**: Not required (public endpoint)

**Request Body** (UPDATED):
```json
{
  "linkId": "link-guid",
  "username": "johndoe",
  "pageId": "page-guid",
  "slug": "music"
}
```

**Response** (200 OK):
```json
{
  "message": "Link click tracked successfully"
}
```

**PowerShell Implementation Notes**:
```powershell
# Extract data from request
$linkId = $Request.Body.linkId
$username = $Request.Body.username
$pageId = $Request.Body.pageId  # NEW
$slug = $Request.Body.slug      # NEW

# Record link click with pageId
$linkClick = @{
    PartitionKey = $user.UserId
    RowKey = [guid]::NewGuid().ToString()
    LinkId = $linkId
    PageId = $pageId  # NEW: Track which page the link was clicked from
    Slug = $slug      # NEW: Track the slug for reference
    Timestamp = (Get-Date).ToUniversalTime()
    IpAddress = $Request.Headers.'X-Forwarded-For' ?? $Request.Headers.'REMOTE_ADDR'
    UserAgent = $Request.Headers.'User-Agent'
    Referrer = $Request.Headers.'Referer'
}

Add-AzTableRow -Table $linkClicksTable -Entity $linkClick
```

---

### Analytics Endpoint (Updated)

**Endpoint**: `GET /admin/GetAnalytics`  
**Authentication**: Required (user token)

**Query Parameters** (NEW):
- `pageId` (optional): Filter analytics by specific page
- If not provided: Return aggregated data across all pages + per-page breakdown

**Response** includes new `pageBreakdown` field:
```json
{
  "summary": {
    "totalPageViews": 500,
    "totalLinkClicks": 150,
    "uniqueVisitors": 300
  },
  "pageBreakdown": [
    {
      "pageId": "guid-1",
      "pageName": "Main Links",
      "pageSlug": "main",
      "totalPageViews": 300,
      "totalLinkClicks": 90
    }
  ],
  "linkClicksByLink": [
    {
      "linkId": "link-guid",
      "pageId": "page-guid",
      "clickCount": 45
    }
  ],
  "recentLinkClicks": [
    {
      "linkId": "link-guid",
      "pageId": "page-guid",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}
```

**PowerShell Implementation Notes**:
```powershell
$userId = Get-UserIdFromToken($Request.Headers.Authorization)
$pageIdFilter = $Request.Query.pageId

if ($pageIdFilter) {
    # Filter analytics for specific page
    $pageViews = Get-AzTableRow -Table $pageViewsTable `
        -Filter "PartitionKey eq '$userId' and PageId eq '$pageIdFilter'"
    $linkClicks = Get-AzTableRow -Table $linkClicksTable `
        -Filter "PartitionKey eq '$userId' and PageId eq '$pageIdFilter'"
} else {
    # Get all analytics and calculate per-page breakdown
    $pageViews = Get-AzTableRow -Table $pageViewsTable -PartitionKey $userId
    $linkClicks = Get-AzTableRow -Table $linkClicksTable -PartitionKey $userId
    
    # Calculate per-page breakdown
    $pages = Get-AzTableRow -Table $pagesTable -PartitionKey $userId
    $pageBreakdown = @()
    
    foreach ($page in $pages) {
        $pageViewCount = ($pageViews | Where-Object { $_.PageId -eq $page.RowKey }).Count
        $linkClickCount = ($linkClicks | Where-Object { $_.PageId -eq $page.RowKey }).Count
        
        $pageBreakdown += @{
            pageId = $page.RowKey
            pageName = $page.Name
            pageSlug = $page.Slug
            totalPageViews = $pageViewCount
            totalLinkClicks = $linkClickCount
        }
    }
}
```

---

### Dashboard Stats (Updated)

**Endpoint**: `GET /admin/GetDashboardStats`  
**Authentication**: Required (user token)

**Query Parameters** (NEW):
- `pageId` (optional): Filter stats by specific page
- If not provided: Return aggregated stats across all pages

**Response**: Same structure as before, but filtered if pageId provided

