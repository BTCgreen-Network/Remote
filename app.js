const ipInput = document.getElementById("ip-input");
const portInput = document.getElementById("port-input");
const updateButton = document.getElementById("update-ip");
const currentIp = document.getElementById("current-ip");
const logContainer = document.getElementById("log");
const statusEl = document.getElementById("connection-status");
const clearLog = document.getElementById("clear-log");
const corsToggle = document.getElementById("cors-toggle");
const proxyToggle = document.getElementById("proxy-toggle");
const pairRequestButton = document.getElementById("pair-request");
const pairConfirmButton = document.getElementById("pair-confirm");
const pairCodeInput = document.getElementById("pair-code");

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

const getRequestUrl = (path) => {
  if (proxyToggle.checked) {
    return `/api${path}`;
  }
  return `${getBaseUrl()}${path}`;
};

const getRequestMode = () => {
  if (proxyToggle.checked) {
    return "same-origin";
  }
  return corsToggle.checked ? "no-cors" : "cors";
};

const generateDeviceId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `device-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
};

const getDeviceInfo = () => {
  const storedId = localStorage.getItem("philips-remote-id");
  const deviceId = storedId || generateDeviceId();
  if (!storedId) {
    localStorage.setItem("philips-remote-id", deviceId);
  }
  return {
    device_id: deviceId,
    device_name: "Philips Web Remote",
    device_os: "Web",
    device_os_version: navigator.userAgent,
    app_name: "Philips Remote",
    app_id: "philips-web-remote",
    type: "remote"
  };
};

const buildFetchOptions = (body) => {
  const useNoCors = corsToggle.checked && !proxyToggle.checked;
  const headers = { "Content-Type": "application/json" };
  if (proxyToggle.checked) {
    headers["X-TV-IP"] = ipInput.value.trim();
    headers["X-TV-PORT"] = portInput.value.trim() || "1925";
  }
  return {
    method: "POST",
    mode: getRequestMode(),
    headers,
    body: JSON.stringify(body)
  };
};

const requestPairing = async () => {
  const url = getRequestUrl("/1/pair/request");
  addLogEntry("Requesting pairing from TV...");

  try {
    const response = await fetch(url, buildFetchOptions({ device: getDeviceInfo() }));
    if (!proxyToggle.checked && corsToggle.checked) {
      setStatus("Pairing requested (no-cors)", true);
      addLogEntry("Pairing request sent. Check the TV for a code.");
      return;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    localStorage.setItem("philips-auth-key", data.auth_key || "");
    setStatus("Pairing requested", true);
    addLogEntry("Pairing request sent. Enter the code shown on the TV.");
  } catch (error) {
    setStatus("Pairing request failed", false);
    addLogEntry(`Error: ${error.message}. Try a local proxy if CORS blocks requests.`);
  }
};

const confirmPairing = async () => {
  const pin = pairCodeInput.value.trim();
  if (!pin) {
    setStatus("Enter pairing code", false);
    addLogEntry("Add the pairing code shown on the TV.");
    return;
  }

  const authKey = localStorage.getItem("philips-auth-key") || "";
  const url = getRequestUrl("/1/pair/grant");
  addLogEntry("Confirming pairing...");

  try {
    const response = await fetch(
      url,
      buildFetchOptions({ auth: { auth_key: authKey }, device: getDeviceInfo(), pin })
    );
    if (!proxyToggle.checked && corsToggle.checked) {
      setStatus("Pairing sent (no-cors)", true);
      addLogEntry("Pairing confirmation sent. If it fails, use the local proxy.");
      return;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    setStatus("Paired", true);
    addLogEntry("Pairing complete. Commands should now be authorized.");
  } catch (error) {
    setStatus("Pairing failed", false);
    addLogEntry(`Error: ${error.message}. Confirm the code and try again.`);
  }
};

const sendKey = async (key) => {
  const url = getRequestUrl("/1/input/key");
  addLogEntry(`Sending key: ${key}`);

  try {
    const response = await fetch(url, buildFetchOptions({ key }));

    if (!proxyToggle.checked && corsToggle.checked) {
      setStatus("Command sent (no-cors)", true);
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    setStatus("Command sent", true);
  } catch (error) {
    setStatus("Failed to reach TV", false);
    addLogEntry(`Error: ${error.message}. Try the local proxy or no-cors mode.`);
  }
};

const launchApp = async (app) => {
  const url = getRequestUrl("/1/activities/launch");
  addLogEntry(`Launching: ${app}`);

  try {
    const response = await fetch(
      url,
      buildFetchOptions({ intent: { action: app } })
    );

    if (!proxyToggle.checked && corsToggle.checked) {
      setStatus("App launched (no-cors)", true);
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    setStatus("App launched", true);
  } catch (error) {
    setStatus("Launch failed", false);
    addLogEntry(`Error: ${error.message}. Try the local proxy or no-cors mode.`);
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

pairRequestButton.addEventListener("click", requestPairing);
pairConfirmButton.addEventListener("click", confirmPairing);

document.querySelectorAll("[data-key]").forEach((button) => {
  button.addEventListener("click", () => sendKey(button.dataset.key));
});

document.querySelectorAll("[data-app]").forEach((button) => {
  button.addEventListener("click", () => launchApp(button.dataset.app));
});

addLogEntry("Remote ready. Connect to your Philips TV.");
