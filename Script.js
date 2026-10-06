/* ==========================================
   CREATORCALC JAVASCRIPT
========================================== */

/* SETTINGS */

const USD_TO_TSH = 2600;

// Simplified estimate ranges. NOT guaranteed platform payouts.
const rpmRates = {
    youtube:   { min: 1,    max: 8 },
    tiktok:    { min: 0.20, max: 1 },
    instagram: { min: 0.10, max: 1 },
    facebook:  { min: 0.50, max: 4 },
    website:   { min: 1,    max: 10 }
};

const countryMultipliers = {
    tz: 0.55,
    ke: 0.65,
    ug: 0.55,
    ng: 0.65,
    gh: 0.70,
    za: 0.90,
    us: 1,
    uk: 0.95,
    ca: 0.95,
    au: 0.95,
    other: 0.75
};

const platformNames = {
    youtube: "YouTube",
    tiktok: "TikTok",
    instagram: "Instagram",
    facebook: "Facebook",
    website: "Website"
};


/* GET HTML ELEMENTS */

const platform = document.getElementById("platform");
const country = document.getElementById("country");
const views = document.getElementById("views");
const calculateButton = document.getElementById("calculateButton");

const result = document.getElementById("result");
const earnings = document.getElementById("earnings");
const tshEarnings = document.getElementById("tshEarnings");
const dailyEarnings = document.getElementById("dailyEarnings");
const monthlyEarnings = document.getElementById("monthlyEarnings");
const yearlyEarnings = document.getElementById("yearlyEarnings");
const resultDescription = document.getElementById("resultDescription");

const shareButton = document.getElementById("shareButton");
const copyButton = document.getElementById("copyButton");

const goalPlatform = document.getElementById("goalPlatform");
const goalCountry = document.getElementById("goalCountry");
const incomeGoal = document.getElementById("incomeGoal");
const goalButton = document.getElementById("goalButton");

const goalResult = document.getElementById("goalResult");
const requiredViews = document.getElementById("requiredViews");
const goalDescription = document.getElementById("goalDescription");

const comparisonCountry = document.getElementById("comparisonCountry");
const comparisonViews = document.getElementById("comparisonViews");
const compareButton = document.getElementById("compareButton");
const comparisonBody = document.getElementById("comparisonBody");

const historyContainer = document.getElementById("historyContainer");
const clearHistory = document.getElementById("clearHistory");

const themeButton = document.getElementById("themeButton");


/* SAFE STORAGE (won't crash if storage is blocked) */

function storageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        return null;
    }
}

function storageSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        /* ignore */
    }
}

function storageRemove(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        /* ignore */
    }
}


/* FORMAT MONEY */

function formatUSD(amount) {
    return "$" + amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatTSH(amount) {
    return "TSh " + Math.round(amount).toLocaleString("en-US");
}


/* COPY TEXT (with fallback) */

function copyText(text) {

    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {

        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.focus();
        area.select();

        try {
            const ok = document.execCommand("copy");
            document.body.removeChild(area);
            ok ? resolve() : reject();
        } catch (error) {
            document.body.removeChild(area);
            reject(error);
        }
    });
}


/* MAIN CALCULATOR */

function calculateEarnings() {

    const selectedPlatform = platform.value;
    const selectedCountry = country.value;
    const viewAmount = Number(views.value);

    if (!viewAmount || viewAmount <= 0) {
        alert("Please enter a valid number of monthly views.");
        return;
    }

    const rate = rpmRates[selectedPlatform];
    const multiplier = countryMultipliers[selectedCountry];

    const lowEarnings = (viewAmount / 1000) * rate.min * multiplier;
    const highEarnings = (viewAmount / 1000) * rate.max * multiplier;
    const averageEarnings = (lowEarnings + highEarnings) / 2;

    const daily = averageEarnings / 30;
    const yearly = averageEarnings * 12;
    const tsh = averageEarnings * USD_TO_TSH;

    earnings.textContent = formatUSD(averageEarnings);
    tshEarnings.textContent = formatTSH(tsh);
    dailyEarnings.textContent = formatUSD(daily);
    monthlyEarnings.textContent = formatUSD(averageEarnings);
    yearlyEarnings.textContent = formatUSD(yearly);

    resultDescription.textContent =
        platformNames[selectedPlatform] +
        " with " +
        viewAmount.toLocaleString() +
        " monthly views could generate approximately " +
        formatUSD(lowEarnings) +
        " to " +
        formatUSD(highEarnings) +
        " per month. Actual earnings can vary.";

    result.classList.remove("hidden");

    saveCalculation(
        selectedPlatform,
        selectedCountry,
        viewAmount,
        lowEarnings,
        highEarnings
    );

    displayHistory();

    result.scrollIntoView({ behavior: "smooth", block: "center" });
}

calculateButton.addEventListener("click", calculateEarnings);

views.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        calculateEarnings();
    }
});


/* COPY RESULT */

function copyResult() {

    if (result.classList.contains("hidden")) {
        alert("Please calculate your earnings first.");
        return;
    }

    const text =
        "CreatorCalc Estimate\n\n" +
        "Platform: " + platformNames[platform.value] + "\n" +
        "Monthly Views: " + Number(views.value).toLocaleString() + "\n" +
        "Estimated Monthly Earnings: " + earnings.textContent + "\n" +
        "Estimated TSh: " + tshEarnings.textContent;

    copyText(text)
        .then(function () {
            alert("Result copied!");
        })
        .catch(function () {
            alert("Could not copy the result.");
        });
}

copyButton.addEventListener("click", copyResult);


/* SHARE RESULT */

function shareResult() {

    if (result.classList.contains("hidden")) {
        alert("Please calculate your earnings first.");
        return;
    }

    const text =
        "I used CreatorCalc to estimate my creator earnings!\n\n" +
        platformNames[platform.value] +
        " • " +
        Number(views.value).toLocaleString() +
        " monthly views\n" +
        "Estimated: " +
        earnings.textContent;

    if (navigator.share) {

        navigator.share({
            title: "CreatorCalc",
            text: text
        }).catch(function () {
            /* user cancelled sharing */
        });

    } else {

        copyText(text)
            .then(function () {
                alert("Share text copied to clipboard!");
            })
            .catch(function () {
                alert("Could not share the result.");
            });
    }
}

shareButton.addEventListener("click", shareResult);


/* INCOME GOAL CALCULATOR */

function calculateGoal() {

    const selectedPlatform = goalPlatform.value;
    const selectedCountry = goalCountry.value;
    const goal = Number(incomeGoal.value);

    if (!goal || goal <= 0) {
        alert("Please enter a valid income goal.");
        return;
    }

    const rate = rpmRates[selectedPlatform];
    const multiplier = countryMultipliers[selectedCountry];

    const averageRPM = ((rate.min + rate.max) / 2) * multiplier;
    const viewsNeeded = (goal / averageRPM) * 1000;

    requiredViews.textContent = Math.ceil(viewsNeeded).toLocaleString();

    goalDescription.textContent =
        "To reach approximately " +
        formatUSD(goal) +
        " per month on " +
        platformNames[selectedPlatform] +
        ", you may need around " +
        Math.ceil(viewsNeeded).toLocaleString() +
        " monthly views.";

    goalResult.classList.remove("hidden");

    goalResult.scrollIntoView({ behavior: "smooth", block: "center" });
}

goalButton.addEventListener("click", calculateGoal);

incomeGoal.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        calculateGoal();
    }
});


/* PLATFORM COMPARISON */

function comparePlatforms() {

    const viewAmount = Number(comparisonViews.value);

    if (!viewAmount || viewAmount <= 0) {
        alert("Please enter a valid number of views.");
        return;
    }

    const multiplier = countryMultipliers[comparisonCountry.value];

    comparisonBody.innerHTML = "";

    Object.keys(rpmRates).forEach(function (platformKey) {

        const rate = rpmRates[platformKey];

        const low = (viewAmount / 1000) * rate.min * multiplier;
        const high = (viewAmount / 1000) * rate.max * multiplier;

        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        const lowCell = document.createElement("td");
        const highCell = document.createElement("td");

        nameCell.textContent = platformNames[platformKey];
        lowCell.textContent = formatUSD(low);
        highCell.textContent = formatUSD(high);

        row.appendChild(nameCell);
        row.appendChild(lowCell);
        row.appendChild(highCell);

        comparisonBody.appendChild(row);
    });
}

compareButton.addEventListener("click", comparePlatforms);

comparisonViews.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        comparePlatforms();
    }
});


/* HISTORY */

function getHistory() {

    const saved = storageGet("creatorCalcHistory");

    if (!saved) {
        return [];
    }

    try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function saveCalculation(platformKey, countryKey, viewAmount, low, high) {

    const history = getHistory();

    history.unshift({
        platform: platformKey,
        country: countryKey,
        views: viewAmount,
        low: low,
        high: high,
        date: new Date().toLocaleString()
    });

    if (history.length > 10) {
        history.pop();
    }

    storageSet("creatorCalcHistory", JSON.stringify(history));
}

function displayHistory() {

    const history = getHistory();

    historyContainer.innerHTML = "";

    if (history.length === 0) {

        const empty = document.createElement("p");
        empty.className = "empty-history";
        empty.textContent = "No calculations yet.";
        historyContainer.appendChild(empty);

        return;
    }

    history.forEach(function (item) {

        const box = document.createElement("div");
        box.className = "history-item";

        const platformName = document.createElement("div");
        platformName.className = "history-platform";
        platformName.textContent = platformNames[item.platform] || item.platform;

        const viewsText = document.createElement("div");
        viewsText.textContent = Number(item.views).toLocaleString() + " monthly views";

        const earningsText = document.createElement("div");
        earningsText.textContent = formatUSD(item.low) + " - " + formatUSD(item.high);

        const dateText = document.createElement("div");
        dateText.className = "history-date";
        dateText.textContent = item.date;

        box.appendChild(platformName);
        box.appendChild(viewsText);
        box.appendChild(earningsText);
        box.appendChild(dateText);

        historyContainer.appendChild(box);
    });
}

clearHistory.addEventListener("click", function () {
    storageRemove("creatorCalcHistory");
    displayHistory();
});


/* DARK / LIGHT MODE */

function loadTheme() {

    if (storageGet("creatorCalcTheme") === "light") {
        document.body.classList.add("light-mode");
        themeButton.textContent = "☀️";
    } else {
        themeButton.textContent = "🌙";
    }
}

function toggleTheme() {

    document.body.classList.toggle("light-mode");

    const isLight = document.body.classList.contains("light-mode");

    storageSet("creatorCalcTheme", isLight ? "light" : "dark");
    themeButton.textContent = isLight ? "☀️" : "🌙";
}

themeButton.addEventListener("click", toggleTheme);


/* STARTUP */

loadTheme();
displayHistory();
comparePlatforms();
