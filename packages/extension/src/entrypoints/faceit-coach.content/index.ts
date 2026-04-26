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

    function syncToUrl() {
      if (parseRoomId(window.location.href))
        ui.mount()
      else
        ui.remove()
    }

    syncToUrl()
    ctx.addEventListener(window, 'wxt:locationchange', syncToUrl)
  },
})
