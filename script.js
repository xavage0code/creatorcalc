/* ==========================================
   CREATORCALC - CALCULATOR SCRIPT
========================================== */
"use strict";

/* ---------- SETTINGS ---------- */

// Simplified RPM ranges (USD per 1,000 views). Estimates only.
const rpmRates = {
    youtube:   { min: 1,    max: 8 },
    tiktok:    { min: 0.20, max: 1 },
    instagram: { min: 0.10, max: 1 },
    facebook:  { min: 0.50, max: 4 },
    website:   { min: 1,    max: 10 }
};

const platformNames = {
    youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram",
    facebook: "Facebook", website: "Website"
};

// n = name, c = currency code, m = audience value multiplier
const countries = {
    tz: { n: "Tanzania",       c: "TZS", m: 0.55 },
    ke: { n: "Kenya",          c: "KES", m: 0.65 },
    ug: { n: "Uganda",         c: "UGX", m: 0.55 },
    rw: { n: "Rwanda",         c: "RWF", m: 0.55 },
    et: { n: "Ethiopia",       c: "ETB", m: 0.45 },
    zm: { n: "Zambia",         c: "ZMW", m: 0.55 },
    ng: { n: "Nigeria",        c: "NGN", m: 0.65 },
    gh: { n: "Ghana",          c: "GHS", m: 0.70 },
    za: { n: "South Africa",   c: "ZAR", m: 0.90 },
    eg: { n: "Egypt",          c: "EGP", m: 0.55 },
    in: { n: "India",          c: "INR", m: 0.40 },
    pk: { n: "Pakistan",       c: "PKR", m: 0.35 },
    ph: { n: "Philippines",    c: "PHP", m: 0.50 },
    br: { n: "Brazil",         c: "BRL", m: 0.55 },
    ae: { n: "United Arab Emirates", c: "AED", m: 0.90 },
    de: { n: "Germany",        c: "EUR", m: 0.95 },
    uk: { n: "United Kingdom", c: "GBP", m: 0.95 },
    ca: { n: "Canada",         c: "CAD", m: 0.95 },
    au: { n: "Australia",      c: "AUD", m: 0.95 },
    us: { n: "United States",  c: "USD", m: 1 },
    other: { n: "Other country", c: "USD", m: 0.75 }
};

const currencyNames = {
    USD: "US Dollars", TZS: "Tanzanian Shillings", KES: "Kenyan Shillings",
    UGX: "Ugandan Shillings", RWF: "Rwandan Francs", ETB: "Ethiopian Birr",
    ZMW: "Zambian Kwacha", NGN: "Nigerian Naira", GHS: "Ghanaian Cedis",
    ZAR: "South African Rand", EGP: "Egyptian Pounds", INR: "Indian Rupees",
    PKR: "Pakistani Rupees", PHP: "Philippine Pesos", BRL: "Brazilian Reais",
    AED: "UAE Dirhams", EUR: "Euros", GBP: "British Pounds",
    CAD: "Canadian Dollars", AUD: "Australian Dollars"
};

// Approximate fallback rates (units per 1 USD), used if live rates cannot load.
let rates = {
    USD: 1, TZS: 2600, KES: 129, UGX: 3650, RWF: 1400, ETB: 135, ZMW: 26,
    NGN: 1550, GHS: 12, ZAR: 18, EGP: 49, INR: 85, PKR: 280, PHP: 57,
    BRL: 5.5, AED: 3.67, EUR: 0.92, GBP: 0.78, CAD: 1.38, AUD: 1.52
};

const noDecimals = ["TZS", "UGX", "RWF", "ETB", "NGN", "KES", "PKR", "INR", "PHP"];

const $ = function (id) { return document.getElementById(id); };
let lastCalc = null;

/* ---------- SAFE STORAGE ---------- */

function storageGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* ignore */ } }
function storageRemove(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }

/* ---------- FORMATTING ---------- */

function toLocal(usd, code) { return usd * (rates[code] || 1); }

function fmtCur(amount, code) {
    const d = noDecimals.indexOf(code) > -1 ? 0 : 2;
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency", currency: code,
            minimumFractionDigits: d, maximumFractionDigits: d
        }).format(amount);
    } catch (e) {
        return code + " " + Math.round(amount).toLocaleString("en-US");
    }
}
function fmtUSD(amount) { return fmtCur(amount, "USD"); }
function num(n) { return Math.round(n).toLocaleString("en-US"); }
function curOf(countryKey) { return countries[countryKey].c; }

/* ---------- COUNTRY DROPDOWNS ---------- */

function fillCountries() {
    ["country", "goalCountry", "comparisonCountry", "projCountry"].forEach(function (id) {
        const select = $(id);
        if (!select) return;
        Object.keys(countries).forEach(function (key) {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = countries[key].n + (countries[key].c !== "USD" ? " (" + countries[key].c + ")" : "");
            select.appendChild(option);
        });
    });
}

/* ---------- LIVE EXCHANGE RATES ---------- */

function setRateNote(text) { const el = $("rateNote"); if (el) el.textContent = text; }

function applyRates(data, label) {
    Object.keys(data).forEach(function (code) {
        if (typeof data[code] === "number" && data[code] > 0) rates[code] = data[code];
    });
    setRateNote(label);
    if (lastCalc && !$("result").classList.contains("hidden")) calculateEarnings(true);
    updateGoalModes();
    comparePlatforms();
}

function loadRates() {
    setRateNote("Exchange rates are approximate.");
    try {
        const cached = JSON.parse(storageGet("creatorCalcRates"));
        if (cached && Date.now() - cached.time < 12 * 3600 * 1000) {
            applyRates(cached.rates, "Exchange rates: live (cached " + new Date(cached.time).toLocaleDateString() + ").");
            return;
        }
    } catch (e) { /* ignore */ }

    if (!window.fetch) return;
    fetch("https://open.er-api.com/v6/latest/USD")
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data && data.rates) {
                storageSet("creatorCalcRates", JSON.stringify({ time: Date.now(), rates: data.rates }));
                applyRates(data.rates, "Exchange rates: live (updated " + new Date().toLocaleDateString() + ").");
            }
        })
        .catch(function () { setRateNote("Exchange rates are approximate (live rates unavailable)."); });
}

/* ---------- MAIN CALCULATOR ---------- */

function calcRange(platformKey, countryKey, views) {
    const rate = rpmRates[platformKey], m = countries[countryKey].m;
    const low = (views / 1000) * rate.min * m;
    const high = (views / 1000) * rate.max * m;
    return { low: low, high: high, avg: (low + high) / 2 };
}

function calculateEarnings(silent) {
    const pKey = $("platform").value, cKey = $("country").value;
    const views = Number($("views").value);

    if (!views || views <= 0) {
        if (!silent) alert("Please enter a valid number of monthly views.");
        return;
    }

    const cur = curOf(cKey), r = calcRange(pKey, cKey, views);
    const showLocal = cur !== "USD";

    $("earnings").textContent = fmtUSD(r.avg);
    $("localBox").classList.toggle("hidden", !showLocal);
    $("localEarnings").textContent = fmtCur(toLocal(r.avg, cur), cur);
    $("localLabel").textContent = (currencyNames[cur] || cur) + " / month (average)";

    const parts = [["daily", r.avg / 30], ["monthly", r.avg], ["yearly", r.avg * 12]];
    parts.forEach(function (p) {
        $(p[0] + "Earnings").textContent = fmtUSD(p[1]);
        $(p[0] + "Local").textContent = showLocal ? fmtCur(toLocal(p[1], cur), cur) : "";
    });

    const rpm = rpmRates[pKey], m = countries[cKey].m;
    $("rpmInfo").textContent = "Estimated RPM for " + countries[cKey].n + ": " +
        fmtUSD(rpm.min * m) + " to " + fmtUSD(rpm.max * m) + " per 1,000 views";

    $("resultDescription").textContent =
        platformNames[pKey] + " with " + num(views) + " monthly views could generate roughly " +
        fmtUSD(r.low) + " to " + fmtUSD(r.high) + " per month" +
        (showLocal ? " (about " + fmtCur(toLocal(r.low, cur), cur) + " to " + fmtCur(toLocal(r.high, cur), cur) + ")" : "") +
        ". Actual earnings can vary.";

    $("result").classList.remove("hidden");
    lastCalc = { platform: pKey, country: cKey, views: views, low: r.low, high: r.high, avg: r.avg };

    if (!silent) {
        saveCalculation(lastCalc);
        displayHistory();
        $("result").scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

/* ---------- COPY / SHARE ---------- */

function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
        const area = document.createElement("textarea");
        area.value = text; area.style.position = "fixed"; area.style.opacity = "0";
        document.body.appendChild(area); area.focus(); area.select();
        try { const ok = document.execCommand("copy"); document.body.removeChild(area); ok ? resolve() : reject(); }
        catch (e) { document.body.removeChild(area); reject(e); }
    });
}

function resultText(intro) {
    const c = lastCalc, cur = curOf(c.country);
    return intro + "\n\nPlatform: " + platformNames[c.platform] +
        "\nCountry: " + countries[c.country].n +
        "\nMonthly Views: " + num(c.views) +
        "\nEstimated Monthly Earnings: " + fmtUSD(c.avg) +
        (cur !== "USD" ? "\nIn " + (currencyNames[cur] || cur) + ": " + fmtCur(toLocal(c.avg, cur), cur) : "") +
        "\nRange: " + fmtUSD(c.low) + " - " + fmtUSD(c.high);
}

function copyResult() {
    if (!lastCalc) { alert("Please calculate your earnings first."); return; }
    copyText(resultText("CreatorCalc Estimate"))
        .then(function () { alert("Result copied!"); })
        .catch(function () { alert("Could not copy the result."); });
}

function shareResult() {
    if (!lastCalc) { alert("Please calculate your earnings first."); return; }
    const text = resultText("I used CreatorCalc to estimate my creator earnings!") + "\n\n" + location.href;
    if (navigator.share) {
        navigator.share({ title: "CreatorCalc", text: text }).catch(function () { /* cancelled */ });
    } else {
        copyText(text).then(function () { alert("Share text copied to clipboard!"); })
            .catch(function () { alert("Could not share the result."); });
    }
}

/* ---------- INCOME GOAL ---------- */

function updateGoalModes() {
    const select = $("goalMode"); if (!select) return;
    const previous = select.value;
    const cur = curOf($("goalCountry").value);
    select.innerHTML = "";
    const usd = document.createElement("option");
    usd.value = "usd"; usd.textContent = "USD ($)"; select.appendChild(usd);
    if (cur !== "USD") {
        const loc = document.createElement("option");
        loc.value = "local"; loc.textContent = cur + " (" + (currencyNames[cur] || cur) + ")";
        select.appendChild(loc);
    }
    if (previous === "local" && cur !== "USD") select.value = "local";
}

function calculateGoal() {
    const pKey = $("goalPlatform").value, cKey = $("goalCountry").value;
    const goal = Number($("incomeGoal").value);
    if (!goal || goal <= 0) { alert("Please enter a valid income goal."); return; }

    const cur = curOf(cKey);
    const goalUSD = $("goalMode").value === "local" ? goal / (rates[cur] || 1) : goal;
    const rate = rpmRates[pKey];
    const avgRPM = ((rate.min + rate.max) / 2) * countries[cKey].m;
    const viewsNeeded = Math.ceil((goalUSD / avgRPM) * 1000);

    $("requiredViews").textContent = num(viewsNeeded);
    $("perDayViews").textContent = "About " + num(viewsNeeded / 30) + " views per day";
    $("goalDescription").textContent =
        "To reach about " + fmtUSD(goalUSD) +
        (cur !== "USD" ? " (" + fmtCur(toLocal(goalUSD, cur), cur) + ")" : "") +
        " per month on " + platformNames[pKey] + " with a " + countries[cKey].n +
        " audience, you may need around " + num(viewsNeeded) + " monthly views.";

    $("goalResult").classList.remove("hidden");
    $("goalResult").scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ---------- PLATFORM COMPARISON ---------- */

function comparePlatforms() {
    const views = Number($("comparisonViews").value);
    if (!views || views <= 0) { if (document.activeElement === $("compareButton")) alert("Please enter a valid number of views."); return; }

    const cKey = $("comparisonCountry").value, cur = curOf(cKey);
    const body = $("comparisonBody");
    body.innerHTML = "";

    const keys = Object.keys(rpmRates);
    const maxHigh = Math.max.apply(null, keys.map(function (k) { return calcRange(k, cKey, views).high; }));

    keys.forEach(function (k) {
        const r = calcRange(k, cKey, views);
        const row = document.createElement("tr");

        const name = document.createElement("td");
        name.textContent = platformNames[k];
        const bar = document.createElement("div"); bar.className = "bar";
        const fill = document.createElement("span"); fill.style.width = Math.max(3, r.high / maxHigh * 100) + "%";
        bar.appendChild(fill); name.appendChild(bar);

        const low = document.createElement("td"); low.textContent = fmtUSD(r.low);
        const high = document.createElement("td"); high.textContent = fmtUSD(r.high);
        const avg = document.createElement("td");
        avg.textContent = cur !== "USD" ? fmtCur(toLocal(r.avg, cur), cur) : fmtUSD(r.avg);

        row.appendChild(name); row.appendChild(low); row.appendChild(high); row.appendChild(avg);
        body.appendChild(row);
    });

    $("avgHeader").textContent = "Average (" + cur + ")";
}

/* ---------- 12-MONTH GROWTH PROJECTOR ---------- */

function projectGrowth() {
    const pKey = $("projPlatform").value, cKey = $("projCountry").value;
    const start = Number($("projViews").value), growth = Number($("projGrowth").value);

    if (!start || start <= 0) { alert("Please enter your current monthly views."); return; }
    if (isNaN(growth) || growth < 0 || growth > 100) { alert("Monthly growth must be between 0 and 100 percent."); return; }

    const cur = curOf(cKey), body = $("projBody");
    body.innerHTML = "";
    let total = 0;

    for (let month = 1; month <= 12; month++) {
        const views = start * Math.pow(1 + growth / 100, month - 1);
        const earn = calcRange(pKey, cKey, views).avg;
        total += earn;

        const row = document.createElement("tr");
        [("Month " + month), num(views), fmtUSD(earn), cur !== "USD" ? fmtCur(toLocal(earn, cur), cur) : "-"].forEach(function (t) {
            const td = document.createElement("td"); td.textContent = t; row.appendChild(td);
        });
        body.appendChild(row);
    }

    $("projTotal").textContent = "12-month total: " + fmtUSD(total) +
        (cur !== "USD" ? " (about " + fmtCur(toLocal(total, cur), cur) + ")" : "");
    $("projResult").classList.remove("hidden");
    $("projResult").scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ---------- HISTORY ---------- */

function getHistory() {
    try { const parsed = JSON.parse(storageGet("creatorCalcHistory")); return Array.isArray(parsed) ? parsed : []; }
    catch (e) { return []; }
}

function saveCalculation(c) {
    const history = getHistory();
    history.unshift({ platform: c.platform, country: c.country, views: c.views, low: c.low, high: c.high, date: new Date().toLocaleString() });
    if (history.length > 10) history.pop();
    storageSet("creatorCalcHistory", JSON.stringify(history));
}

function displayHistory() {
    const box = $("historyContainer"), history = getHistory();
    box.innerHTML = "";
    if (!history.length) {
        const p = document.createElement("p"); p.className = "empty-history"; p.textContent = "No calculations yet.";
        box.appendChild(p); return;
    }
    history.forEach(function (item) {
        const div = document.createElement("div"); div.className = "history-item";
        const a = document.createElement("div"); a.className = "history-platform";
        a.textContent = (platformNames[item.platform] || item.platform) + " - " + (countries[item.country] ? countries[item.country].n : "");
        const b = document.createElement("div"); b.textContent = num(item.views) + " monthly views";
        const c = document.createElement("div"); c.textContent = fmtUSD(item.low) + " - " + fmtUSD(item.high);
        const d = document.createElement("div"); d.className = "history-date"; d.textContent = item.date;
        [a, b, c, d].forEach(function (el) { div.appendChild(el); });
        box.appendChild(div);
    });
}

/* ---------- EVENTS ---------- */

function onEnter(el, fn) { el.addEventListener("keydown", function (e) { if (e.key === "Enter") fn(); }); }

fillCountries();
updateGoalModes();

$("calculateButton").addEventListener("click", function () { calculateEarnings(false); });
onEnter($("views"), function () { calculateEarnings(false); });
$("copyButton").addEventListener("click", copyResult);
$("shareButton").addEventListener("click", shareResult);

$("goalCountry").addEventListener("change", updateGoalModes);
$("goalButton").addEventListener("click", calculateGoal);
onEnter($("incomeGoal"), calculateGoal);

$("compareButton").addEventListener("click", comparePlatforms);
$("comparisonCountry").addEventListener("change", comparePlatforms);
onEnter($("comparisonViews"), comparePlatforms);

$("projButton").addEventListener("click", projectGrowth);
onEnter($("projViews"), projectGrowth);

$("clearHistory").addEventListener("click", function () { storageRemove("creatorCalcHistory"); displayHistory(); });

displayHistory();
comparePlatforms();
loadRates();
