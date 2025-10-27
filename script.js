const apiKey = "b5942a652694abcd49d1b78ee28e9d7b";
const apiUrl = "https://api.openweathermap.org/data/2.5/forecast";
let currentUnit = "C";

function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

function fetchWeather(city = "Tiruchirappalli") {
    fetch(`${apiUrl}?q=${city}&appid=${apiKey}&units=metric`)
        .then(res => {
            if (!res.ok) throw new Error("City not found");
            return res.json();
        })
        .then(data => updateUI(data))
        .catch(() => alert("City not found or network error. Try again!"));
}

function updateUI(data) {
    // Current Main
    const now = data.list[0];
    let temp = Math.round(now.main.temp);
    let maxTemp = Math.round(now.main.temp_max);
    let minTemp = Math.round(now.main.temp_min);

    if (currentUnit === "F") {
        temp = Math.round(celsiusToFahrenheit(temp));
        maxTemp = Math.round(celsiusToFahrenheit(maxTemp));
        minTemp = Math.round(celsiusToFahrenheit(minTemp));
        document.getElementById('unit').textContent = "°F";
    } else {
        document.getElementById('unit').textContent = "°C";
    }
    document.getElementById("current-temp").textContent = temp;
    document.getElementById("max-temp").textContent = `Max: ${maxTemp}°`;
    document.getElementById("min-temp").textContent = `Min: ${minTemp}°`;
    document.getElementById("weather-desc").textContent =
        now.weather[0].description.replace(/\b\w/g, l => l.toUpperCase());
    document.getElementById("weather-icon").src =
        `https://openweathermap.org/img/wn/${now.weather[0].icon}@2x.png`;
    document.getElementById("city").textContent = data.city.name;
    document.getElementById("country").textContent = data.city.country;

    // Prepare weekdays & rain alert
    const daysMap = {};
    data.list.forEach(item => {
        const dt = new Date((item.dt + data.city.timezone) * 1000);
        const day = dt.toLocaleDateString(undefined, { weekday: "short"});
        if (!daysMap[day] && dt.getHours() === 12) daysMap[day] = item;
    });
    if (Object.keys(daysMap).length < 6) {
        data.list.forEach(item => {
            const dt = new Date((item.dt + data.city.timezone) * 1000);
            const day = dt.toLocaleDateString(undefined, { weekday: "short"});
            if (!daysMap[day]) daysMap[day] = item;
        });
    }
    let daysHTML = "";
    let rainPredicted = false;
    const threshold = (currentUnit === "F") ? 68 : 20;
    Object.entries(daysMap).slice(0,6).forEach(([lbl, obj], idx) => {
        let dayMax = Math.round(obj.main.temp_max);
        let dayMin = Math.round(obj.main.temp_min);
        if (currentUnit === "F") {
            dayMax = Math.round(celsiusToFahrenheit(dayMax));
            dayMin = Math.round(celsiusToFahrenheit(dayMin));
        }
        if (dayMin < threshold) rainPredicted = true;
        daysHTML += `<div class="weekday-block${idx===0?' selected':''}">
            <div class="day-label">${lbl}</div>
            <div class="icon-small"><img src="<https://openweathermap.org/img/wn/${obj.weather>[0].icon}.png"/></div>
            <div class="temp-label">${dayMax}° ${dayMin}°</div>
        </div>`;
    });
    document.getElementById("weekdays").innerHTML = daysHTML;

    // Show/hide rain alert button
    const rainBtn = document.getElementById("rain-alert-btn");
    if (rainPredicted) {
        rainBtn.style.display = "block";
    } else {
        rainBtn.style.display = "none";
    }

    drawTempGraph(data.list, data.city.timezone);
    startLocalTimeUpdater(data.city.timezone);
}

function drawTempGraph(forecastList, tzOffset) {
    const canvas = document.getElementById("tempChart");
    const parentWidth = canvas.parentElement.offsetWidth || 600;
    canvas.width = parentWidth;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const N = Math.min(9, forecastList.length);
    const padding = 45;
    const step = (canvas.width - 2 * padding) / (N-1);

    let temps = forecastList.slice(0, N).map(x => x.main.temp);
    if (currentUnit === "F") temps = temps.map(t => celsiusToFahrenheit(t));
    const times = forecastList.slice(0, N).map(x => {
        const dt = new Date((x.dt + tzOffset) * 1000);
        return dt.getHours() + ":00";
    });
    const yMin = Math.min(...temps) - 3;
    const yMax = Math.max(...temps) + 3;
    const spread = yMax - yMin;

    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, 20);
    ctx.lineTo(padding, 120);
    ctx.lineTo(canvas.width - padding, 120);
    ctx.stroke();

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    for (let i = 0; i < temps.length; i++) {
        let x = padding + i * step;
        let y = 120 - ((temps[i] - yMin) / spread) * 80;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    for (let i = 0; i < temps.length; i++) {
        let x = padding + i * step;
        let y = 120 - ((temps[i] - yMin) / spread) * 80;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(Math.round(temps[i]) + "°", x, y - 10);
        ctx.fillStyle = "#eee";
        ctx.fillText(times[i], x, 135);
    }
}

function startLocalTimeUpdater(offset) {
    if (window.__localClockInterval) clearInterval(window.__localClockInterval);
    window.__localClockInterval = setInterval(() => {
        const now = new Date();
        const cityTime = new Date(now.getTime() + offset * 1000 - now.getTimezoneOffset() * 60000);
        let weekday = cityTime.toLocaleString(undefined, { weekday: 'long' });
        let timeStr = cityTime.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
        document.getElementById("local-time").textContent =
            `${weekday} ${timeStr}`;
    }, 1000);
}

// Event listeners
document.getElementById("search-btn").onclick = () => {
    const input = document.getElementById("city-input").value.trim();
    if(input) fetchWeather(input);
};
document.getElementById("city-input").addEventListener("keydown", (e) => {
    if(e.key === "Enter") {
        const input = document.getElementById("city-input").value.trim();
        if(input) fetchWeather(input);
    }
});
document.getElementById('celsius-btn').addEventListener('click', () => {
    currentUnit = "C";
    document.getElementById('celsius-btn').classList.add('active');
    document.getElementById('fahrenheit-btn').classList.remove('active');
    fetchWeather(document.getElementById('city-input').value || 'Tiruchirappalli');
});
document.getElementById('fahrenheit-btn').addEventListener('click', () => {
    currentUnit = "F";
    document.getElementById('fahrenheit-btn').classList.add('active');
    document.getElementById('celsius-btn').classList.remove('active');
    fetchWeather(document.getElementById('city-input').value || 'Tiruchirappalli');
});

// Initial load
fetchWeather();
