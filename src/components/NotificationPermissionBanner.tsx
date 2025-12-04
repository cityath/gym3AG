import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';

export const NotificationPermissionBanner = () => {
    const { user } = useAuth();
    const { permission, isSupported, requestPermission, isLoading } = useNotifications();
    const [isDismissed, setIsDismissed] = useState(false);

    // Check if banner was previously dismissed
    useEffect(() => {
        const dismissed = localStorage.getItem('notification-banner-dismissed');
        if (dismissed === 'true') {
            setIsDismissed(true);
        }
    }, []);

    // Don't show banner if:
    // - User is not logged in
    // - Notifications not supported
    // - Permission already granted
    // - User dismissed the banner
    if (!user || !isSupported || permission === 'granted' || isDismissed || permission === 'denied') {
        return null;
    }

    const handleDismiss = () => {
        setIsDismissed(true);
        localStorage.setItem('notification-banner-dismissed', 'true');
    };

    const handleEnable = async () => {
        const newPermission = await requestPermission();
        // If permission is granted, dismiss the banner
        if (newPermission === 'granted') {
            handleDismiss();
        }
    };

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom-5">
            <div className="bg-gradient-to-r from-primary/90 to-primary/80 backdrop-blur-sm text-primary-foreground rounded-lg shadow-lg p-4 border border-primary/20">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                        <Bell className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1">
                            Activa las Notificaciones
                        </h3>
                        <p className="text-sm opacity-90 mb-3">
                            Recibe confirmaciones cuando reserves o canceles una clase.
                        </p>

                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleEnable}
                                disabled={isLoading}
                                className="bg-white text-primary hover:bg-white/90"
                            >
                                {isLoading ? 'Activando...' : 'Activar'}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleDismiss}
                                className="text-primary-foreground hover:bg-white/10"
                            >
                                Ahora no
                            </Button>
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
