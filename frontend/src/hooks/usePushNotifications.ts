import { useEffect } from 'react';
import { requestFirebaseToken, onMessageListener } from '../lib/firebase';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export const usePushNotifications = (isAuthenticated: boolean) => {
    useEffect(() => {
        if (!isAuthenticated) return;

        const setupNotifications = async () => {
            try {
                const token = await requestFirebaseToken();
                if (token) {
                    // Register token with backend
                    await api.post('/notifications/device-token', {
                        token,
                        device: 'web',
                    });
                }
            } catch (error) {
                console.error('Failed to setup push notifications', error);
            }
        };

        setupNotifications();

        // Listen for foreground messages
        const listen = () => {
            onMessageListener()
                .then((payload: any) => {
                    if (payload) {
                        toast.success(`${payload.notification.title}\n${payload.notification.body}`);
                        listen(); // Re-register listener
                    }
                })
                .catch(err => console.error('Message listener err: ', err));
        };

        listen();
    }, [isAuthenticated]);
};
