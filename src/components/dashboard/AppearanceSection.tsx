import { Sun, Moon, Monitor } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

// Custom Material UI Switch styled for theme toggle
const MaterialUISwitch = styled(Switch)(({ theme }) => ({
  width: 62,
  height: 34,
  padding: 7,
  '& .MuiSwitch-switchBase': {
    margin: 1,
    padding: 0,
    transform: 'translateX(6px)',
    '&.Mui-checked': {
      color: '#fff',
      transform: 'translateX(22px)',
      '& .MuiSwitch-thumb:before': {
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
          '#fff',
        )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`,
      },
      '& + .MuiSwitch-track': {
        opacity: 1,
        backgroundColor: 'hsl(220, 18%, 20%)',
      },
    },
  },
  '& .MuiSwitch-thumb': {
    backgroundColor: theme.palette.mode === 'dark' ? 'hsl(175, 80%, 50%)' : 'hsl(45, 100%, 50%)',
    width: 32,
    height: 32,
    '&::before': {
      content: "''",
      position: 'absolute',
      width: '100%',
      height: '100%',
      left: 0,
      top: 0,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
        '#fff',
      )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`,
    },
  },
  '& .MuiSwitch-track': {
    opacity: 1,
    backgroundColor: 'hsl(45, 100%, 85%)',
    borderRadius: 20 / 2,
  },
}));

export const AppearanceSection = () => {
  const { mode, toggleTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {mode === 'dark' ? (
            <Moon className="w-5 h-5 text-primary" />
          ) : (
            <Sun className="w-5 h-5 text-primary" />
          )}
          Appearance
        </CardTitle>
        <CardDescription>
          Customize the look and feel of the application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Toggle */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Theme Mode
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            Switch between light and dark mode. Your preference is saved automatically.
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}>
            <Sun className="w-5 h-5" style={{ color: mode === 'light' ? 'hsl(45, 100%, 50%)' : 'hsl(215, 20%, 55%)' }} />
            
            <FormControlLabel
              control={
                <MaterialUISwitch
                  checked={mode === 'dark'}
                  onChange={toggleTheme}
                  inputProps={{ 'aria-label': 'Toggle theme mode' }}
                />
              }
              label=""
              sx={{ m: 0 }}
            />
            
            <Moon className="w-5 h-5" style={{ color: mode === 'dark' ? 'hsl(175, 80%, 50%)' : 'hsl(215, 20%, 55%)' }} />
            
            <Typography 
              variant="body2" 
              sx={{ 
                ml: 'auto', 
                color: 'text.secondary',
                textTransform: 'capitalize',
                fontWeight: 500,
              }}
            >
              {mode} mode
            </Typography>
          </Box>
        </Box>

        {/* System Preference Info */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: 2,
          p: 2,
          borderRadius: 2,
          bgcolor: mode === 'dark' ? 'hsl(220, 18%, 10%)' : 'hsl(210, 20%, 96%)',
        }}>
          <Monitor className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'hsl(175, 80%, 50%)' }} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', mb: 0.5 }}>
              System Preference Detection
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              On first visit, the app automatically detects your system's color scheme preference. 
              Once you manually select a theme, your choice is saved and will be used on future visits.
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
