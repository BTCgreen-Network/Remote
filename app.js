const ipInput = document.getElementById("ip-input");
const portInput = document.getElementById("port-input");
const updateButton = document.getElementById("update-ip");
const currentIp = document.getElementById("current-ip");
const logContainer = document.getElementById("log");
const statusEl = document.getElementById("connection-status");
const clearLog = document.getElementById("clear-log");
const corsToggle = document.getElementById("cors-toggle");
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

const getDeviceInfo = () => {
  const storedId = localStorage.getItem("philips-remote-id");
  const deviceId = storedId || crypto.randomUUID();
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
  const useNoCors = corsToggle.checked;
  return {
    method: "POST",
    mode: useNoCors ? "no-cors" : "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
};

const requestPairing = async () => {
  if (corsToggle.checked) {
    setStatus("Disable no-cors for pairing", false);
    addLogEntry("Pairing needs CORS access. Turn off no-cors to read the TV response.");
    return;
  }

  const url = `${getBaseUrl()}/1/pair/request`;
  addLogEntry("Requesting pairing from TV...");

  try {
    const response = await fetch(url, buildFetchOptions({ device: getDeviceInfo() }));
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
  if (corsToggle.checked) {
    setStatus("Disable no-cors for pairing", false);
    addLogEntry("Pairing needs CORS access. Turn off no-cors to read the TV response.");
    return;
  }

  const pin = pairCodeInput.value.trim();
  if (!pin) {
    setStatus("Enter pairing code", false);
    addLogEntry("Add the pairing code shown on the TV.");
    return;
  }

  const authKey = localStorage.getItem("philips-auth-key") || "";
  const url = `${getBaseUrl()}/1/pair/grant`;
  addLogEntry("Confirming pairing...");

  try {
    const response = await fetch(
      url,
      buildFetchOptions({ auth: { auth_key: authKey }, device: getDeviceInfo(), pin })
    );
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

pairRequestButton.addEventListener("click", requestPairing);
pairConfirmButton.addEventListener("click", confirmPairing);

document.querySelectorAll("[data-key]").forEach((button) => {
  button.addEventListener("click", () => sendKey(button.dataset.key));
});

document.querySelectorAll("[data-app]").forEach((button) => {
  button.addEventListener("click", () => launchApp(button.dataset.app));
});

addLogEntry("Remote ready. Connect to your Philips TV.");
