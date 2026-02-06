import { useEffect, useRef, useCallback, useState } from 'react';
import { Task, getAllTasks } from '@/lib/tasks-db';
import { toast } from 'sonner';

interface ReminderSettings {
  enabled: boolean;
  checkIntervalMinutes: number;
  reminderThresholdMinutes: number;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  checkIntervalMinutes: 5,
  reminderThresholdMinutes: 30,
};

const NOTIFICATION_SOUND_URL = '/sounds/notification.wav';
const REMINDED_TASKS_KEY = 'notoria-reminded-tasks';

export const useTaskReminders = () => {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.7;
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

  // Send notification
  const sendNotification = useCallback((task: Task) => {
    if (notificationPermission !== 'granted') return;

    try {
      const notification = new Notification(`Task Reminder: ${task.title}`, {
        body: task.description || 'This task is due soon!',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `task-${task.id}`,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Play sound
      playNotificationSound();

      // Mark as reminded
      markTaskAsReminded(task.id);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [notificationPermission, playNotificationSound, markTaskAsReminded]);

  // Check for upcoming tasks
  const checkUpcomingTasks = useCallback(async () => {
    if (!settings.enabled || notificationPermission !== 'granted') return;

    try {
      const tasks = await getAllTasks();
      const now = new Date();
      const thresholdMs = settings.reminderThresholdMinutes * 60 * 1000;
      const remindedTasks = getRemindedTasks();

      tasks.forEach(task => {
        // Skip if already reminded, no due date, or already done
        if (!task.dueDate || task.status === 'done' || remindedTasks[task.id]) {
          return;
        }

        const dueDate = new Date(task.dueDate);
        const timeDiff = dueDate.getTime() - now.getTime();

        // Check if task is due within threshold and not overdue by more than 1 hour
        if (timeDiff > 0 && timeDiff <= thresholdMs) {
          sendNotification(task);
        }

        // Also check reminder time if set
        if (task.reminder && task.dueDate) {
          const reminderDateTime = new Date(`${task.dueDate.split('T')[0]}T${task.reminder}`);
          const reminderDiff = reminderDateTime.getTime() - now.getTime();
          
          // If reminder time is within the next check interval
          if (reminderDiff > 0 && reminderDiff <= settings.checkIntervalMinutes * 60 * 1000) {
            sendNotification(task);
          }
        }
      });
    } catch (error) {
      console.error('Error checking upcoming tasks:', error);
    }
  }, [settings, notificationPermission, getRemindedTasks, sendNotification]);

  // Set up interval to check tasks
  useEffect(() => {
    if (settings.enabled && notificationPermission === 'granted') {
      // Check immediately
      checkUpcomingTasks();
      
      // Set up interval
      intervalRef.current = setInterval(
        checkUpcomingTasks,
        settings.checkIntervalMinutes * 60 * 1000
      );
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [settings.enabled, settings.checkIntervalMinutes, notificationPermission, checkUpcomingTasks]);

  // Enable/disable reminders
  const toggleReminders = useCallback(async (enabled: boolean) => {
    if (enabled && notificationPermission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }
    setSettings(prev => ({ ...prev, enabled }));
  }, [notificationPermission, requestPermission]);

  // Test notification
  const testNotification = useCallback(() => {
    // Always play the sound so users can test it
    playNotificationSound();

    if (notificationPermission === 'granted') {
      new Notification('Task Reminder: Test Notification', {
        body: 'This is a test notification to check if reminders are working.',
        icon: '/pwa-192x192.png',
        tag: 'test-notification',
      });
    } else {
      toast.info('Sound played! Enable browser notifications for visual alerts too.');
    }
  }, [notificationPermission, playNotificationSound]);

  return {
    notificationPermission,
    settings,
    requestPermission,
    toggleReminders,
    testNotification,
    isSupported: 'Notification' in window,
  };
};
