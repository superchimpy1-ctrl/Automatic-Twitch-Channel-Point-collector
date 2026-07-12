// Twitch Bonus Points Collector - content script
// Runs on twitch.tv pages. Watches for the channel points balance and the
// "claim bonus" button (which appears/disappears without a full page load),
// and auto-clicks it when auto-claim is enabled.

(function () {
  console.log("[Twitch Bonus Points] content script loaded on", location.href);

  const KEY_ENABLED = "autoClaimEnabled";
  const KEY_COUNT = "claimCount";
  const KEY_POINTS = "points";
  const KEY_LOG = "claimLog";
  const KEY_BY_CHANNEL = "pointsByChannel";
  const KEY_TOTAL = "totalCollected";

  let lastClaimAt = 0;
  const CLAIM_COOLDOWN_MS = 5000; // avoid double-clicking the same button
  const DEFAULT_BONUS = 50; // standard bonus claim value when we can't measure the delta

  function getPointsBalance() {
    const el = document.querySelector('[data-test-selector="balance-string"]');
    return el ? el.textContent.trim() : null;
  }

  // Twitch abbreviates large balances ("12.5K"), so parsed values can be
  // approximate. Returns null when the text isn't a number we understand.
  function parsePoints(text) {
    if (!text) return null;
    const m = /^([\d.,]+)\s*([KM])?$/i.exec(text.trim());
    if (!m) return null;
    const num = parseFloat(m[1].replace(/,/g, ""));
    if (isNaN(num)) return null;
    const mult = { K: 1000, M: 1000000 }[(m[2] || "").toUpperCase()] || 1;
    return Math.round(num * mult);
  }

  function getChannel() {
    return location.pathname.split("/").filter(Boolean)[0] || "(unknown)";
  }

  // Twitch doesn't keep a stable class name on the claim button, but it does
  // set an aria-label containing "bonus" on it. Fall back to the older
  // test-selector class in case that changes back.
  function findClaimButton() {
    const byAria = document.querySelectorAll("button[aria-label]");
    for (const b of byAria) {
      if (/bonus/i.test(b.getAttribute("aria-label"))) return b;
    }
    const legacy = document.querySelector(".claimable-bonus__icon");
    if (legacy) return legacy.closest("button") || legacy;
    return null;
  }

  async function isEnabled() {
    const data = await browser.storage.local.get(KEY_ENABLED);
    return data[KEY_ENABLED] !== false; // default: enabled
  }

  async function recordClaim(gained) {
    const channel = getChannel();
    const data = await browser.storage.local.get([
      KEY_COUNT,
      KEY_LOG,
      KEY_BY_CHANNEL,
      KEY_TOTAL,
    ]);
    const count = (data[KEY_COUNT] || 0) + 1;
    const log = data[KEY_LOG] || [];
    log.unshift({
      time: Date.now(),
      channel: channel,
      gained: gained,
    });
    const byChannel = data[KEY_BY_CHANNEL] || {};
    byChannel[channel] = (byChannel[channel] || 0) + gained;
    await browser.storage.local.set({
      [KEY_COUNT]: count,
      [KEY_LOG]: log.slice(0, 50),
      [KEY_BY_CHANNEL]: byChannel,
      [KEY_TOTAL]: (data[KEY_TOTAL] || 0) + gained,
    });
  }

  async function updatePoints() {
    const points = getPointsBalance();
    if (points) {
      await browser.storage.local.set({ [KEY_POINTS]: points, updatedAt: Date.now() });
    }
  }

  async function tick() {
    updatePoints();

    if (!(await isEnabled())) return;

    const now = Date.now();
    if (now - lastClaimAt < CLAIM_COOLDOWN_MS) return;

    const btn = findClaimButton();
    if (btn) {
      const before = parsePoints(getPointsBalance());
      btn.click();
      lastClaimAt = now;
      setTimeout(async () => {
        await updatePoints();
        // Measure how many points the claim actually granted; abbreviated
        // balances round the delta away, so fall back to the standard bonus.
        const after = parsePoints(getPointsBalance());
        let gained = DEFAULT_BONUS;
        if (before !== null && after !== null && after > before) {
          gained = after - before;
        }
        await recordClaim(gained);
      }, 1500);
    }
  }

  const observer = new MutationObserver(() => {
    tick();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Fallback poll in case the bonus button appears without triggering a
  // mutation the observer catches (e.g. a class toggle deep in a subtree).
  setInterval(tick, 15000);

  tick();
})();
