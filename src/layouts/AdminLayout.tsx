import { useRouter } from 'next/router';
import { useEffect, useContext, useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Select,
  MenuItem as MuiMenuItem,
  FormControl,
  InputLabel,
  IconButton,
  ListSubheader,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Brightness4, Brightness7, Key, Search } from '@mui/icons-material';
import { UiThemeContext } from '@/pages/_app';
import {
  Dashboard as DashboardIcon,
  Link as LinkIcon,
  Palette as PaletteIcon,
  BarChart as AnalyticsIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  CardMembership as SubscriptionIcon,
  Pages as PagesIcon,
} from '@mui/icons-material';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuthContext } from '@/providers/AuthProvider';
import { useRbacContext } from '@/context/RbacContext';
import PageSelector from '@/components/PageSelector';

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Drawer widths (edit these to change sizes)
const drawerWidth = 200; // Expanded width
const collapsedDrawerWidth = 60; // Collapsed width
export default function AdminLayout({ children }: AdminLayoutProps) {
  // Collapsible drawer state (must be inside the component)
  const [drawerOpen, setDrawerOpen] = useState(true);
  // Handler to toggle drawer
  const handleDrawerToggle = () => setDrawerOpen((open) => !open);

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

const menuItems: MenuItem[] = [
  { 
    text: 'Dashboard', 
    icon: <DashboardIcon />, 
    path: '/admin/dashboard',
    requiredPermissions: ['read:dashboard'],
  },
  { 
    text: 'Pages', 
    icon: <PagesIcon />, 
    path: '/admin/pages',
    requiredPermissions: ['read:pages'],
  },
  { 
    text: 'Links', 
    icon: <LinkIcon />, 
    path: '/admin/links',
    requiredPermissions: ['read:links'],
  },
  { 
    text: 'Appearance', 
    icon: <PaletteIcon />, 
    path: '/admin/appearance',
    requiredPermissions: ['read:appearance'],
  },
  { 
    text: 'Analytics', 
    icon: <AnalyticsIcon />, 
    path: '/admin/analytics',
    requiredPermissions: ['read:analytics'],
  },
  { 
    text: 'Short Links', 
    icon: <LinkIcon />, 
    path: '/admin/shortlinks',
    requiredPermissions: ['read:shortlinks'],
  },
  { 
    text: 'Settings', 
    icon: <SettingsIcon />, 
    path: '/admin/settings',
    requiredPermissions: ['read:usersettings'],
  },
  { 
    text: 'Subscription', 
    icon: <SubscriptionIcon />, 
    path: '/admin/subscription',
    requiredPermissions: ['read:subscription'],
  },
  { 
    text: 'Users', 
    icon: <PeopleIcon />, 
    path: '/admin/users',
    requiredPermissions: ['read:users']
  },
  {
    text: 'API Authentication',
    icon: <Key />,
    path: '/admin/apiauth',
    requiredPermissions: ['read:apiauth'],
  }
];


  const { uiTheme, setUiTheme } = useContext(UiThemeContext);
  const router = useRouter();
  const { user, logout, loading, managedUsers: allManagedUsers } = useAuthContext();
  const { selectedContext, setSelectedContext, contextRoles, contextPermissions } = useRbacContext();
  // managedUsers are already filtered for state === 'accepted' in AuthProvider
  const managedUsers = allManagedUsers || [];
  // Sub-accounts from JWT (for agency admin users)
  const subAccounts = user?.subAccounts?.filter(sa => sa.status === 'active') || [];
  const [accountSearchTerm, setAccountSearchTerm] = useState('');

  // If user has no managed users or sub-accounts, ensure context is 'user'
  useEffect(() => {
    if (
      user &&
      (!managedUsers || managedUsers.length === 0) &&
      (!subAccounts || subAccounts.length === 0) &&
      selectedContext !== 'user'
    ) {
      setSelectedContext('user');
    }
  }, [user, selectedContext, setSelectedContext, managedUsers, subAccounts]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Don't render content if not authenticated (redirect will happen via useEffect)
  if (!user) {
    return null;
  }

  // Filter menu items based on context permissions and roles
  let visibleMenuItems = menuItems;
  // If contextPermissions is non-empty, filter as normal. If empty, show all (for managed user fallback/debug)
  if (contextPermissions && contextPermissions.length > 0) {
    visibleMenuItems = menuItems.filter((item) => {
      // Check role requirements
      if (item.requiredRoles && item.requiredRoles.length > 0) {
        if (!item.requiredRoles.some((role) => contextRoles.includes(role))) {
          return false;
        }
      }
      // Check permission requirements
      if (item.requiredPermissions && item.requiredPermissions.length > 0) {
        if (!item.requiredPermissions.every((perm) => contextPermissions.includes(perm))) {
          return false;
        }
      }
      return true;
    });
  }

  const handleLogout = () => {
    logout();
  };


  // Navigation bar and context switcher
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Navigation Bar */}
      <AppBar 
        position="fixed" 
        elevation={1} 
        sx={{ 
            bgcolor: (theme) => theme.palette.background.paper,
            color: (theme) => theme.palette.text.primary,
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            {/* Drawer toggle button (always MenuIcon) */}
            <IconButton
              color="inherit"
              aria-label={drawerOpen ? 'Collapse navigation' : 'Expand navigation'}
              onClick={handleDrawerToggle}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            {/* Keep LinkToMe always visible and stationary */}
            <Typography
              variant="h6"
              sx={{
                flexGrow: 1,
                fontWeight: 700,
                color: 'primary.main',
                minWidth: 120,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                ml: 0,
                transition: 'none',
              }}
            >
              LinkToMe
            </Typography>
            {/* Page Selector - Show on relevant pages */}
            {['/admin/links', '/admin/appearance'].includes(router.pathname) && (
              <PageSelector />
            )}
            {/* UI Theme Switcher */}
            <IconButton sx={{ mr: 1 }} onClick={() => setUiTheme(uiTheme === 'light' ? 'dark' : 'light')} color="inherit" aria-label="Toggle UI theme">
              {uiTheme === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
            {/* Context Switcher: Show if user has managed users or sub-accounts */}
            {user && ((managedUsers && managedUsers.length > 0) || (subAccounts && subAccounts.length > 0)) && (
              <FormControl size="small" sx={{ minWidth: 220, mr: 2 }}>
                <InputLabel id="context-switch-label">Accounts</InputLabel>
                <Select
                  labelId="context-switch-label"
                  value={selectedContext}
                  label="Accounts"
                  onChange={(e) => {
                    setSelectedContext(e.target.value);
                    setAccountSearchTerm('');
                  }}
                  MenuProps={{ 
                    PaperProps: { 
                      style: { maxHeight: 400 },
                    },
                    autoFocus: false,
                  }}
                  onClose={() => setAccountSearchTerm('')}
                >
                  <Box sx={{ px: 2, py: 1, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                    <TextField
                      size="small"
                      placeholder="Search accounts..."
                      value={accountSearchTerm}
                      onChange={(e) => setAccountSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                  <MuiMenuItem value="user">My Account</MuiMenuItem>
                  {managedUsers && managedUsers.length > 0 && (() => {
                    const filteredUsers = managedUsers.filter(um => 
                      um.DisplayName.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
                      um.UserId.toLowerCase().includes(accountSearchTerm.toLowerCase())
                    );
                    return [
                      <ListSubheader key="managed-header">Accounts I Manage</ListSubheader>,
                      ...filteredUsers.map((um) => (
                        <MuiMenuItem key={um.UserId} value={um.UserId}>
                          Managed User: {um.DisplayName}
                        </MuiMenuItem>
                      )),
                    ];
                  })()}
                  {subAccounts && subAccounts.length > 0 && (() => {
                    const filteredSubAccounts = subAccounts.filter(sa => 
                      (sa.displayName && sa.displayName.toLowerCase().includes(accountSearchTerm.toLowerCase())) ||
                      (sa.username && sa.username.toLowerCase().includes(accountSearchTerm.toLowerCase())) ||
                      (sa.userId && sa.userId.toLowerCase().includes(accountSearchTerm.toLowerCase()))
                    );
                    return [
                      <ListSubheader key="subaccounts-header">Sub-Accounts</ListSubheader>,
                      ...filteredSubAccounts.map((sa) => (
                        <MuiMenuItem key={sa.userId} value={sa.userId}>
                          {sa.displayName || sa.username}
                        </MuiMenuItem>
                      )),
                    ];
                  })()}
                </Select>
              </FormControl>
            )}
            <Button variant="outlined" onClick={handleLogout}>
              Logout
            </Button>
          </Toolbar>
        </AppBar>
        {/* Side Drawer Navigation */}
        <Drawer
          variant="permanent"
          open={drawerOpen}
          sx={{
            width: drawerOpen ? drawerWidth : collapsedDrawerWidth,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            transition: (theme) => theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            '& .MuiDrawer-paper': {
              width: drawerOpen ? drawerWidth : collapsedDrawerWidth,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
              overflowX: 'hidden',
              transition: (theme) => theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto', mt: 2 }}>
            <List>
              {visibleMenuItems.map((item) => (
                <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    selected={router.pathname === item.path}
                    onClick={() => router.push(item.path)}
                    sx={theme => ({
                      minHeight: 48,
                      justifyContent: drawerOpen ? 'initial' : 'center',
                      px: 2.5,
                      '&.Mui-selected': {
                        bgcolor: 'primary.light',
                        color: theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.contrastText,
                        '& .MuiListItemIcon-root': {
                          color: theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.contrastText,
                        },
                        '&:hover': {
                          bgcolor: 'primary.light',
                        },
                      },
                    })}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: drawerOpen ? 2 : 'auto',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {drawerOpen && <ListItemText primary={item.text} sx={{ opacity: drawerOpen ? 1 : 0 }} />}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, bgcolor: (theme) => theme.palette.background.default, }}>
          <Toolbar />
          {children}
        </Box>
      </Box>
  );
}