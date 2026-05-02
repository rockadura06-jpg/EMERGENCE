importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE_NAME = 'emergence-v7.4';
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil (
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FILES_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keylist) => {
            return Promise.all(keylist.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }          
            }));
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

firebase.initializeApp({
    apiKey: "AIzaSyAY6f85Qb_JxVxsmvXbs0IzzRfEB8SQWII",
    authDomain: "emergence-5ee8d.firebaseapp.com",
    projectId: "emergence-5ee8d",
    storageBucket: "emergence-5ee8d.firebasestorage.app",
    messagingSenderId: "659477858318",
    appId: "1:659477858318:web:333370ac34b7c9c865d45f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const { title, body} = payload.notification;
    self.registration.showNotification(title,{
        body,
        icon: '/icons/icon-192.png'
    });
});