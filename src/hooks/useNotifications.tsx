import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { notificationService, NotificationPermissionStatus } from '@/utils/notificationService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface NotificationContextType {
    permission: NotificationPermissionStatus;
    isSupported: boolean;
    requestPermission: () => Promise<void>;
    showTestNotification: () => Promise<void>;
    isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [permission, setPermission] = useState<NotificationPermissionStatus>('default');
    const [isSupported, setIsSupported] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Check if notifications are supported
        const supported = notificationService.isSupported();
        setIsSupported(supported);

        if (supported) {
            // Get initial permission status
            const currentPermission = notificationService.getPermissionStatus();
            setPermission(currentPermission);

            // Listen for permission changes (e.g., after user grants via browser UI)
            if (navigator.permissions && navigator.permissions.query) {
                navigator.permissions
                    .query({ name: 'notifications' as PermissionName })
                    .then((permStatus) => {
                        const handleChange = () => {
                            const updated = notificationService.getPermissionStatus();
                            setPermission(updated);
                        };
                        permStatus.addEventListener('change', handleChange);
                        // Cleanup on unmount
                        return () => permStatus.removeEventListener('change', handleChange);
                    })
                    .catch((err) => {
                        console.warn('Permission API not available or failed:', err);
                    });
            }
        }
    }, []);

    const requestPermission = async () => {
        if (!isSupported) {
            console.warn('Notifications not supported');
            return;
        }

        setIsLoading(true);
        try {
            const newPermission = await notificationService.requestPermission();
            setPermission(newPermission);

            // If permission granted and user is logged in, save to database
            if (newPermission === 'granted' && user) {
                await saveNotificationPreference(true);
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveNotificationPreference = async (enabled: boolean) => {
        if (!user) return;

        try {
            // Check if preference already exists
            const { data: existing } = await supabase
                .from('notification_preferences')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (existing) {
                // Update existing preference
                await supabase
                    .from('notification_preferences')
                    .update({
                        booking_confirmations: enabled,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', user.id);
            } else {
                // Create new preference
                await supabase
                    .from('notification_preferences')
                    .insert({
                        user_id: user.id,
                        booking_confirmations: enabled,
                        class_reminders: false,
                        schedule_changes: false,
                        package_expiry: false,
                        admin_messages: false,
                        reminder_minutes: 30,
                    });
            }
        } catch (error) {
            console.error('Error saving notification preference:', error);
        }
    };

    const showTestNotification = async () => {
        if (permission !== 'granted') {
            console.warn('Notification permission not granted');
            return;
        }

        try {
            await notificationService.showTestNotification();
        } catch (error) {
            console.error('Error showing test notification:', error);
        }
    };

    // Listen for new notifications in the database and show them
    useEffect(() => {
        if (!user || permission !== 'granted') {
            console.log('[Notifications] Not subscribing:', { user: !!user, permission });
            return;
        }

        console.log('[Notifications] Setting up real-time subscription for user:', user.id);

        // Subscribe to new notifications for this user
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('[Notifications] New notification received:', payload);
                    const notification = payload.new as any;

                    // Show browser notification
                    notificationService.showNotification({
                        title: notification.title,
                        body: notification.message,
                        tag: notification.type,
                        data: notification,
                    });
                }
            )
            .subscribe((status) => {
                console.log('[Notifications] Subscription status:', status);
            });

        return () => {
            console.log('[Notifications] Cleaning up subscription');
            supabase.removeChannel(channel);
        };
    }, [user, permission]);

    const value = {
        permission,
        isSupported,
        requestPermission,
        showTestNotification,
        isLoading,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
