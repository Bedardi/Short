// Initialize theme
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    });
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
    }
});

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyB0NUK3sawGjEs0orsmZmFuGm-OP1_8gYQ",
    authDomain: "computer-course-6bf66.firebaseapp.com",
    databaseURL: "https://computer-course-6bf66-default-rtdb.firebaseio.com",
    projectId: "341786723203",
    storageBucket: "computer-course-6bf66.appspot.com",
    messagingSenderId: "341786723203",
    appId: "1:341786723203:android:b4a01068b77aa8cc90acb6"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const DOMAIN = 'https://bhai.pages.dev';

async function shortenUrl() {
    const longUrl = document.getElementById('longUrl').value.trim();
    const expiration = document.getElementById('expiration').value;
    const enableTracking = document.getElementById('enableTracking').checked;
    if (!longUrl) {
        alert('Please enter a valid URL');
        return;
    }
    if (!longUrl.match(/^https?:\/\/.+/)) {
        alert('URL must start with http:// or https://');
        return;
    }
    try {
        let shortCode;
        let exists;
        do {
            shortCode = Math.random().toString(36).substring(2, 8);
            exists = await db.ref('urls/' + shortCode).once('value');
        } while (exists.exists());
        let expiry = null;
        if (expiration !== 'unlimited') {
            let ms = 0;
            const num = parseInt(expiration);
            if (expiration.endsWith('hour')) ms = num * 3600000;
            else if (expiration.endsWith('day')) ms = num * 86400000;
            else if (expiration.endsWith('month')) ms = num * 2592000000;
            else if (expiration.endsWith('year')) ms = num * 31536000000;
            expiry = Date.now() + ms;
        }
        const data = {
            longUrl,
            clicks: [],
            expiry,
            trackEnabled: enableTracking
        };
        await db.ref('urls/' + shortCode).set(data);
        const shortUrl = `${DOMAIN}/${shortCode}`;
        document.getElementById('result').innerHTML = `
            <p class="text-green-600 dark:text-green-400">
                Short URL: <a href="${shortUrl}" target="_blank" rel="noopener">${shortUrl}</a>
                <button class="copy-btn bg-indigo-600 text-white px-3 py-1 rounded-lg ml-2 hover:bg-indigo-700 transition duration-300" onclick="copyToClipboard('${shortUrl}', this)">
                    Copy
                </button>
            </p>
        `;
        alert('URL shortened successfully!');
    } catch (error) {
        alert('Failed to shorten URL: ' + error.message);
    }
}

async function getAnalytics() {
    const shortCode = document.getElementById('shortCode').value.trim();
    if (!shortCode) {
        alert('Please enter a short code');
        return;
    }
    try {
        const snapshot = await db.ref('urls/' + shortCode).once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            const uniqueIPs = new Set(data.clicks ? data.clicks.map(c => c.ip) : []);
            document.getElementById('analytics-result').innerHTML = `
                <ul class="text-gray-800 dark:text-gray-200">
                    <li><strong>Long URL:</strong> <a href="${data.longUrl}" target="_blank" rel="noopener">${data.longUrl}</a></li>
                    <li><strong>Expiry:</strong> ${data.expiry ? new Date(data.expiry).toLocaleString() : 'Unlimited'}</li>
                    <li><strong>Tracking Enabled:</strong> ${data.trackEnabled ? 'Yes' : 'No'}</li>
                    <li><strong>Total Clicks:</strong> ${data.clicks ? data.clicks.length : 0}</li>
                    <li><strong>Unique IPs:</strong> ${uniqueIPs.size}</li>
                    <li><strong>Click Details:</strong>
                        <ul class="ml-4">
                            ${data.clicks ? data.clicks.map(click => `<li>IP: ${click.ip} | Time: ${new Date(click.timestamp).toLocaleString()}</li>`).join('') : '<li>No clicks yet</li>'}
                        </ul>
                    </li>
                </ul>
            `;
            alert('Analytics fetched successfully!');
        } else {
            alert('Short code not found');
        }
    } catch (error) {
        alert('Failed to fetch analytics: ' + error.message);
    }
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        button.classList.add('copied');
        setTimeout(() => button.classList.remove('copied'), 2000);
        alert('Short URL copied to clipboard!');
    }).catch(err => {
        alert('Failed to copy URL: ' + err.message);
    });
}

// Handle redirects
window.onload = async () => {
    const path = window.location.pathname;
    if (path !== '/' && path !== '/index.html') {
        const shortCode = path.slice(1);
        try {
            const snapshot = await db.ref('urls/' + shortCode).once('value');
            if (snapshot.exists()) {
                const data = snapshot.val();
                if (data.expiry && Date.now() > data.expiry) {
                    document.body.innerHTML = '<h1 class="text-center text-2xl font-bold text-gray-800 dark:text-gray-200 mt-8">URL Expired</h1><p class="text-center text-gray-600 dark:text-gray-400">This short URL has expired.</p>';
                    return;
                }
                if (data.trackEnabled) {
                    let ip = 'Unknown';
                    try {
                        const res = await fetch('https://api.ipify.org?format=json');
                        const json = await res.json();
                        ip = json.ip;
                    } catch (e) {}
                    const timestamp = new Date().toISOString();
                    const clicks = data.clicks || [];
                    clicks.push({ ip, timestamp });
                    await db.ref('urls/' + shortCode).update({ clicks });
                }
                window.location.href = data.longUrl;
            } else {
                document.body.innerHTML = '<h1 class="text-center text-2xl font-bold text-gray-800 dark:text-gray-200 mt-8">URL Not Found</h1><p class="text-center text-gray-600 dark:text-gray-400">Sorry, the requested URL does not exist.</p>';
            }
        } catch (error) {
            document.body.innerHTML = `<h1 class="text-center text-2xl font-bold text-gray-800 dark:text-gray-200 mt-8">Error</h1><p class="text-center text-gray-600 dark:text-gray-400">An error occurred: ${error.message}</p>`;
        }
    }
};
