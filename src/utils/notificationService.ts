/**
 * Notification Service
 * Handles browser notification permissions and display
 */

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default';

export interface NotificationOptions {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
    requireInteraction?: boolean;
}

class NotificationService {
    /**
     * Check if the browser supports notifications
     */
    isSupported(): boolean {
        return 'Notification' in window && 'serviceWorker' in navigator;
    }

    /**
     * Get current notification permission status
     */
    getPermissionStatus(): NotificationPermissionStatus {
        if (!this.isSupported()) {
            return 'denied';
        }
        return Notification.permission as NotificationPermissionStatus;
    }

    /**
     * Request notification permission from the user
     */
    async requestPermission(): Promise<NotificationPermissionStatus> {
        if (!this.isSupported()) {
            console.warn('Notifications are not supported in this browser');
            return 'denied';
        }

        if (this.getPermissionStatus() === 'granted') {
            return 'granted';
        }

        try {
            const permission = await Notification.requestPermission();
            return permission as NotificationPermissionStatus;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return 'denied';
        }
    }

    /**
     * Show a local notification
     */
    async showNotification(options: NotificationOptions): Promise<void> {
        const permission = this.getPermissionStatus();

        if (permission !== 'granted') {
            console.warn('Notification permission not granted');
            return;
        }

        try {
            // Try using Service Worker first with a timeout
            if ('serviceWorker' in navigator) {
                console.log('[NotificationService] Waiting for Service Worker ready...');

                const registration = await Promise.race([
                    navigator.serviceWorker.ready,
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Service Worker timeout')), 2000)
                    )
                ]).catch(err => {
                    console.warn('[NotificationService] Service Worker failed/timeout, falling back to standard notification', err);
                    return null;
                });

                if (registration) {
                    console.log('[NotificationService] Service Worker ready, showing notification');
                    await registration.showNotification(options.title, {
                        body: options.body,
                        icon: options.icon || '/pwa-192x192.png',
                        badge: options.badge || '/favicon.ico',
                        tag: options.tag,
                        data: options.data,
                        requireInteraction: options.requireInteraction || false,
                    });
                    return;
                }
            }

            // Fallback to regular notification if SW failed or not available
            console.log('[NotificationService] Using standard Notification API');
            new Notification(options.title, {
                body: options.body,
                icon: options.icon || '/pwa-192x192.png',
                tag: options.tag,
                data: options.data,
            });
        } catch (error) {
            console.error('Error showing notification:', error);
            // Final fallback attempt
            try {
                new Notification(options.title, { body: options.body });
            } catch (e) {
                console.error('Final fallback failed:', e);
            }
        }
    }

    /**
     * Show a booking confirmation notification
     */
    async showBookingConfirmation(className: string, date: string, time: string): Promise<void> {
        await this.showNotification({
            title: '✅ Reserva Confirmada',
            body: `Tu reserva para ${className} el ${date} a las ${time} ha sido confirmada.`,
            tag: 'booking-confirmation',
            requireInteraction: false,
            data: {
                type: 'booking_confirmation',
                className,
                date,
                time,
            },
        });
    }

    /**
     * Show a booking cancellation notification
     */
    async showBookingCancellation(className: string, date: string, time: string): Promise<void> {
        await this.showNotification({
            title: '❌ Reserva Cancelada',
            body: `Tu reserva para ${className} el ${date} a las ${time} ha sido cancelada.`,
            tag: 'booking-cancellation',
            requireInteraction: false,
            data: {
                type: 'booking_cancellation',
                className,
                date,
                time,
            },
        });
    }

    /**
     * Show a test notification
     */
    async showTestNotification(): Promise<void> {
        await this.showNotification({
            title: '🔔 Notificación de Prueba',
            body: 'Las notificaciones están funcionando correctamente.',
            tag: 'test-notification',
            requireInteraction: false,
        });
    }
}

// Export singleton instance
export const notificationService = new NotificationService();
