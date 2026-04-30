# Privacy Policy — FACEIT Coach

_Last updated: April 30, 2026_

## Overview

FACEIT Coach is a browser extension that helps CS2 players analyze FACEIT match lobbies for map pick/ban decisions. This policy explains what data the extension accesses and how it is used.

## Data We Do Not Collect

FACEIT Coach does not collect, store, transmit, or share any personal data. Specifically, the extension does not collect:

- Personal identification information (name, email address, age, etc.)
- Authentication credentials (passwords, login tokens)
- Financial or payment information
- Health information
- Personal communications
- Location data
- Browsing history
- User activity (keystrokes, mouse movements, screen recordings)
- Web page content

## Data Accessed Locally

### Active Tab URL

The extension reads the URL of the active browser tab solely to extract a FACEIT room ID (e.g. from `faceit.com/en/cs2/room/<roomId>`). This URL is never stored, logged, or transmitted anywhere.

### FACEIT Session (Content Script)

When injected on `faceit.com`, the extension optionally calls FACEIT's own internal session endpoint (`/api/users/v1/sessions/me`) using the browser's existing session cookie (same-origin request). This is used only to read the logged-in user's FACEIT nickname for automatic team detection. This data is used in memory for the current session only and is never stored or transmitted to any third party.

### User Preferences (Local Storage)

The extension stores the following settings in `browser.storage.sync`:

- Backend API URL (user-configured)
- Backend API key (user-configured)
- Default FACEIT pseudo (user-configured)
- FACEIT Open Data API key (user-configured, for direct mode)
- Mock mode toggle

These values are entered by the user, stored locally in the browser, and never transmitted to any third party.

## External Requests

The extension communicates only with:

- **FACEIT Open Data API** (`open.faceit.com`) — to fetch player statistics and match data using the user-provided API key.
- **User-configured self-hosted backend** — an optional server operated by the user themselves.

No data is sent to the extension developer or any third-party analytics, advertising, or tracking service.

## Third-Party Services

FACEIT Coach does not integrate with any third-party analytics, advertising, or data broker services.

## Changes to This Policy

If this policy is updated, the date at the top of this page will be revised. Continued use of the extension after changes constitutes acceptance of the updated policy.

## Contact

For questions about this privacy policy, contact: quentin.maignan@ignimission.com
