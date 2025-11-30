import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "./ui/button";
import { ToastAction } from "./ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export function ReloadPrompt() {
    const { toast } = useToast();
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log("SW Registered: " + r);
        },
        onRegisterError(error) {
            console.log("SW registration error", error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    useEffect(() => {
        if (offlineReady) {
            toast({
                title: "App ready to work offline",
                description: "You can use this app without an internet connection.",
            });
            setOfflineReady(false);
        }
    }, [offlineReady, toast, setOfflineReady]);

    useEffect(() => {
        if (needRefresh) {
            toast({
                title: "New content available",
                description: "Click on reload button to update.",
                action: (
                    <ToastAction altText="Reload" onClick={() => updateServiceWorker(true)}>
                        Reload
                    </ToastAction>
                ),
                duration: Infinity,
            });
        }
    }, [needRefresh, toast, updateServiceWorker]);

    return null;
}
