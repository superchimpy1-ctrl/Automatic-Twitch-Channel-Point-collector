// Figure out which channel the active tab is on so the popup can show the
// points collected for that streamer specifically.
async function getActiveChannel() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length || !tabs[0].url) return null;
    const url = new URL(tabs[0].url);
    if (!url.hostname.endsWith("twitch.tv")) return null;
    return url.pathname.split("/").filter(Boolean)[0] || null;
  } catch (e) {
    return null;
  }
}

async function render() {
  const data = await browser.storage.local.get([
    "points",
    "claimCount",
    "autoClaimEnabled",
    "claimLog",
    "pointsByChannel",
    "totalCollected",
  ]);

  document.getElementById("points").textContent = data.points || "– (open a stream)";
  document.getElementById("count").textContent = data.claimCount || 0;
  document.getElementById("total").textContent = (data.totalCollected || 0).toLocaleString();
  document.getElementById("toggle").checked = data.autoClaimEnabled !== false;

  const channel = await getActiveChannel();
  const byChannel = data.pointsByChannel || {};
  if (channel) {
    document.getElementById("channelLabel").textContent = `Collected on ${channel}`;
    document.getElementById("channelPoints").textContent = (byChannel[channel] || 0).toLocaleString();
  } else {
    document.getElementById("channelLabel").textContent = "Collected on this channel";
    document.getElementById("channelPoints").textContent = "– (open a stream)";
  }

  const log = data.claimLog || [];
  const ul = document.getElementById("log");
  ul.innerHTML = "";
  if (log.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No claims yet";
    ul.appendChild(li);
  } else {
    log.slice(0, 10).forEach((entry) => {
      const li = document.createElement("li");
      const d = new Date(entry.time);
      const gained = entry.gained ? ` (+${entry.gained})` : "";
      li.textContent = `${d.toLocaleTimeString()} — ${entry.channel}${gained}`;
      ul.appendChild(li);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  render();
  document.getElementById("toggle").addEventListener("change", (e) => {
    browser.storage.local.set({ autoClaimEnabled: e.target.checked });
  });
});

setInterval(render, 3000);
