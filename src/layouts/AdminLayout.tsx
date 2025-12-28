import { useRouter } from 'next/router';
import { useEffect, useContext } from 'react';
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
} from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { UiThemeContext } from '@/pages/_app';
import {
  Dashboard as DashboardIcon,
  Link as LinkIcon,
  Person as PersonIcon,
  Palette as PaletteIcon,
  BarChart as AnalyticsIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useAuthContext } from '@/providers/AuthProvider';
import { useRbacContext } from '@/context/RbacContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 240;

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
    text: 'Links', 
    icon: <LinkIcon />, 
    path: '/admin/links',
    requiredPermissions: ['read:links'],
  },
  { 
    text: 'Profile', 
    icon: <PersonIcon />, 
    path: '/admin/profile',
    requiredPermissions: ['read:profile'],
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
    text: 'Users', 
    icon: <PeopleIcon />, 
    path: '/admin/users',
    requiredPermissions: ['read:users']
  },
];


export default function AdminLayout({ children }: AdminLayoutProps) {
  const { uiTheme, setUiTheme } = useContext(UiThemeContext);
  const router = useRouter();
  const { user, logout, loading, managedUsers: allManagedUsers, refreshAuth } = useAuthContext();
  const { selectedContext, setSelectedContext, contextRoles, contextPermissions } = useRbacContext();
  // managedUsers are already filtered for state === 'accepted' in AuthProvider
  const managedUsers = allManagedUsers || [];

  // If user has no managed users, ensure context is 'user'
  useEffect(() => {
    if (
      user &&
      (!managedUsers || managedUsers.length === 0) &&
      selectedContext !== 'user'
    ) {
      setSelectedContext('user');
    }
  }, [user, selectedContext, setSelectedContext, managedUsers]);

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
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, color: 'primary.main' }}>
            LinkToMe
          </Typography>
          {/* UI Theme Switcher */}
          <IconButton sx={{ mr: 1 }} onClick={() => setUiTheme(uiTheme === 'light' ? 'dark' : 'light')} color="inherit" aria-label="Toggle UI theme">
            {uiTheme === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          {/* Context Switcher: Show if user has managed users */}
          {user && (managedUsers && managedUsers.length > 0) && (
            <FormControl size="small" sx={{ minWidth: 220, mr: 2 }}>
              <InputLabel id="context-switch-label">Accounts</InputLabel>
              <Select
                labelId="context-switch-label"
                value={selectedContext}
                label="Context"
                onChange={async (e) => {
                  setSelectedContext(e.target.value);
                  if (typeof refreshAuth === 'function') {
                    await refreshAuth();
                  }
                }}
                MenuProps={{ PaperProps: { style: { maxHeight: 350 } } }}
              >
                <MuiMenuItem value="user">My Account</MuiMenuItem>
                {managedUsers && managedUsers.length > 0 && [
                  <ListSubheader key="managed-header">Accounts I Manage</ListSubheader>,
                  ...managedUsers.map((um) => (
                    <MuiMenuItem key={um.UserId} value={um.UserId}>
                      Managed User: {um.DisplayName}
                    </MuiMenuItem>
                  )),
                ]}
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
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <List>
            {visibleMenuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={router.pathname === item.path}
                  onClick={() => router.push(item.path)}
                  sx={theme => ({
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
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
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