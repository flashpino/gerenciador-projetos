/*
 * Push dentro do service worker gerado pelo vite-plugin-pwa (importScripts em vite.config.ts).
 * O payload vem da função `notificar` (supabase/functions/notificar): { titulo, corpo, url }.
 */
self.addEventListener('push', (evento) => {
  const dados = evento.data ? evento.data.json() : {}
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || 'Gerenciador de Projetos', {
      body: dados.corpo || '',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      data: { url: dados.url || '/' },
    }),
  )
})

// Clique: foca uma aba do app já aberta (e navega) ou abre uma nova.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const url = new URL(evento.notification.data?.url || '/', self.location.origin).href
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abas) => {
      const aba = abas.find((a) => a.url.startsWith(self.location.origin))
      if (aba) return aba.focus().then((a) => a.navigate(url))
      return self.clients.openWindow(url)
    }),
  )
})
