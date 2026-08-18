# WAHA WhatsApp Home Assistant add-on

This add-on runs the official WAHA CORE GOWS image and exposes its dashboard and REST API on port 3000.
GOWS does not require the headless Chrome browser used by browser-based WAHA engines, reducing
memory and CPU overhead. QR authentication is delivered through WAHA's dashboard/API session flow
instead of maintaining a separate browser-based QR-serving process.

## Setup

Configure these fields in the add-on UI before starting:

- **API key** and **dashboard password** are required; there are no public default credentials.
- **Dashboard username**, **engine**, **timezone**, and optional Swagger credentials.
- **Session name** defaults to `default` and may be changed for each WhatsApp account.
- **Auto-start** controls whether the selected session starts after launch.
- The six **GOWS storage** switches control messages, groups, chats, labels, contacts, and message secrets.

The add-on creates the selected session if it does not exist. Existing sessions are preserved; when
`apply_storage_to_existing` is enabled, only the selected session's storage configuration is updated.
Session authentication remains under `/data/.sessions` and is not logged out or deleted by onboarding.

Open the dashboard from the add-on page or at:

```text
http://<home-assistant-ip>:3000/dashboard
```

## API use

Include the configured API key in the `X-Api-Key` header. WAHA's session-specific endpoints accept
the configured session name, for example:

```bash
curl -H 'X-Api-Key: YOUR_API_KEY' \
  http://<home-assistant-ip>:3000/api/sessions/default
```

To send a message from Home Assistant, use a REST command or automation with the same header and
the session name in the request body. See the [WAHA API documentation](https://waha.devlike.pro/docs/).

## Storage and upgrades

The add-on uses the pinned `gows` image for the selected architecture. Home Assistant options are
translated to WAHA environment variables at startup; no credentials or session names are embedded in
the image. Upgrading the add-on preserves `/data/.sessions`.
