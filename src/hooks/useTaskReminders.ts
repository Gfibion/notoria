import { useEffect, useRef, useCallback, useState } from 'react';
import { REMINDERS_ENABLED_KEY, remindersEnabled, showSystemNotification } from '@/lib/task-reminder-scheduler';
import { toast } from 'sonner';

interface ReminderSettings {
  enabled: boolean;
  checkIntervalMinutes: number;
  reminderThresholdMinutes: number;
  volume: number;
}

const VOLUME_STORAGE_KEY = 'notoria-notification-volume';

const getStoredVolume = (): number => {
  try {
    const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (stored !== null) return parseFloat(stored);
  } catch {}
  return 0.7;
};

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: typeof localStorage !== 'undefined' ? remindersEnabled() : true,
  checkIntervalMinutes: 5,
  reminderThresholdMinutes: 30,
  volume: getStoredVolume(),
};

const NOTIFICATION_SOUND_URL = '/sounds/notification.wav';
const REMINDED_TASKS_KEY = 'notoria-reminded-tasks';

export const useTaskReminders = () => {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = settings.volume;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Get reminded tasks from localStorage
  const getRemindedTasks = useCallback((): Record<string, number> => {
    try {
      const stored = localStorage.getItem(REMINDED_TASKS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Clean up old entries (older than 24 hours)
        const now = Date.now();
        const cleaned: Record<string, number> = {};
        Object.entries(parsed).forEach(([taskId, timestamp]) => {
          if (now - (timestamp as number) < 24 * 60 * 60 * 1000) {
            cleaned[taskId] = timestamp as number;
          }
        });
        return cleaned;
      }
    } catch {
      // Ignore errors
    }
    return {};
  }, []);

  // Save reminded task
  const markTaskAsReminded = useCallback((taskId: string) => {
    const reminded = getRemindedTasks();
    reminded[taskId] = Date.now();
    localStorage.setItem(REMINDED_TASKS_KEY, JSON.stringify(reminded));
  }, [getRemindedTasks]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Could not play notification sound:', err);
      });
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      toast.error('Notification permission was denied. Please enable it in your browser settings.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Notifications enabled!');
        return true;
      } else {
        toast.error('Notification permission was denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Enable/disable reminders
  const toggleReminders = useCallback(async (enabled: boolean) => {
    if (enabled && notificationPermission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }
    localStorage.setItem(REMINDERS_ENABLED_KEY, String(enabled));
    setSettings(prev => ({ ...prev, enabled }));
  }, [notificationPermission, requestPermission]);

  // Test notification
  const testNotification = useCallback(() => {
    // Always play the sound so users can test it
    playNotificationSound();

    if (notificationPermission === 'granted') {
      showSystemNotification('Task Reminder: Test Notification', {
        body: 'This is a test notification to check if reminders are working.',
        tag: 'test-notification',
      });
    } else {
      toast.info('Sound played! Enable browser notifications for visual alerts too.');
    }
  }, [notificationPermission, playNotificationSound]);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    setSettings(prev => ({ ...prev, volume: clamped }));
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
  }, []);

  return {
    notificationPermission,
    settings,
    requestPermission,
    toggleReminders,
    testNotification,
    setVolume,
    isSupported: 'Notification' in window,
  };
};
