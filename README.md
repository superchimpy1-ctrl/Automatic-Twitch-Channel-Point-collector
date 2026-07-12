Only works on fire fox.
# Twitch Bonus Points Collector

A small Firefox extension that watches a Twitch stream and automatically
claims the channel bonus points button that appears below chat. It also
tracks your current points balance and a running log of claims in a popup.

## Features

- Auto-clicks the "claim bonus" button as soon as it appears, with a cooldown
  to avoid double-clicking
- Displays your live channel points balance in the toolbar popup
- Keeps a session log of recent claims (time + channel)
- Toggle to turn auto-claim on/off without removing the extension

## Installation (temporary, unsigned)

Firefox only allows unsigned extensions to run as **temporary add-ons**,
which are unloaded every time Firefox restarts.

1. Clone or download this repo
2. Open `about:debugging#/runtime/this-firefox` in Firefox
3. Click **Load Temporary Add-on**
4. Select `twitch-bonus-points-repo-v2.zip` from the cloned repo
5. Open a live twitch.tv stream — the toolbar icon opens the popup

> **You'll need to repeat step 2–4 every time you restart Firefox.** For a
> persistent install without publishing to addons.mozilla.org, see the
> `xpinstall.signatures.required` option in Firefox Developer Edition/Nightly,
> or use [`web-ext run`](https://github.com/mozilla/web-ext) for local
> development.

## How it works

`content.js` runs on `twitch.tv` pages and uses a `MutationObserver` (plus a
15-second polling fallback) to detect the bonus claim button, which Twitch
marks with an `aria-label` containing "bonus". When found, it's clicked and
the claim is logged to `browser.storage.local`, which the popup reads to
render the balance/count/log.

Twitch's DOM structure changes occasionally. If claiming stops working,
inspect the bonus button in devtools when it appears and update the selector
logic in `findClaimButton()` inside `content.js`.

## Disclaimer

Automatically claiming bonus points is a form of automated interaction with
Twitch, which its Terms of Service prohibit. This project is provided as-is
for personal/educational use — there's some risk of account action if Twitch
flags the automation pattern. Use at your own discretion.

## License

MIT — see `LICENSE` (add one if you plan to accept contributions).
