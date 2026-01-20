import React from 'react';
import { Bell, BellOff, BellRing, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTaskReminders } from '@/hooks/useTaskReminders';
import { cn } from '@/lib/utils';

export const NotificationSettings: React.FC = () => {
  const {
    notificationPermission,
    settings,
    requestPermission,
    toggleReminders,
    testNotification,
    isSupported,
  } = useTaskReminders();

  if (!isSupported) {
    return (
      <Button variant="ghost" size="icon" disabled title="Notifications not supported">
        <BellOff className="w-5 h-5 text-muted-foreground" />
      </Button>
    );
  }

  const getStatusIcon = () => {
    if (notificationPermission === 'granted' && settings.enabled) {
      return <BellRing className="w-5 h-5 text-primary" />;
    }
    if (notificationPermission === 'denied') {
      return <BellOff className="w-5 h-5 text-destructive" />;
    }
    return <Bell className="w-5 h-5" />;
  };

  const getStatusColor = () => {
    if (notificationPermission === 'granted' && settings.enabled) {
      return 'bg-primary/10 text-primary border-primary/20';
    }
    if (notificationPermission === 'denied') {
      return 'bg-destructive/10 text-destructive border-destructive/20';
    }
    return '';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("relative", getStatusColor())}
        >
          {getStatusIcon()}
          {settings.enabled && notificationPermission === 'granted' && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Task Reminders
            </h4>
            <p className="text-xs text-muted-foreground">
              Get notified when tasks are approaching their deadlines.
            </p>
          </div>

          {/* Permission Status */}
          <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Permission Status</span>
              <div className={cn(
                "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full",
                notificationPermission === 'granted' 
                  ? "bg-primary/20 text-primary" 
                  : notificationPermission === 'denied'
                  ? "bg-destructive/20 text-destructive"
                  : "bg-accent/20 text-accent-foreground"
              )}>
                {notificationPermission === 'granted' ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    Granted
                  </>
                ) : notificationPermission === 'denied' ? (
                  <>
                    <XCircle className="w-3 h-3" />
                    Denied
                  </>
                ) : (
                  <>
                    <Bell className="w-3 h-3" />
                    Not Set
                  </>
                )}
              </div>
            </div>

            {notificationPermission === 'default' && (
              <Button 
                onClick={requestPermission} 
                size="sm" 
                className="w-full"
              >
                Enable Notifications
              </Button>
            )}

            {notificationPermission === 'denied' && (
              <p className="text-xs text-muted-foreground">
                Please enable notifications in your browser settings to receive reminders.
              </p>
            )}
          </div>

          {/* Reminder Toggle */}
          {notificationPermission === 'granted' && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="reminders-enabled" className="text-sm">
                  Enable Reminders
                </Label>
                <Switch
                  id="reminders-enabled"
                  checked={settings.enabled}
                  onCheckedChange={toggleReminders}
                />
              </div>

              {/* Reminder Info */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Checks every 5 minutes for upcoming tasks</p>
                <p>• Notifies 30 minutes before due time</p>
                <p>• Also respects custom reminder times</p>
              </div>

              {/* Test Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={testNotification}
                className="w-full"
              >
                <BellRing className="w-4 h-4 mr-2" />
                Test Notification
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
