if (window.petHost) petHost.onEnv(onEnv);

// Live events from hub (auto-reconnect is built into EventSource)
new EventSource('/stream').onmessage = (e) => onEvent(JSON.parse(e.data));
