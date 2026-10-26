(() => {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";
    const POLL_MS = 500;
    const EVENTS_MS = 4000;
    const MAX_SAMPLES = 180;
    const EAR_MAX = 0.5;
    const MAR_MAX = 1.5;
    const PAGE_SIZE = 25;

    const VIEWS = {
        dashboard: { title: "Dashboard", sub: "Live driver monitoring overview" },
        history: { title: "History", sub: "Saved drowsiness events and trends" },
        live: { title: "Live stream", sub: "Full camera view with detection overlay" },
        settings: { title: "Settings", sub: "Detection thresholds, alarm sound and API" }
    };

    const TYPES = {
        EYE_CLOSURE: { label: "Eye closure", cls: "eye", icon: "i-eye-off" },
        YAWNING: { label: "Yawning", cls: "yawn", icon: "i-mouth" },
        DROWSINESS: { label: "Drowsiness", cls: "combo", icon: "i-alert" }
    };

    const state = {
        view: "dashboard",
        tab: "log",
        filter: "ALL",
        shown: PAGE_SIZE,
        running: false,
        status: null,
        events: [],
        eventsLoaded: false,
        eventsUpdated: null,
        samples: [],
        sound: true,
        earThreshold: 0.25,
        marThreshold: 0.8,
        frameThreshold: 18,
        wasDrowsy: false,
        polling: false
    };

    const $ = (id) => document.getElementById(id);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));
    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

    function readStore(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function writeStore(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            /* storage unavailable, ignore */
        }
    }

    function h(tag, cls, text) {
        const node = document.createElement(tag);
        if (cls) {
            node.className = cls;
        }
        if (text !== undefined) {
            node.textContent = text;
        }
        return node;
    }

    function icon(id) {
        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("class", "icon");
        svg.setAttribute("aria-hidden", "true");
        const use = document.createElementNS(SVG_NS, "use");
        use.setAttribute("href", "#" + id);
        svg.appendChild(use);
        return svg;
    }

    function svgEl(name, attrs, text) {
        const node = document.createElementNS(SVG_NS, name);
        Object.keys(attrs || {}).forEach((key) => node.setAttribute(key, attrs[key]));
        if (text !== undefined) {
            node.textContent = text;
        }
        return node;
    }

    /* ---------- Time helpers ---------- */

    function parseTime(value) {
        if (Array.isArray(value)) {
            return new Date(value[0], (value[1] || 1) - 1, value[2] || 1,
                value[3] || 0, value[4] || 0, value[5] || 0);
        }
        return new Date(String(value).replace(/(\.\d{3})\d+/, "$1"));
    }

    function formatTime(date) {
        if (isNaN(date.getTime())) {
            return "Unknown time";
        }
        return date.toLocaleString(undefined, {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
    }

    function timeAgo(date) {
        if (isNaN(date.getTime())) {
            return "";
        }
        const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
        if (seconds < 10) {
            return "just now";
        }
        if (seconds < 60) {
            return seconds + " s ago";
        }
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return minutes + " min ago";
        }
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return hours + " h ago";
        }
        return Math.floor(hours / 24) + " d ago";
    }

    /* ---------- Alarm sound ---------- */

    let audioContext = null;
    let alarmTimer = null;

    function initAudio() {
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContext.state === "suspended") {
                audioContext.resume();
            }
        } catch (e) {
            audioContext = null;
        }
    }

    function beep() {
        if (!audioContext) {
            return;
        }
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "square";
        oscillator.frequency.value = 880;
        gain.gain.value = 0.2;
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    }

    function startAlarm() {
        if (alarmTimer || !state.sound) {
            return;
        }
        beep();
        alarmTimer = setInterval(beep, 500);
    }

    function stopAlarm() {
        if (alarmTimer) {
            clearInterval(alarmTimer);
            alarmTimer = null;
        }
    }

    function setSound(on) {
        state.sound = on;
        writeStore("dd-sound", on ? "1" : "0");
        $("soundBtn").setAttribute("aria-pressed", String(on));
        $("soundBtn").title = on ? "Alarm sound on" : "Alarm sound off";
        $("soundIcon").setAttribute("href", on ? "#i-volume" : "#i-volume-x");
        $("soundSwitch").checked = on;
        if (!on) {
            stopAlarm();
        }
    }

    /* ---------- Layout: views, sidebar ---------- */

    function viewFromHash() {
        const name = location.hash.replace("#", "");
        return VIEWS[name] ? name : "dashboard";
    }

    function showView(name) {
        state.view = name;
        $$(".view").forEach((section) => {
            section.hidden = section.id !== "view-" + name;
        });
        $$(".nav-item[data-view]").forEach((link) => {
            if (link.dataset.view === name) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
        $("pageTitle").textContent = VIEWS[name].title;
        $("pageSub").textContent = VIEWS[name].sub;
        document.title = VIEWS[name].title + " · Driver Drowsiness Detection";
        $("content").scrollTop = 0;
        closeDrawer();
        syncVideo();
        if (name === "history") {
            renderHistory();
            if (state.tab === "analytics") {
                renderAnalytics();
            }
        }
        renderTrends();
    }

    function setCollapsed(collapsed) {
        $("app").classList.toggle("collapsed", collapsed);
        $("collapseBtn").setAttribute("aria-expanded", String(!collapsed));
        $("collapseBtn").title = collapsed ? "Expand sidebar" : "Collapse sidebar";
        writeStore("dd-collapsed", collapsed ? "1" : "0");
    }

    function openDrawer() {
        $("app").classList.add("drawer-open");
        $("backdrop").hidden = false;
    }

    function closeDrawer() {
        $("app").classList.remove("drawer-open");
        $("backdrop").hidden = true;
    }

    /* ---------- Video ---------- */

    function syncVideo() {
        const targets = [
            { img: $("videoFeedDash"), empty: $("videoEmptyDash"), view: "dashboard" },
            { img: $("videoFeedLive"), empty: $("videoEmptyLive"), view: "live" }
        ];
        targets.forEach((target) => {
            const wanted = state.running && state.view === target.view;
            if (wanted) {
                if (!target.img.getAttribute("src")) {
                    target.img.src = "/api/video/stream?t=" + Date.now();
                }
                target.img.hidden = false;
                target.empty.hidden = true;
            } else {
                if (target.img.getAttribute("src")) {
                    target.img.removeAttribute("src");
                }
                target.img.hidden = true;
                target.empty.hidden = false;
            }
        });
        $("hud").hidden = !(state.running && state.view === "live");
    }

    /* ---------- Status rendering ---------- */

    function setMessage(text) {
        $$(".js-message").forEach((node) => {
            node.textContent = text;
        });
    }

    function setPill(pillId, textId, tone, text) {
        $(pillId).dataset.tone = tone;
        $(textId).textContent = text;
    }

    function setServer(online) {
        if (online) {
            setPill("serverPill", "serverStatus", "ok", "Server online");
        } else {
            setPill("serverPill", "serverStatus", "bad", "Server offline");
            setPill("cameraPill", "cameraStatus", "idle", "Camera unknown");
        }
    }

    function setCount(node, value) {
        const from = Number(node.dataset.value || 0);
        node.dataset.value = String(value);
        if (from === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            node.textContent = String(value);
            return;
        }
        const start = performance.now();
        const duration = 600;
        const tick = (now) => {
            const t = clamp((now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            node.textContent = String(Math.round(from + (value - from) * eased));
            if (t < 1) {
                requestAnimationFrame(tick);
            }
        };
        requestAnimationFrame(tick);
    }

    function updateBar(bar, frames) {
        const percent = clamp(frames / state.frameThreshold) * 100;
        bar.style.width = percent + "%";
        bar.classList.remove("warn", "danger");
        if (percent >= 100) {
            bar.classList.add("danger");
        } else if (percent >= 50) {
            bar.classList.add("warn");
        }
    }

    function setGauge(prefix, value, max, threshold) {
        $(prefix + "Fill").style.width = clamp(value / max) * 100 + "%";
        $(prefix + "Mark").style.left = "calc(" + clamp(threshold / max) * 100 + "% - 1px)";
    }

    function alertKind(data) {
        if (!state.running) {
            return "off";
        }
        if (data.state === "DROWSY") {
            return data.eventType === "YAWNING" ? "warning" : "danger";
        }
        if (data.state === "NO_FACE") {
            return "noface";
        }
        return "safe";
    }

    function alertCopy(kind, data) {
        if (kind === "off") {
            return { icon: "i-power", title: "Monitoring off", text: "Start detection to begin live monitoring.", banner: "" };
        }
        if (kind === "safe") {
            return { icon: "i-shield", title: "Driver alert", text: "No signs of fatigue detected.", banner: "" };
        }
        if (kind === "noface") {
            return { icon: "i-user", title: "No face detected", text: "Face the camera to resume monitoring.", banner: "" };
        }
        if (kind === "warning") {
            return { icon: "i-mouth", title: "Yawning alert", text: "Fatigue sign detected. Stay focused.", banner: "YAWNING ALERT!" };
        }
        if (data.eventType === "DROWSINESS") {
            return { icon: "i-alert", title: "Drowsiness alert", text: "Eyes closed and yawning. Immediate risk.", banner: "DROWSINESS ALERT!" };
        }
        return { icon: "i-eye-off", title: "Eye closure alert", text: "Eyes closed too long. Immediate risk.", banner: "EYE CLOSURE ALERT!" };
    }

    function applyStatus(data) {
        state.status = data;
        state.running = Boolean(data.running);

        if (typeof data.earThreshold === "number") {
            state.earThreshold = data.earThreshold;
        }
        if (typeof data.marThreshold === "number") {
            state.marThreshold = data.marThreshold;
        }
        if (typeof data.frameThreshold === "number") {
            state.frameThreshold = data.frameThreshold;
        }
        $("setEar").textContent = state.earThreshold.toFixed(2);
        $("setMar").textContent = state.marThreshold.toFixed(2);
        $("setFrames").textContent = String(state.frameThreshold);
        $$(".js-frame-limit").forEach((node) => {
            node.textContent = String(state.frameThreshold);
        });

        $$(".js-start").forEach((button) => {
            button.disabled = state.running;
        });
        $$(".js-stop").forEach((button) => {
            button.disabled = !state.running;
        });
        $$(".js-live-tag").forEach((tag) => {
            tag.textContent = state.running ? "Live" : "Offline";
            tag.classList.toggle("is-live", state.running);
        });

        const kind = alertKind(data);
        const copy = alertCopy(kind, data);
        const panel = $("alertPanel");
        if (panel.dataset.state !== kind || $("alertTitle").textContent !== copy.title) {
            panel.dataset.state = kind;
            $("alertIcon").setAttribute("href", "#" + copy.icon);
            $("alertTitle").textContent = copy.title;
            $("alertText").textContent = copy.text;
        }

        const drowsy = state.running && data.state === "DROWSY";
        $("app").dataset.alarm = String(drowsy);
        $("alertBanner").hidden = !drowsy;
        if (drowsy) {
            $("alertBannerText").textContent = copy.banner;
            $("alertBanner").dataset.tone = kind;
            startAlarm();
        } else {
            stopAlarm();
        }
        if (drowsy && !state.wasDrowsy) {
            setTimeout(loadEvents, 700);
        }
        state.wasDrowsy = drowsy;

        if (!state.running) {
            setPill("cameraPill", "cameraStatus", "idle", "Camera off");
        } else if (data.state === "NO_FACE") {
            setPill("cameraPill", "cameraStatus", "warn", "No face");
        } else {
            setPill("cameraPill", "cameraStatus", "ok", "Camera on");
        }

        const ear = state.running ? Number(data.ear) || 0 : 0;
        const mar = state.running ? Number(data.mar) || 0 : 0;
        const eyeFrames = state.running ? data.eyeFrames : 0;
        const yawnFrames = state.running ? data.yawnFrames : 0;

        $("earValue").textContent = ear.toFixed(2);
        $("marValue").textContent = mar.toFixed(2);
        $("eyeFrames").textContent = String(eyeFrames);
        $("yawnFrames").textContent = String(yawnFrames);
        updateBar($("eyeBar"), eyeFrames);
        updateBar($("yawnBar"), yawnFrames);
        setGauge("ear", ear, EAR_MAX, state.earThreshold);
        setGauge("mar", mar, MAR_MAX, state.marThreshold);
        $("earMetric").classList.toggle("is-hot", state.running && data.state !== "NO_FACE" && ear < state.earThreshold);
        $("marMetric").classList.toggle("is-hot", state.running && mar > state.marThreshold);

        $("hudEar").textContent = ear.toFixed(2);
        $("hudMar").textContent = mar.toFixed(2);
        const hudState = $("hudState");
        hudState.dataset.state = kind;
        hudState.textContent = kind === "safe" ? "Alert"
            : kind === "noface" ? "No face"
            : kind === "off" ? "Off"
            : copy.title;

        if (state.running && data.state !== "NO_FACE") {
            state.samples.push({ ear: ear, mar: mar });
            if (state.samples.length > MAX_SAMPLES) {
                state.samples.shift();
            }
        }

        syncVideo();
        renderTrends();
    }

    /* ---------- Charts ---------- */

    function drawTrend(svg) {
        const W = 640;
        const H = 240;
        const L = 44;
        const R = 44;
        const T = 14;
        const B = 28;
        const iw = W - L - R;
        const ih = H - T - B;
        svg.replaceChildren();

        for (let i = 0; i <= 4; i++) {
            const y = T + (ih * i) / 4;
            svg.appendChild(svgEl("line", { class: "grid-line", x1: L, x2: W - R, y1: y, y2: y }));
            svg.appendChild(svgEl("text", { class: "axis-left", x: L - 8, y: y + 4 }, (EAR_MAX * (1 - i / 4)).toFixed(2)));
            svg.appendChild(svgEl("text", { class: "axis-right", x: W - R + 8, y: y + 4 }, (MAR_MAX * (1 - i / 4)).toFixed(1)));
        }

        const seconds = Math.round((MAX_SAMPLES * POLL_MS) / 1000);
        svg.appendChild(svgEl("text", { class: "axis-mid", x: L, y: H - 8 }, "-" + seconds + " s"));
        svg.appendChild(svgEl("text", { class: "axis-mid", x: W - R, y: H - 8 }, "now"));

        const samples = state.samples;
        if (samples.length < 2) {
            svg.appendChild(svgEl("text", { class: "empty-text", x: W / 2, y: H / 2 }, "Start detection to stream live EAR and MAR values."));
            return;
        }

        const earThresholdY = T + ih * (1 - clamp(state.earThreshold / EAR_MAX));
        const marThresholdY = T + ih * (1 - clamp(state.marThreshold / MAR_MAX));
        svg.appendChild(svgEl("line", { class: "thr-ear", x1: L, x2: W - R, y1: earThresholdY, y2: earThresholdY }));
        svg.appendChild(svgEl("line", { class: "thr-mar", x1: L, x2: W - R, y1: marThresholdY, y2: marThresholdY }));

        const point = (index, value, max) => {
            const x = L + iw * (1 - (samples.length - 1 - index) / (MAX_SAMPLES - 1));
            const y = T + ih * (1 - clamp(value / max));
            return x.toFixed(1) + "," + y.toFixed(1);
        };
        const earPoints = samples.map((s, i) => point(i, s.ear, EAR_MAX)).join(" ");
        const marPoints = samples.map((s, i) => point(i, s.mar, MAR_MAX)).join(" ");
        svg.appendChild(svgEl("polyline", { class: "line-ear", points: earPoints }));
        svg.appendChild(svgEl("polyline", { class: "line-mar", points: marPoints }));
    }

    function renderTrends() {
        if (state.view === "dashboard") {
            drawTrend($("trendMini"));
        }
        if (state.view === "history" && state.tab === "analytics") {
            drawTrend($("trendChart"));
        }
    }

    function countByType(list) {
        const counts = { EYE_CLOSURE: 0, YAWNING: 0, DROWSINESS: 0 };
        list.forEach((event) => {
            if (counts[event.eventType] !== undefined) {
                counts[event.eventType]++;
            }
        });
        return counts;
    }

    function renderTypeBars() {
        const counts = countByType(state.events);
        const total = state.events.length;
        const box = $("typeBars");
        box.replaceChildren();
        Object.keys(TYPES).forEach((key) => {
            const type = TYPES[key];
            const row = h("div", "type-row");
            const head = h("div", "type-row-head");
            head.appendChild(h("span", "", type.label));
            head.appendChild(h("b", "", String(counts[key])));
            const track = h("div", "type-track");
            const fill = h("div", "type-fill " + type.cls);
            fill.style.width = total ? (counts[key] / total) * 100 + "%" : "0%";
            track.appendChild(fill);
            row.appendChild(head);
            row.appendChild(track);
            box.appendChild(row);
        });
    }

    function renderHourChart() {
        const svg = $("hourChart");
        const W = 400;
        const H = 160;
        const L = 26;
        const T = 8;
        const B = 24;
        const ih = H - T - B;
        const buckets = [];
        for (let i = 0; i < 12; i++) {
            buckets.push({ EYE_CLOSURE: 0, YAWNING: 0, DROWSINESS: 0 });
        }
        const now = Date.now();
        state.events.forEach((event) => {
            const hoursAgo = Math.floor((now - event.time.getTime()) / 3600000);
            if (hoursAgo >= 0 && hoursAgo < 12 && buckets[11 - hoursAgo][event.eventType] !== undefined) {
                buckets[11 - hoursAgo][event.eventType]++;
            }
        });
        const totals = buckets.map((b) => b.EYE_CLOSURE + b.YAWNING + b.DROWSINESS);
        const max = Math.max(4, ...totals);

        svg.replaceChildren();
        for (let i = 0; i <= 2; i++) {
            const y = T + (ih * i) / 2;
            svg.appendChild(svgEl("line", { class: "grid-line", x1: L, x2: W, y1: y, y2: y }));
            svg.appendChild(svgEl("text", { class: "axis-left", x: L - 6, y: y + 4 }, String(Math.round(max * (1 - i / 2)))));
        }
        const slot = (W - L) / 12;
        const barWidth = slot * 0.62;
        buckets.forEach((bucket, index) => {
            let y = T + ih;
            const x = L + slot * index + (slot - barWidth) / 2;
            [["EYE_CLOSURE", "#ef4444"], ["YAWNING", "#f59e0b"], ["DROWSINESS", "#fb7185"]].forEach((pair) => {
                const value = bucket[pair[0]];
                if (!value) {
                    return;
                }
                const height = (value / max) * ih;
                y -= height;
                svg.appendChild(svgEl("rect", { x: x.toFixed(1), y: y.toFixed(1), width: barWidth.toFixed(1), height: height.toFixed(1), rx: 3, fill: pair[1] }));
            });
        });
        [[0, "-12 h"], [4, "-8 h"], [8, "-4 h"], [11, "now"]].forEach((pair) => {
            svg.appendChild(svgEl("text", { class: "axis-mid", x: (L + slot * pair[0] + slot / 2).toFixed(1), y: H - 6 }, pair[1]));
        });
    }

    function renderAnalytics() {
        drawTrend($("trendChart"));
        renderTypeBars();
        renderHourChart();
    }

    /* ---------- Events ---------- */

    function buildRow(event) {
        const type = TYPES[event.eventType] || TYPES.EYE_CLOSURE;
        const row = h("div", "row " + type.cls);

        const badge = h("div", "row-badge");
        badge.appendChild(icon(type.icon));

        const main = h("div", "row-main");
        main.appendChild(h("span", "tag", type.label));
        main.appendChild(h("span", "row-id", "#" + event.id));

        const ear = h("div", "row-metric");
        ear.appendChild(icon("i-eye"));
        ear.appendChild(h("span", "", "EAR"));
        ear.appendChild(h("b", "", Number(event.earValue).toFixed(2)));

        const mar = h("div", "row-metric");
        mar.appendChild(icon("i-mouth"));
        mar.appendChild(h("span", "", "MAR"));
        mar.appendChild(h("b", "", Number(event.marValue).toFixed(2)));

        const time = h("div", "row-time");
        time.appendChild(icon("i-clock"));
        time.appendChild(h("span", "", formatTime(event.time)));
        time.appendChild(h("em", "", timeAgo(event.time)));

        row.append(badge, main, ear, mar, time);
        return row;
    }

    function emptyState(title, text) {
        const box = h("div", "empty");
        box.appendChild(icon("i-shield"));
        box.appendChild(h("strong", "", title));
        box.appendChild(h("span", "", text));
        return box;
    }

    function updateStats() {
        const counts = countByType(state.events);
        setCount($("statTotal"), state.events.length);
        setCount($("statEye"), counts.EYE_CLOSURE);
        setCount($("statYawn"), counts.YAWNING);
        $("statTotalNote").textContent = counts.DROWSINESS
            ? counts.DROWSINESS + " combined"
            : "All saved alerts";
        updateLast();

        $("chipAll").textContent = String(state.events.length);
        $("chipEye").textContent = String(counts.EYE_CLOSURE);
        $("chipYawn").textContent = String(counts.YAWNING);
        $("chipCombo").textContent = String(counts.DROWSINESS);
    }

    function updateLast() {
        if (!state.events.length) {
            $("statLast").textContent = "None yet";
            $("statLastNote").textContent = "No alerts saved";
            return;
        }
        const latest = state.events[0];
        const type = TYPES[latest.eventType] || TYPES.EYE_CLOSURE;
        $("statLast").textContent = timeAgo(latest.time);
        $("statLastNote").textContent = type.label;
    }

    function renderRecent() {
        const box = $("recentRows");
        box.replaceChildren();
        if (!state.events.length) {
            box.appendChild(emptyState("No alerts yet", "Saved alerts appear here as soon as one is detected."));
            return;
        }
        state.events.slice(0, 5).forEach((event) => box.appendChild(buildRow(event)));
    }

    function renderHistory() {
        const box = $("eventRows");
        box.replaceChildren();

        const list = state.filter === "ALL"
            ? state.events
            : state.events.filter((event) => event.eventType === state.filter);

        if (!state.events.length) {
            box.appendChild(emptyState("No drowsiness events yet", "Start detection and close your eyes or yawn to record one."));
        } else if (!list.length) {
            box.appendChild(emptyState("No matching events", "Choose another filter to see more alerts."));
        } else {
            list.slice(0, state.shown).forEach((event) => box.appendChild(buildRow(event)));
        }

        $("moreBtn").hidden = list.length <= state.shown;
        $("lastUpdated").textContent = state.eventsUpdated
            ? "Updated " + state.eventsUpdated.toLocaleTimeString()
            : "";
    }

    async function loadEvents() {
        try {
            const response = await fetch("/api/events", { cache: "no-store" });
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            const list = await response.json();
            state.events = list.map((event) => Object.assign({}, event, { time: parseTime(event.detectedAt) }));
            state.eventsLoaded = true;
            state.eventsUpdated = new Date();
            updateStats();
            renderRecent();
            if (state.view === "history") {
                renderHistory();
                if (state.tab === "analytics") {
                    renderAnalytics();
                }
            }
        } catch (e) {
            if (!state.eventsLoaded) {
                $("lastUpdated").textContent = "Could not load events. Check that the server is running.";
            }
        }
    }

    /* ---------- Server calls ---------- */

    async function pollStatus() {
        if (state.polling) {
            return;
        }
        state.polling = true;
        try {
            const response = await fetch("/api/status", { cache: "no-store" });
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            const data = await response.json();
            setServer(true);
            applyStatus(data);
        } catch (e) {
            setServer(false);
        } finally {
            state.polling = false;
        }
    }

    async function startDetection() {
        initAudio();
        setMessage("Starting camera...");
        $$(".js-start").forEach((button) => {
            button.disabled = true;
        });
        try {
            const response = await fetch("/api/detection/start", { method: "POST" });
            let data = {};
            try {
                data = await response.json();
            } catch (e) {
                data = {};
            }
            if (response.ok && data.running) {
                setMessage("");
                state.samples = [];
            } else {
                setMessage(data.message || "Could not start detection.");
                $$(".js-start").forEach((button) => {
                    button.disabled = false;
                });
            }
        } catch (e) {
            setMessage("Cannot reach the server.");
            $$(".js-start").forEach((button) => {
                button.disabled = false;
            });
        }
        pollStatus();
    }

    async function stopDetection() {
        $$(".js-stop").forEach((button) => {
            button.disabled = true;
        });
        try {
            await fetch("/api/detection/stop", { method: "POST" });
            setMessage("");
        } catch (e) {
            setMessage("Cannot reach the server.");
        }
        await pollStatus();
        loadEvents();
    }

    /* ---------- Wiring ---------- */

    function selectTab(name) {
        state.tab = name;
        $$(".tab").forEach((tab) => {
            tab.setAttribute("aria-selected", String(tab.dataset.tab === name));
        });
        $("panelLog").hidden = name !== "log";
        $("panelAnalytics").hidden = name !== "analytics";
        if (name === "analytics") {
            renderAnalytics();
        } else {
            renderHistory();
        }
    }

    function selectFilter(value) {
        state.filter = value;
        state.shown = PAGE_SIZE;
        $$(".chip").forEach((chip) => {
            chip.setAttribute("aria-pressed", String(chip.dataset.filter === value));
        });
        renderHistory();
    }

    function init() {
        document.addEventListener("click", initAudio);
        window.addEventListener("hashchange", () => showView(viewFromHash()));

        $$(".js-start").forEach((button) => button.addEventListener("click", startDetection));
        $$(".js-stop").forEach((button) => button.addEventListener("click", stopDetection));

        $("collapseBtn").addEventListener("click", () => setCollapsed(!$("app").classList.contains("collapsed")));
        $("menuBtn").addEventListener("click", openDrawer);
        $("backdrop").addEventListener("click", closeDrawer);
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeDrawer();
            }
        });

        $("soundBtn").addEventListener("click", () => setSound(!state.sound));
        $("soundSwitch").addEventListener("change", (event) => setSound(event.target.checked));

        $$(".tab").forEach((tab) => tab.addEventListener("click", () => selectTab(tab.dataset.tab)));
        $$(".chip").forEach((chip) => chip.addEventListener("click", () => selectFilter(chip.dataset.filter)));
        $("moreBtn").addEventListener("click", () => {
            state.shown += PAGE_SIZE;
            renderHistory();
        });
        $("refreshBtn").addEventListener("click", loadEvents);

        setSound(readStore("dd-sound") !== "0");
        setCollapsed(readStore("dd-collapsed") === "1");
        showView(viewFromHash());
        renderRecent();
        renderTypeBars();

        pollStatus();
        loadEvents();
        setInterval(pollStatus, POLL_MS);
        setInterval(loadEvents, EVENTS_MS);
        setInterval(updateLast, 15000);
    }

    init();
})();