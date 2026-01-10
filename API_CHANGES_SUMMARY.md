# API Changes Summary for Multi-Page System

This document provides a comprehensive summary of all backend API changes required to support the multi-page link system.

## Table of Contents
1. [New Database Tables](#new-database-tables)
2. [New Page Management Endpoints](#new-page-management-endpoints)
3. [Updated Existing Endpoints](#updated-existing-endpoints)
4. [Analytics & Tracking Updates](#analytics--tracking-updates)
5. [Migration Requirements](#migration-requirements)
6. [Backward Compatibility](#backward-compatibility)

---

## New Database Tables

### Pages Table

**Table Name**: `Pages`

**Schema**:
```
PartitionKey: UserId (GUID)
RowKey: PageId (GUID)
Slug: string (3-30 chars, lowercase, hyphens only)
Name: string (1-50 chars)
IsDefault: boolean (only one per user)
CreatedAt: DateTime
UpdatedAt: DateTime
```

**Indexes**:
- Primary: `PartitionKey` (UserId) + `RowKey` (PageId)
- Filter on: `IsDefault`, `Slug`

**Validation Rules**:
- Slug must be unique per user
- Slug format: `^[a-z0-9-]{3,30}$`
- Only one page can have `IsDefault=true` per user
- Reserved slugs: `admin`, `api`, `public`, `login`, `signup`, `settings`

---

## New Page Management Endpoints

### 1. Get All Pages

**Endpoint**: `GET /admin/GetPages`  
**Authentication**: Required (user token)  
**Query Parameters**: None

**Response** (200 OK):
```json
{
  "pages": [
    {
      "id": "page-guid-1",
      "userId": "user-guid",
      "slug": "main",
      "name": "Main Links",
      "isDefault": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "page-guid-2",
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

**PowerShell Implementation**:
```powershell
$userId = Get-UserIdFromToken($Request.Headers.Authorization)
$pages = Get-AzTableRow -Table $pagesTable -PartitionKey $userId

return @{
    pages = $pages | ForEach-Object {
        @{
            id = $_.RowKey
            userId = $_.PartitionKey
            slug = $_.Slug
            name = $_.Name
            isDefault = $_.IsDefault
            createdAt = $_.CreatedAt
            updatedAt = $_.UpdatedAt
        }
    }
}
```

---

### 2. Create Page

**Endpoint**: `POST /admin/CreatePage`  
**Authentication**: Required (user token)

**Request Body**:
```json
{
  "slug": "music",
  "name": "Music Links",
  "isDefault": false
}
```

**Response** (201 Created):
```json
{
  "id": "new-page-guid",
  "userId": "user-guid",
  "slug": "music",
  "name": "Music Links",
  "isDefault": false,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Error Responses**:
- `400` - Validation error (invalid slug, duplicate slug, tier limit reached)
- `403` - Tier restriction (user cannot create more pages)

**PowerShell Implementation**:
```powershell
$userId = Get-UserIdFromToken($Request.Headers.Authorization)
$body = $Request.Body | ConvertFrom-Json

# Get user's tier and validate page limit
$user = Get-AzTableRow -Table $usersTable -PartitionKey $userId
$currentPages = Get-AzTableRow -Table $pagesTable -PartitionKey $userId
$maxPages = Get-MaxPagesForTier($user.Tier)

if ($currentPages.Count -ge $maxPages) {
    return [HttpResponseContext]@{
        StatusCode = 403
        Body = @{ error = "Page limit reached for your tier" } | ConvertTo-Json
    }
}

# Validate slug
if ($body.slug -notmatch '^[a-z0-9-]{3,30}$') {
    return [HttpResponseContext]@{
        StatusCode = 400
        Body = @{ error = "Invalid slug format" } | ConvertTo-Json
    }
}

# Check for duplicate slug
$existing = Get-AzTableRow -Table $pagesTable -Filter "PartitionKey eq '$userId' and Slug eq '$($body.slug)'"
if ($existing) {
    return [HttpResponseContext]@{
        StatusCode = 400
        Body = @{ error = "Slug already exists" } | ConvertTo-Json
    }
}

# If this is set as default, unset other defaults
if ($body.isDefault) {
    $defaultPages = Get-AzTableRow -Table $pagesTable -Filter "PartitionKey eq '$userId' and IsDefault eq true"
    foreach ($page in $defaultPages) {
        $page.IsDefault = $false
        Update-AzTableRow -Table $pagesTable -Entity $page
    }
}

# Create new page
$pageId = New-Guid
$newPage = @{
    PartitionKey = $userId
    RowKey = $pageId
    Slug = $body.slug
    Name = $body.name
    IsDefault = $body.isDefault
    CreatedAt = (Get-Date).ToUniversalTime()
    UpdatedAt = (Get-Date).ToUniversalTime()
}

Add-AzTableRow -Table $pagesTable -Entity $newPage

return [HttpResponseContext]@{
    StatusCode = 201
    Body = $newPage | ConvertTo-Json
}
```

**Tier Limits**:
```powershell
function Get-MaxPagesForTier($tier) {
    switch ($tier) {
        "FREE" { return 1 }
        "PRO" { return 3 }
        "PREMIUM" { return 10 }
        "ENTERPRISE" { return [int]::MaxValue }
        default { return 1 }
    }
}
```

---

### 3. Update Page

**Endpoint**: `PUT /admin/UpdatePage`  
**Authentication**: Required (user token)

**Request Body**:
```json
{
  "id": "page-guid",
  "slug": "updated-slug",
  "name": "Updated Name",
  "isDefault": true
}
```

**Response** (200 OK):
```json
{
  "id": "page-guid",
  "userId": "user-guid",
  "slug": "updated-slug",
  "name": "Updated Name",
  "isDefault": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-02T00:00:00Z"
}
```

**PowerShell Implementation**:
```powershell
$userId = Get-UserIdFromToken($Request.Headers.Authorization)
$body = $Request.Body | ConvertFrom-Json

# Get existing page
$page = Get-AzTableRow -Table $pagesTable -PartitionKey $userId -RowKey $body.id
if (!$page) {
    return [HttpResponseContext]@{
        StatusCode = 404
        Body = @{ error = "Page not found" } | ConvertTo-Json
    }
}

# Validate slug if changed
if ($body.slug -ne $page.Slug) {
    if ($body.slug -notmatch '^[a-z0-9-]{3,30}$') {
        return [HttpResponseContext]@{
            StatusCode = 400
            Body = @{ error = "Invalid slug format" } | ConvertTo-Json
        }
    }
    
    # Check for duplicate
    $existing = Get-AzTableRow -Table $pagesTable -Filter "PartitionKey eq '$userId' and Slug eq '$($body.slug)'"
    if ($existing -and $existing.RowKey -ne $body.id) {
        return [HttpResponseContext]@{
            StatusCode = 400
            Body = @{ error = "Slug already exists" } | ConvertTo-Json
        }
    }
}

# If setting as default, unset others
if ($body.isDefault -and !$page.IsDefault) {
    $defaultPages = Get-AzTableRow -Table $pagesTable -Filter "PartitionKey eq '$userId' and IsDefault eq true"
    foreach ($p in $defaultPages) {
        $p.IsDefault = $false
        Update-AzTableRow -Table $pagesTable -Entity $p
    }
}

# Update page
$page.Slug = $body.slug
$page.Name = $body.name
$page.IsDefault = $body.isDefault
$page.UpdatedAt = (Get-Date).ToUniversalTime()

Update-AzTableRow -Table $pagesTable -Entity $page

return $page | ConvertTo-Json
```

---

### 4. Delete Page

**Endpoint**: `DELETE /admin/DeletePage?id={pageId}`  
**Authentication**: Required (user token)  
**Query Parameters**: `id` (required) - Page ID to delete

**Response** (200 OK):
```json
{
  "message": "Page deleted successfully"
}
```

**Error Responses**:
- `400` - Cannot delete default page or last page
- `404` - Page not found

**PowerShell Implementation**:
```powershell
$userId = Get-UserIdFromToken($Request.Headers.Authorization)
$pageId = $Request.Query.id

# Get page
$page = Get-AzTableRow -Table $pagesTable -PartitionKey $userId -RowKey $pageId
if (!$page) {
    return [HttpResponseContext]@{
        StatusCode = 404
        Body = @{ error = "Page not found" } | ConvertTo-Json
    }
}

# Cannot delete default page
if ($page.IsDefault) {
    return [HttpResponseContext]@{
        StatusCode = 400
        Body = @{ error = "Cannot delete default page" } | ConvertTo-Json
    }
}

# Cannot delete last page
$allPages = Get-AzTableRow -Table $pagesTable -PartitionKey $userId
if ($allPages.Count -le 1) {
    return [HttpResponseContext]@{
        StatusCode = 400
        Body = @{ error = "Cannot delete last page" } | ConvertTo-Json
    }
}

# Delete page
Remove-AzTableRow -Table $pagesTable -Entity $page

# Note: Consider deleting or moving associated links/appearance data
# This depends on your business logic

return @{ message = "Page deleted successfully" } | ConvertTo-Json
```

---

## Updated Existing Endpoints

### 1. Get Links (UPDATED)

**Endpoint**: `GET /admin/GetLinks`  
**Query Parameters** (NEW):
- `pageId` (optional): Filter links by page ID
- If not provided: Returns links for default page (backward compatible)

**Response**: Links now include `pageId` field

**PowerShell Implementation**:
```powershell
$userId = Get-UserIdFromToken($Request.Headers.Authorization)
$pageId = $Request.Query.pageId

if (!$pageId) {
    # Get default page
    $page = Get-AzTableRow -Table $pagesTable -Filter "PartitionKey eq '$userId' and IsDefault eq true"
    $pageId = $page.RowKey
}

# Get links for this page
$links = Get-AzTableRow -Table $linksTable -Filter "PartitionKey eq '$userId' and PageId eq '$pageId'"

return @{ links = $links } | ConvertTo-Json
```

---

### 2. Update Links (UPDATED)

**Endpoint**: `PUT /admin/UpdateLinks`  
**Query Parameters** (NEW):
- `pageId` (optional): Page ID to update links for
- If not provided: Updates default page links

**Request Body**: Links now include `pageId` field

**PowerShell Implementation**:
```powershell
$userId = Get-UserIdFromToken($Request.Headers.Authorization)
$pageId = $Request.Query.pageId
$body = $Request.Body | ConvertFrom-Json

if (!$pageId) {
    $page = Get-AzTableRow -Table $pagesTable -Filter "PartitionKey eq '$userId' and IsDefault eq true"
    $pageId = $page.RowKey
}

# Update links - ensure PageId is set
foreach ($link in $body.links) {
    $link.PageId = $pageId
    # Save logic...
}
```

---

### 3. Get Appearance (UPDATED)

**Endpoint**: `GET /admin/GetAppearance`  
**Query Parameters** (NEW):
- `pageId` (optional): Get appearance for specific page
- If not provided: Returns default page appearance

**Response**: Appearance now includes `pageId` field

**PowerShell Implementation**:
```powershell
$userId = Get-UserIdFromToken($Request.Headers.Authorization)
$pageId = $Request.Query.pageId

if (!$pageId) {
    $page = Get-AzTableRow -Table $pagesTable -Filter "PartitionKey eq '$userId' and IsDefault eq true"
    $pageId = $page.RowKey
}

# Get appearance for this page
$appearance = Get-AzTableRow -Table $appearanceTable -Filter "PartitionKey eq '$userId' and PageId eq '$pageId'"

return $appearance | ConvertTo-Json
```

---

### 4. Update Appearance (UPDATED)

**Endpoint**: `PUT /admin/UpdateAppearance`  
**Query Parameters** (NEW):
- `pageId` (optional): Page ID to update appearance for
- If not provided: Updates default page

**Request Body**: Appearance data (pageId will be set server-side)

**PowerShell Implementation**:
```powershell
$userId = Get-UserIdFromToken($Request.Headers.Authorization)
$pageId = $Request.Query.pageId
$body = $Request.Body | ConvertFrom-Json

if (!$pageId) {
    $page = Get-AzTableRow -Table $pagesTable -Filter "PartitionKey eq '$userId' and IsDefault eq true"
    $pageId = $page.RowKey
}

# Set PageId and save
$body.PageId = $pageId
# Save appearance logic...
```

---

### 5. Get User Profile - Public (UPDATED)

**Endpoint**: `GET /public/GetUserProfile`  
**Query Parameters**:
- `username` (required): Username to fetch
- `slug` (optional, NEW): Page slug. If not provided, returns default page

**Response**: Now includes page information

**PowerShell Implementation**:
```powershell
$username = $Request.Query.username
$slug = $Request.Query.slug

# Find user
$user = Get-AzTableRow -Table $usersTable -Filter "Username eq '$username'"
if (!$user) {
    return [HttpResponseContext]@{
        StatusCode = 404
        Body = @{ error = "User not found" } | ConvertTo-Json
    }
}

# Find page
if ($slug) {
    $page = Get-AzTableRow -Table $pagesTable -Filter "PartitionKey eq '$($user.UserId)' and Slug eq '$slug'"
    if (!$page) {
        return [HttpResponseContext]@{
            StatusCode = 404
            Body = @{ error = "Page not found" } | ConvertTo-Json
        }
    }
} else {
    $page = Get-AzTableRow -Table $pagesTable -Filter "PartitionKey eq '$($user.UserId)' and IsDefault eq true"
}

$pageId = $page.RowKey

# IMPORTANT: Track page view here
Write-AnalyticsEvent -EventType "PageView" -UserId $user.UserId -PageId $pageId -Metadata @{
    Slug = $page.Slug
    IpAddress = $Request.Headers.'X-Forwarded-For' ?? $Request.Headers.'REMOTE_ADDR'
    UserAgent = $Request.Headers.'User-Agent'
    Referrer = $Request.Headers.'Referer'
}

# Get links for this page
$links = Get-AzTableRow -Table $linksTable -Filter "PartitionKey eq '$($user.UserId)' and PageId eq '$pageId'"

# Get appearance for this page
$appearance = Get-AzTableRow -Table $appearanceTable -Filter "PartitionKey eq '$($user.UserId)' and PageId eq '$pageId'"

return @{
    username = $user.Username
    displayName = $user.DisplayName
    bio = $user.Bio
    avatar = $user.Avatar
    pageId = $pageId
    pageName = $page.Name
    pageSlug = $page.Slug
    links = $links
    appearance = $appearance
} | ConvertTo-Json
```

---

## Analytics & Tracking Updates

### 1. Write-AnalyticsEvent Function (UPDATED)

**Function**: `Write-AnalyticsEvent`  
**Parameters** (NEW):
- `EventType`: "PageView" or "LinkClick"
- `UserId`: User GUID
- `PageId` (NEW): Page GUID
- `Metadata`: Additional event data

**Usage**:
```powershell
# Track page view (called in GetUserProfile)
Write-AnalyticsEvent -EventType "PageView" -UserId $userId -PageId $pageId -Metadata @{
    Slug = $slug
    IpAddress = $ipAddress
    UserAgent = $userAgent
    Referrer = $referrer
}

# Track link click (called in TrackLinkClick)
Write-AnalyticsEvent -EventType "LinkClick" -UserId $userId -PageId $pageId -Metadata @{
    LinkId = $linkId
    LinkTitle = $linkTitle
    Slug = $slug
    IpAddress = $ipAddress
}
```

---

### 2. Track Link Click (UPDATED)

**Endpoint**: `POST /public/TrackLinkClick`  
**Request Body** (UPDATED):
```json
{
  "linkId": "link-guid",
  "username": "johndoe",
  "pageId": "page-guid",
  "slug": "music"
}
```

**PowerShell Implementation**:
```powershell
$body = $Request.Body | ConvertFrom-Json

$user = Get-AzTableRow -Table $usersTable -Filter "Username eq '$($body.username)'"
$link = Get-AzTableRow -Table $linksTable -PartitionKey $user.UserId -RowKey $body.linkId

Write-AnalyticsEvent -EventType "LinkClick" -UserId $user.UserId -PageId $body.pageId -Metadata @{
    LinkId = $body.linkId
    LinkTitle = $link.Title
    LinkUrl = $link.Url
    Slug = $body.slug
    IpAddress = $Request.Headers.'X-Forwarded-For'
    UserAgent = $Request.Headers.'User-Agent'
}
```

---

### 3. Get Analytics (UPDATED)

**Endpoint**: `GET /admin/GetAnalytics`  
**Query Parameters** (NEW):
- `pageId` (optional): Filter analytics by page
- If not provided: Returns aggregated data + per-page breakdown

**Response** (UPDATED):
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
    },
    {
      "pageId": "guid-2",
      "pageName": "Music",
      "pageSlug": "music",
      "totalPageViews": 200,
      "totalLinkClicks": 60
    }
  ],
  "viewsByDay": [...],
  "clicksByDay": [...],
  "linkClicksByLink": [
    {
      "linkId": "link-guid",
      "linkTitle": "My Website",
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

**PowerShell Implementation**:
```powershell
$userId = Get-UserIdFromToken($Request.Headers.Authorization)
$pageIdFilter = $Request.Query.pageId

$analyticsEvents = Get-AnalyticsEvents -UserId $userId

if ($pageIdFilter) {
    # Filter for specific page
    $pageViews = $analyticsEvents | Where-Object { 
        $_.EventType -eq "PageView" -and $_.PageId -eq $pageIdFilter 
    }
    $linkClicks = $analyticsEvents | Where-Object { 
        $_.EventType -eq "LinkClick" -and $_.PageId -eq $pageIdFilter 
    }
} else {
    # All pages - calculate breakdown
    $pageViews = $analyticsEvents | Where-Object { $_.EventType -eq "PageView" }
    $linkClicks = $analyticsEvents | Where-Object { $_.EventType -eq "LinkClick" }
    
    # Get all pages
    $pages = Get-AzTableRow -Table $pagesTable -PartitionKey $userId
    $pageBreakdown = @()
    
    foreach ($page in $pages) {
        $pageBreakdown += @{
            pageId = $page.RowKey
            pageName = $page.Name
            pageSlug = $page.Slug
            totalPageViews = ($pageViews | Where-Object { $_.PageId -eq $page.RowKey }).Count
            totalLinkClicks = ($linkClicks | Where-Object { $_.PageId -eq $page.RowKey }).Count
        }
    }
}

# Return analytics data with page breakdown
```

---

### 4. Get Dashboard Stats (UPDATED)

**Endpoint**: `GET /admin/GetDashboardStats`  
**Query Parameters** (NEW):
- `pageId` (optional): Filter stats by page
- If not provided: Returns aggregated stats across all pages

**PowerShell Implementation**:
```powershell
$userId = Get-UserIdFromToken($Request.Headers.Authorization)
$pageId = $Request.Query.pageId

if ($pageId) {
    # Get stats for specific page
    $links = Get-AzTableRow -Table $linksTable -Filter "PartitionKey eq '$userId' and PageId eq '$pageId'"
    $analytics = Get-AnalyticsEvents -UserId $userId -PageId $pageId
} else {
    # Get stats for all pages
    $links = Get-AzTableRow -Table $linksTable -PartitionKey $userId
    $analytics = Get-AnalyticsEvents -UserId $userId
}

# Calculate and return stats
```

---

## Migration Requirements

### Migration Strategy

When a user first logs in after the multi-page feature is deployed:

1. **Check if user has pages**:
   ```powershell
   $pages = Get-AzTableRow -Table $pagesTable -PartitionKey $userId
   if ($pages.Count -eq 0) {
       # Create default page
   }
   ```

2. **Create default page**:
   ```powershell
   $defaultPage = @{
       PartitionKey = $userId
       RowKey = (New-Guid).ToString()
       Slug = "main"
       Name = "Main Links"
       IsDefault = $true
       CreatedAt = (Get-Date).ToUniversalTime()
       UpdatedAt = (Get-Date).ToUniversalTime()
   }
   Add-AzTableRow -Table $pagesTable -Entity $defaultPage
   ```

3. **Update existing links**:
   ```powershell
   $links = Get-AzTableRow -Table $linksTable -PartitionKey $userId
   foreach ($link in $links) {
       if (!$link.PageId) {
           $link.PageId = $defaultPage.RowKey
           Update-AzTableRow -Table $linksTable -Entity $link
       }
   }
   ```

4. **Update existing appearance**:
   ```powershell
   $appearance = Get-AzTableRow -Table $appearanceTable -PartitionKey $userId
   if ($appearance -and !$appearance.PageId) {
       $appearance.PageId = $defaultPage.RowKey
       Update-AzTableRow -Table $appearanceTable -Entity $appearance
   }
   ```

---

## Backward Compatibility

### For Existing API Calls

All existing API calls without `pageId` parameter will:
1. Automatically use the default page (where `IsDefault=true`)
2. Return data in the same format as before
3. Ensure no breaking changes for existing integrations

### Examples

**Old API call** (still works):
```
GET /admin/GetLinks
```
Returns links for default page.

**New API call** (with page support):
```
GET /admin/GetLinks?pageId=page-guid
```
Returns links for specific page.

### Default Page Guarantee

- Every user must have exactly one default page
- If a user has no default page, automatically set the first page as default
- Cannot delete or unset default without setting another page as default

---

## Testing Checklist

### Page Management
- [ ] Create first page for new user
- [ ] Create additional pages (respect tier limits)
- [ ] Update page slug (check uniqueness)
- [ ] Set page as default (unsets others)
- [ ] Delete non-default page
- [ ] Prevent deleting default page
- [ ] Prevent deleting last page

### Links & Appearance
- [ ] Get links without pageId (returns default)
- [ ] Get links with pageId (returns specific page)
- [ ] Update links for specific page
- [ ] Get appearance without pageId (returns default)
- [ ] Get appearance with pageId (returns specific page)
- [ ] Update appearance for specific page

### Public Profile
- [ ] Access user without slug (returns default page)
- [ ] Access user with slug (returns specific page)
- [ ] Page view tracking with pageId
- [ ] Return 404 for invalid slug

### Analytics
- [ ] Track page views with pageId
- [ ] Track link clicks with pageId
- [ ] Get analytics without filter (includes breakdown)
- [ ] Get analytics with pageId filter
- [ ] Dashboard stats aggregated across pages
- [ ] Dashboard stats filtered by page

### Migration
- [ ] Create default page for existing users
- [ ] Migrate existing links to default page
- [ ] Migrate existing appearance to default page
- [ ] Backward compatibility for API calls without pageId

---

## Error Handling

### Common Error Responses

**400 Bad Request**:
- Invalid slug format
- Duplicate slug
- Cannot delete default/last page
- Validation errors

**403 Forbidden**:
- Tier limit reached for pages
- Cannot create more pages

**404 Not Found**:
- Page not found
- User not found
- Slug not found

**Example Error Response**:
```json
{
  "error": "Page limit reached for your tier. Upgrade to create more pages.",
  "tierLimit": 1,
  "currentCount": 1,
  "requiredTier": "PRO"
}
```

---

## Summary

This document covers all the backend API changes needed to support the multi-page system. Key points:

1. **New Pages table** for storing page metadata
2. **4 new endpoints** for page CRUD operations
3. **All admin endpoints updated** to accept optional `pageId` parameter
4. **Analytics tracking updated** to include `PageId` in all events
5. **Migration logic** to create default pages for existing users
6. **Backward compatibility** maintained for all existing API calls

The implementation ensures that existing functionality continues to work while adding powerful new multi-page capabilities.
