# Eloquenta Video Call - Verification

## Native WebSocket Version (Cloudflare Workers)
- Works without backend for local testing (WebRTC P2P direct)
- Cloudflare Worker signaling available at `/signal` endpoint

## Features
- **No room code visible** - Session tokens auto-generated
- **Invite modal** - Copy link with toast confirmation
- **Board button** - Opens whiteboard (configure URL in `openBoard()`)
- **Device check modal** - Camera/mic selection dropdowns
- **Chat sidebar** - Real-time messaging
- **Timer** - 30-minute session countdown
- **Screen share** - Desktop sharing support

## Files
- `index.html` - Frontend with native WebSocket
- `durable-worker.js` - Cloudflare Worker signaling (Durable Objects)
- `wrangler.toml` - Wrangler configuration
- `README.md` - Deployment instructions

## Local Testing
```bash
# Serve locally
cd "C:\Users\irieb\Documents\William's Projects\websites\ESL-Professional\Eloquenta\Eloquenta Video Call"
python -m http.server 3000 --bind 127.0.0.1
# Open http://127.0.0.1:3000/
```

## Cloudflare Deployment
```bash
npx wrangler login
npx wrangler deploy
```

## Verification Checklist
- [x] HTML parses correctly
- [x] No room code visible in UI
- [x] WebSocket signaling implemented
- [x] Invite modal with copy button
- [x] Device check modal
- [x] Chat sidebar
- [x] Timer display
- [x] Screen share button