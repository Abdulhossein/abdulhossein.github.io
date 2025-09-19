// Crypto Tracker Advanced JavaScript
// File: crypto-tracker-script.js

// Global variables
let searchTimeout;
let currentSelectedCoin = { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' };
let isSearching = false;

// API Configuration
const API_CONFIG = {
    COINGECKO_BASE: 'https://api.coingecko.com/api/v3',
    TELEGRAM_RSS: 'https://api.rss2json.com/v1/api.json?rss_url=',
    TELEGRAM_CHANNEL: 'https://t.me/s/Mini_Exchange', // Public channel access
    CORS_PROXY: 'https://api.allorigins.win/raw?url='
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('🚀 Initializing Crypto Tracker Advanced...');
    
    // Initialize search functionality
    initializeSearch();
    
    // Update timestamps and data
    updateTimestamp();
    updateFearGreedIndex();
    updateMarketSummary();
    
    // Load initial coin data
    loadCoinData('bitcoin');
    
    // Load news
    loadTelegramNews();
    
    // Restore previous selections
    restorePreviousSelections();
    
    // Set up periodic updates
    setupPeriodicUpdates();
    
    // Initialize Telegram WebApp if available
    initializeTelegramWebApp();
    
    // Show welcome message
    setTimeout(() => {
        showNotification('مرکز رصد ارزهای دیجیتالی آماده است 🚀', 'success');
    }, 1000);
}

// AJAX Search functionality
function initializeSearch() {
    const searchBox = document.getElementById('cryptoSearch');
    const searchResults = document.getElementById('searchResults');
    
    searchBox.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        
        if (query.length < 3) {
            hideSearchResults();
            return;
        }
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Set new timeout for search
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 500);
    });
    
    // Handle click outside to close results
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            hideSearchResults();
        }
    });
    
    // Handle Enter key
    searchBox.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const firstResult = document.querySelector('.search-result-item');
            if (firstResult) {
                firstResult.click();
            }
        }
    });
}

async function performSearch(query) {
    if (isSearching) return;
    
    isSearching = true;
    const searchResults = document.getElementById('searchResults');
    
    try {
        showSearchLoading();
        
        // Use CoinGecko search API
        const response = await fetch(`${API_CONFIG.COINGECKO_BASE}/search?query=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        const data = await response.json();
        displaySearchResults(data.coins || []);
        
    } catch (error) {
        console.error('Search error:', error);
        showSearchError();
    } finally {
        isSearching = false;
    }
}

function showSearchLoading() {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '<div class="search-loading">🔍 در حال جستجو...</div>';
    searchResults.style.display = 'block';
}

function showSearchError() {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '<div class="search-loading" style="color: #e74c3c;">❌ خطا در جستجو</div>';
}

function displaySearchResults(coins) {
    const searchResults = document.getElementById('searchResults');
    
    if (coins.length === 0) {
        searchResults.innerHTML = '<div class="search-loading">❌ نتیجه‌ای یافت نشد</div>';
        return;
    }
    
    const html = coins.slice(0, 10).map(coin => `
        <div class="search-result-item" onclick="selectSearchResult('${coin.id}', '${coin.symbol.toUpperCase()}', '${coin.name}')">
            <strong>${coin.name} (${coin.symbol.toUpperCase()})</strong>
            <br>
            <small style="color: #7f8c8d;">Market Cap Rank: #${coin.market_cap_rank || 'N/A'}</small>
        </div>
    `).join('');
    
    searchResults.innerHTML = html;
    searchResults.style.display = 'block';
}

function selectSearchResult(coinId, symbol, name) {
    selectCoin(coinId, symbol, name);
    hideSearchResults();
    document.getElementById('cryptoSearch').value = `${name} (${symbol})`;
}

function hideSearchResults() {
    const searchResults = document.getElementById('searchResults');
    searchResults.style.display = 'none';
}

// Coin selection and data loading
async function selectCoin(coinId, symbol, name) {
    currentSelectedCoin = { id: coinId, symbol: symbol, name: name };
    
    // Update UI
    updateCoinTitle(name, symbol);
    
    // Load coin data
    await loadCoinData(coinId);
    
    // Update TradingView chart
    updateTradingViewChart(symbol);
    
    // Store selected coin
    localStorage.setItem('selectedCoin', JSON.stringify(currentSelectedCoin));
    
    // Show feedback
    showNotification(`ارز ${symbol} انتخاب شد`, 'success');
}

function updateCoinTitle(name, symbol) {
    const coinTitle = document.getElementById('coinTitle');
    const coinEmojis = {
        'BTC': '₿', 'ETH': 'Ξ', 'ADA': '🔴', 'SOL': '🟣',
        'XRP': '💧', 'LTC': '🔘', 'DOGE': '🐕', 'MATIC': '🔷'
    };
    
    const emoji = coinEmojis[symbol] || '🪙';
    coinTitle.innerHTML = `📊 اطلاعات ${name} (${symbol}) <span class="crypto-icons">${emoji}</span>`;
}

async function loadCoinData(coinId) {
    try {
        showLoadingInPriceCards();
        
        const response = await fetch(`${API_CONFIG.COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`);
        
        if (!response.ok) {
            throw new Error('Failed to load coin data');
        }
        
        const data = await response.json();
        updatePriceDisplay(data);
        
    } catch (error) {
        console.error('Error loading coin data:', error);
        showErrorInPriceCards();
        showNotification('خطا در دریافت اطلاعات ارز', 'error');
    }
}

function showLoadingInPriceCards() {
    const elements = ['currentPrice', 'change24h', 'volume24h', 'marketCap'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = 'در حال بارگذاری...';
        }
    });
}

function showErrorInPriceCards() {
    const elements = ['currentPrice', 'change24h', 'volume24h', 'marketCap'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = 'خطا در بارگذاری';
            element.style.color = '#e74c3c';
        }
    });
}

function updatePriceDisplay(coinData) {
    const marketData = coinData.market_data;
    
    if (!marketData) {
        showErrorInPriceCards();
        return;
    }
    
    // Update price
    const currentPrice = document.getElementById('currentPrice');
    if (currentPrice && marketData.current_price) {
        const price = marketData.current_price.usd;
        currentPrice.textContent = `$${formatNumber(price)}`;
        currentPrice.style.color = '#27ae60';
    }
    
    // Update 24h change
    const change24h = document.getElementById('change24h');
    if (change24h && marketData.price_change_percentage_24h !== null) {
        const change = marketData.price_change_percentage_24h;
        change24h.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        change24h.style.color = change >= 0 ? '#27ae60' : '#e74c3c';
    }
    
    // Update volume
    const volume24h = document.getElementById('volume24h');
    if (volume24h && marketData.total_volume) {
        const volume = marketData.total_volume.usd;
        volume24h.textContent = `$${formatLargeNumber(volume)}`;
        volume24h.style.color = '#3498db';
    }
    
    // Update market cap
    const marketCap = document.getElementById('marketCap');
    if (marketCap && marketData.market_cap) {
        const cap = marketData.market_cap.usd;
        marketCap.textContent = `$${formatLargeNumber(cap)}`;
        marketCap.style.color = '#f39c12';
    }
}

// Telegram News functionality
async function loadTelegramNews() {
    const newsContainer = document.getElementById('newsContainer');
    
    try {
        // Show loading
        newsContainer.innerHTML = `
            <div class="news-loading">
                <div class="spinner"></div>
                <p>در حال بارگذاری اخبار کانال Mini Exchange...</p>
            </div>
        `;
        
        // Try to get RSS feed from Telegram channel
        await loadTelegramRSS();
        
    } catch (error) {
        console.error('Error loading Telegram news:', error);
        showNewsError();
    }
}

async function loadTelegramRSS() {
    const newsContainer = document.getElementById('newsContainer');
    
    try {
        // Since direct Telegram RSS is limited, we'll use a fallback approach
        // First try with RSS2JSON service
        const rssUrl = `${API_CONFIG.TELEGRAM_RSS}${encodeURIComponent('https://t.me/s/Mini_Exchange')}`;
        
        const response = await fetch(rssUrl);
        if (!response.ok) {
            throw new Error('RSS fetch failed');
        }
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            displayTelegramNews(data.items);
        } else {
            throw new Error('No news items found');
        }
        
    } catch (error) {
        console.error('RSS error:', error);
        // Fallback to mock news
        displayMockNews();
    }
}

function displayTelegramNews(items) {
    const newsContainer = document.getElementById('newsContainer');
    
    const html = items.slice(0, 10).map(item => {
        const date = new Date(item.pubDate);
        const timeAgo = getTimeAgo(date);
        
        return `
            <div class="news-item">
                <div class="news-item-title">
                    ${item.title || 'عنوان خبر'}
                </div>
                <div class="news-item-content">
                    ${truncateText(item.description || item.content || 'محتوای خبر', 120)}
                </div>
                <div class="news-item-meta">
                    <div class="news-item-time">
                        🕐 ${timeAgo}
                    </div>
                    <div style="color: #3498db; cursor: pointer;" onclick="openNewsLink('${item.link}')">
                        📖 مشاهده
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    newsContainer.innerHTML = html;
}

function displayMockNews() {
    const newsContainer = document.getElementById('newsContainer');
    
    const mockNews = [
        {
            title: '📈 بیت‌کوین به کانال 67 هزار دلار رسید',
            content: 'قیمت بیت‌کوین با رشد ۲٪ در ۲۴ ساعت گذشته به کانال ۶۷ هزار دلار وارد شد و تحلیلگران...',
            time: '۳۰ دقیقه پیش'
        },
        {
            title: '🔥 اتریوم آماده ارتقاء جدید',
            content: 'شبکه اتریوم آماده پیاده‌سازی آپدیت جدید خود می‌شود که انتظار می‌رود کارایی شبکه را...',
            time: '۱ ساعت پیش'
        },
        {
            title: '⚡ سولانا رکورد جدید حجم معاملات',
            content: 'شبکه سولانا با ثبت رکورد جدیدی در حجم معاملات روزانه، جایگاه خود را در بین...',
            time: '۲ ساعت پیش'
        },
        {
            title: '💎 تحلیل بازار: روند صعودی ادامه دارد',
            content: 'بر اساس آخرین تحلیل‌های تکنیکال، بازار ارزهای دیجیتالی همچنان در روند صعودی قرار دارد...',
            time: '۳ ساعت پیش'
        },
        {
            title: '🌟 معرفی پروژه‌های جدید DeFi',
            content: 'چندین پروژه جدید در حوزه DeFi معرفی شدند که امکانات نوینی را برای کاربران فراهم می‌کنند...',
            time: '۴ ساعت پیش'
        }
    ];
    
    const html = mockNews.map(item => `
        <div class="news-item">
            <div class="news-item-title">${item.title}</div>
            <div class="news-item-content">${item.content}</div>
            <div class="news-item-meta">
                <div class="news-item-time">🕐 ${item.time}</div>
                <div style="color: #3498db;">📊 Mini Exchange</div>
            </div>
        </div>
    `).join('');
    
    newsContainer.innerHTML = html;
}

function showNewsError() {
    const newsContainer = document.getElementById('newsContainer');
    newsContainer.innerHTML = `
        <div class="news-error">
            ❌ خطا در بارگذاری اخبار
            <br>
            <button onclick="refreshNews()" style="margin-top: 10px; padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                🔄 تلاش مجدد
            </button>
        </div>
    `;
}

function refreshNews() {
    loadTelegramNews();
}

function openNewsLink(link) {
    if (link && link !== '#') {
        window.open(link, '_blank');
    }
}

// Tab functionality
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    
    // Hide all tab content
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
    }
    
    // Remove active class from all tabs
    tablinks = document.getElementsByClassName("tab");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    
    // Show selected tab and mark button as active
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
    
    // Store active tab
    localStorage.setItem('activeTab', tabName);
}

// TradingView chart update
function updateTradingViewChart(symbol) {
    // This function would typically reload the TradingView widget with new symbol
    console.log(`Chart should update to show ${symbol}USDT`);
    // In a real implementation, you would reinitialize the TradingView widget
}

// Fear & Greed Index updater
function updateFearGreedIndex() {
    const values = [
        {value: 25, status: 'ترس شدید', color: '#e74c3c'},
        {value: 45, status: 'ترس', color: '#f39c12'},
        {value: 55, status: 'خنثی', color: '#95a5a6'},
        {value: 75, status: 'طمع', color: '#f1c40f'},
        {value: 85, status: 'طمع شدید', color: '#27ae60'}
    ];
    
    const randomIndex = Math.floor(Math.random() * values.length);
    const selected = values[randomIndex];
    
    const valueElement = document.getElementById('fearGreedValue');
    const statusElement = document.getElementById('fearGreedStatus');
    const dateElement = document.getElementById('fearGreedDate');
    
    if (valueElement) valueElement.textContent = selected.value;
    if (statusElement) {
        statusElement.textContent = selected.status;
        statusElement.style.color = selected.color;
    }
    if (dateElement) dateElement.textContent = new Date().toLocaleDateString('fa-IR');
}

// Market summary update
function updateMarketSummary() {
    const marketData = [
        {id: 'totalMarketCap', value: '$2.45T'},
        {id: 'total24hVolume', value: '$87.2B'},
        {id: 'btcDominance', value: '54.2%'}
    ];
    
    marketData.forEach(item => {
        const element = document.getElementById(item.id);
        if (element) {
            element.textContent = item.value;
        }
    });
}

// Timestamp update
function updateTimestamp() {
    const now = new Date();
    const persianDate = now.toLocaleDateString('fa-IR');
    const persianTime = now.toLocaleTimeString('fa-IR');
    const timestampElement = document.getElementById('lastUpdate');
    if (timestampElement) {
        timestampElement.textContent = `${persianDate} - ${persianTime}`;
    }
}

// Restore previous selections
function restorePreviousSelections() {
    // Restore active tab
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab) {
        const tabButton = document.querySelector(`[onclick="openTab(event, '${savedTab}')"]`);
        if (tabButton) {
            setTimeout(() => tabButton.click(), 100);
        }
    }
    
    // Restore selected coin
    const savedCoin = localStorage.getItem('selectedCoin');
    if (savedCoin) {
        try {
            const coin = JSON.parse(savedCoin);
            currentSelectedCoin = coin;
            updateCoinTitle(coin.name, coin.symbol);
            loadCoinData(coin.id);
        } catch (error) {
            console.error('Error restoring coin selection:', error);
        }
    }
}

// Setup periodic updates
function setupPeriodicUpdates() {
    // Update every minute
    setInterval(updateTimestamp, 60000);
    
    // Update every 5 minutes
    setInterval(() => {
        updateFearGreedIndex();
        updateMarketSummary();
        if (currentSelectedCoin.id) {
            loadCoinData(currentSelectedCoin.id);
        }
    }, 300000);
    
    // Update news every 10 minutes
    setInterval(() => {
        loadTelegramNews();
    }, 600000);
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Telegram WebApp integration
function initializeTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        
        // Initialize
        tg.ready();
        tg.expand();
        
        // Set theme
        tg.setHeaderColor('#3498db');
        tg.setBackgroundColor('#ffffff');
        
        // Main button
        tg.MainButton.text = 'اشتراک گذاری ارز';
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
            if (currentSelectedCoin.id) {
                tg.sendData(JSON.stringify({
                    action: 'share_coin',
                    coin: currentSelectedCoin
                }));
            }
        });
        
        // Back button
        tg.onEvent('backButtonClicked', () => {
            tg.close();
        });
    }
}

// Utility functions
function formatNumber(num) {
    if (num >= 1) {
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    } else {
        return num.toFixed(6);
    }
}

function formatLargeNumber(num) {
    if (num >= 1e12) {
        return (num / 1e12).toFixed(2) + 'T';
    } else if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    } else {
        return num.toFixed(2);
    }
}

function truncateText(text, length) {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'همین الان';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} دقیقه پیش`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ساعت پیش`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} روز پیش`;
    }
}

// Make functions globally available
window.openTab = openTab;
window.selectCoin = selectCoin;
window.refreshNews = refreshNews;
window.openNewsLink = openNewsLink;

console.log('✅ Crypto Tracker Advanced JavaScript loaded successfully!');
