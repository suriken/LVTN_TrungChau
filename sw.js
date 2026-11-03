// Service Worker cho PTV Trung Châu 1 - Quản lý System Push Notifications trên màn hình chờ (Lock Screen)
const CACHE_NAME = 'ptv-trungchau-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Lắng nghe sự kiện thông báo đẩy (Push event)
self.addEventListener('push', (event) => {
    let data = {
        title: 'Khảo Sát Đề Tài PTV Trung Châu 1',
        body: 'Bạn ơi! Hình như bạn quên chưa nhập xong khảo sát đúng không? Cố gắng hỗ trợ mình nhé 🙏',
        url: '/'
    };
    if (event.data) {
        try {
            data = Object.assign(data, event.data.json());
        } catch(e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        tag: 'ptv-evening-reminder',
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: { url: data.url || '/' }
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

// Khi người dùng bấm vào thông báo trên màn hình khóa hoặc thanh thông báo
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if ('focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
