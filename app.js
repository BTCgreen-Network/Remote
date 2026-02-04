const ipInput = document.getElementById("ip-input");
const portInput = document.getElementById("port-input");
const updateButton = document.getElementById("update-ip");
const currentIp = document.getElementById("current-ip");
const logContainer = document.getElementById("log");
const statusEl = document.getElementById("connection-status");
const clearLog = document.getElementById("clear-log");
const corsToggle = document.getElementById("cors-toggle");

const formatTimestamp = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const addLogEntry = (message) => {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `<div>${message}</div><span>${formatTimestamp()}</span>`;
  logContainer.prepend(entry);
};

const setStatus = (label, ok = true) => {
  statusEl.querySelector("span:last-child").textContent = label;
  statusEl.querySelector(".status__dot").style.background = ok
    ? "#5bff8a"
    : "#ff5f7a";
};

const getBaseUrl = () => {
  const ip = ipInput.value.trim();
  const port = portInput.value.trim() || "1925";
  return `http://${ip}:${port}`;
};

const buildFetchOptions = (body) => {
  const useNoCors = corsToggle.checked;
  return {
    method: "POST",
    mode: useNoCors ? "no-cors" : "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
};

const sendKey = async (key) => {
  const url = `${getBaseUrl()}/1/input/key`;
  addLogEntry(`Sending key: ${key}`);

  try {
    const response = await fetch(url, buildFetchOptions({ key }));

    if (!corsToggle.checked && !response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    setStatus(corsToggle.checked ? "Command sent (no-cors)" : "Command sent", true);
  } catch (error) {
    setStatus("Failed to reach TV", false);
    addLogEntry(`Error: ${error.message}. Try no-cors mode or a local proxy.`);
  }
};

const launchApp = async (app) => {
  const url = `${getBaseUrl()}/1/activities/launch`;
  addLogEntry(`Launching: ${app}`);

  try {
    const response = await fetch(
      url,
      buildFetchOptions({ intent: { action: app } })
    );

    if (!corsToggle.checked && !response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    setStatus(corsToggle.checked ? "App launched (no-cors)" : "App launched", true);
  } catch (error) {
    setStatus("Launch failed", false);
    addLogEntry(`Error: ${error.message}. Try no-cors mode or a local proxy.`);
  }
};

updateButton.addEventListener("click", () => {
  currentIp.textContent = ipInput.value.trim();
  setStatus("Ready", true);
  addLogEntry("IP address updated");
});

clearLog.addEventListener("click", () => {
  logContainer.innerHTML = "";
});

document.querySelectorAll("[data-key]").forEach((button) => {
  button.addEventListener("click", () => sendKey(button.dataset.key));
});

document.querySelectorAll("[data-app]").forEach((button) => {
  button.addEventListener("click", () => launchApp(button.dataset.app));
});

addLogEntry("Remote ready. Connect to your Philips TV.");
