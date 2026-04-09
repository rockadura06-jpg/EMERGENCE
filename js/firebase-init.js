import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {getMessaging, getToken, onMessage} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js';

const firebaseConfig = {
    apiKey: "AIzaSyAY6f85Qb_JxVxsmvXbs0IzzRfEB8SQWII",
    authDomain: "emergence-5ee8d.firebaseapp.com",
    projectId: "emergence-5ee8d",
    storageBucket: "emergence-5ee8d.firebasestorage.app",
    messagingSenderId: "659477858318",
    appId: "1:659477858318:web:333370ac34b7c9c865d45f"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

const VAPID_KEY = 'BFxM8jOLgqG90iF2TL_fNOqiqqhl-vuhzZ19JQf9-tX9YXJrgljiCuFu4p3rpTZsMnjVrTmxXyfQG66Q_nfthKg';

export async function solicitarPermisoNotificaciones() {
    try {
        const permiso = await Notification.requestPermission();
        if (permiso == 'granted') {
            const registration = await navigator.serviceWorker.register('/sw.js');
            const token = await getToken(messaging, { 
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
            });
            console.log('Token FCM:', token);
            return token;
        } else {
            console.log('Permiso de notificaciones denegado');
            return null;
        }
    } catch (error) {
        console.error('Error al obtener token FMC:', error);
        return null;
    }
}

onMessage(messaging, (playload) => {
    console.log('Notificacion recibida:', playload);
    const {title, body} = playload.notification;
    new Notification(title, {body, icon: '/icons/icon-192.png'});
});