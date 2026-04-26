import { createApp } from 'vue'
import { parseRoomId } from '@/lib/parse-room-id.js'
import ContentApp from './ContentApp.vue'

export default defineContentScript({
  // Match every faceit.com page so we can react to SPA navigations into a room.
  matches: ['*://www.faceit.com/*'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'faceit-coach-panel',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount(container) {
        const app = createApp(ContentApp)
        app.mount(container)
        return app
      },
      onRemove(app) {
        app?.unmount()
      },
    })

    let lastRoomId = parseRoomId(window.location.href)
    if (lastRoomId)
      ui.mount()

    // FACEIT's SPA does not always trigger `wxt:locationchange`, so we poll
    // the URL ourselves. The check is a quick string match — cheap enough
    // to run twice a second.
    const POLL_MS = 500
    const pollId = window.setInterval(() => {
      const current = parseRoomId(window.location.href)
      if (current === lastRoomId)
        return
      if (lastRoomId)
        ui.remove()
      if (current)
        ui.mount()
      lastRoomId = current
    }, POLL_MS)
    ctx.onInvalidated(() => window.clearInterval(pollId))
  },
})
