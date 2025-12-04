import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export const NotificationSettings = () => {
    const { permission, isSupported, requestPermission, showTestNotification, isLoading } = useNotifications();
    const [isTesting, setIsTesting] = useState(false);

    const handleToggle = async () => {
        if (permission === 'granted') {
            // Can't revoke permissions programmatically, inform user
            alert('Para desactivar las notificaciones, ve a la configuración de tu navegador.');
            return;
        }

        await requestPermission();
    };

    const handleTest = async () => {
        setIsTesting(true);
        try {
            // Race between the notification and a 5-second timeout
            await Promise.race([
                showTestNotification(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Notification timeout')), 5000)
                )
            ]);
        } catch (error) {
            console.error('Error sending test notification:', error);
            alert('Error al enviar notificación. Verifica la consola para más detalles.');
        } finally {
            setIsTesting(false);
        }
    };

    if (!isSupported) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BellOff className="h-5 w-5" />
                        Notificaciones
                    </CardTitle>
                    <CardDescription>
                        Tu navegador no soporta notificaciones push
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notificaciones
                </CardTitle>
                <CardDescription>
                    Recibe notificaciones cuando reserves o canceles clases
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="notifications-toggle" className="text-base">
                            Notificaciones de Reservas
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {permission === 'granted'
                                ? 'Activadas - Recibirás notificaciones'
                                : permission === 'denied'
                                    ? 'Bloqueadas - Cambia los permisos en tu navegador'
                                    : 'Desactivadas - Activa para recibir notificaciones'}
                        </p>
                    </div>
                    <Switch
                        id="notifications-toggle"
                        checked={permission === 'granted'}
                        onCheckedChange={handleToggle}
                        disabled={isLoading || permission === 'denied'}
                    />
                </div>

                {permission === 'granted' && (
                    <div className="pt-4 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTest}
                            disabled={isTesting}
                            className="w-full sm:w-auto"
                        >
                            {isTesting ? 'Enviando...' : 'Enviar Notificación de Prueba'}
                        </Button>
                    </div>
                )}

                {permission === 'denied' && (
                    <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                            Has bloqueado las notificaciones. Para activarlas:
                        </p>
                        <ol className="text-sm text-muted-foreground list-decimal list-inside mt-2 space-y-1">
                            <li>Haz clic en el icono de candado en la barra de direcciones</li>
                            <li>Busca "Notificaciones" y cambia a "Permitir"</li>
                            <li>Recarga la página</li>
                        </ol>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
