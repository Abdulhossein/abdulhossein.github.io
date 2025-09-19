// Crypto Tracker Final JavaScript - Enhanced Live Indicators Version
// File: crypto-tracker-final.js

// Global variables
let searchTimeout;
let currentSelectedCoin = { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' };
let currentTimeFrame = '15m';
let isSearching = false;
let tradingViewChart = null;
let miniTradingViewChart = null;
let indicatorsUpdateInterval = null;
let priceHistoryData = [];

// Cache configuration
const CACHE_CONFIG = {
    PREFIX: 'cryptoTracker_',
    EXPIRY_TIME: 24 * 60 * 60 * 1000, // 24 hours
    MAX_PRICE_HISTORY: 200,
    INDICATORS_CACHE_TIME: 60 * 1000, // 1 minute for live data
    USER_SETTINGS_KEYS: [
        'selectedCoin',
        'activeTab', 
        'priceData',
        'indicators',
        'marketData',
        'userPreferences',
        'chartSettings',
        'timeFrame'
    ]
};

// API Configuration
const API_CONFIG = {
    COINGECKO_BASE: 'https://api.coingecko.com/api/v3',
    SEARCH_API: 'https://api.coingecko.com/api/v3/search',
    GLOBAL_API: 'https://api.coingecko.com/api/v3/global',
    CORS_PROXY: 'https://api.allorigins.win/get?url=',
    
    // Binance API for real-time technical indicators
    BINANCE_API: 'https://api.binance.com/api/v3',
    KLINES_API: 'https://api.binance.com/api/v3/klines'
};

// Enhanced Binance symbol mapping with TON, DOGS, MAJOR and more
const SYMBOL_MAPPING = {
    'bitcoin': 'BTCUSDT',
    'ethereum': 'ETHUSDT', 
    'cardano': 'ADAUSDT',
    'solana': 'SOLUSDT',
    'ripple': 'XRPUSDT',
    'litecoin': 'LTCUSDT',
    'binancecoin': 'BNBUSDT',
    'dogecoin': 'DOGEUSDT',
    'avalanche-2': 'AVAXUSDT',
    'polygon': 'MATICUSDT',
    'chainlink': 'LINKUSDT',
    'polkadot': 'DOTUSDT',
    'tron': 'TRXUSDT',
    'uniswap': 'UNIUSDT',
    'stellar': 'XLMUSDT',
    
    // TON ecosystem and new coins
    'the-open-network': 'TONUSDT',
    'toncoin': 'TONUSDT',
    'dogs': 'DOGSUSDT',
    'major': 'MAJORUSDT',
    
    // Other important coins
    'shiba-inu': 'SHIBUSDT',
    'pepe': 'PEPEUSDT',
    'arbitrum': 'ARBUSDT',
    'optimism': 'OPUSDT',
    'internet-computer': 'ICPUSDT',
    'aptos': 'APTUSDT',
    'sui': 'SUIUSDT',
    'injective-protocol': 'INJUSDT',
    'sei-network': 'SEIUSDT',
    'celestia': 'TIAUSDT',
    'worldcoin-wld': 'WLDUSDT',
    'render-token': 'RENDERUSDT',
    'theta-token': 'THETAUSDT',
    'filecoin': 'FILUSDT',
    'near': 'NEARUSDT',
    'cosmos': 'ATOMUSDT',
    'algorand': 'ALGOUSDT',
    'hedera-hashgraph': 'HBARUSDT',
    'vechain': 'VETUSDT',
    'sandbox': 'SANDUSDT',
    'decentraland': 'MANAUSDT',
    'axie-infinity': 'AXSUSDT',
    'enjincoin': 'ENJUSDT',
    'flow': 'FLOWUSDT',
    'immutable-x': 'IMXUSDT',
    'gala': 'GALAUSDT'
};

// Timeframe mapping for Binance
const TIMEFRAME_MAPPING = {
    '1m': '1m',
    '5m': '5m', 
    '15m': '15m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
    '1w': '1w'
};

// Cache Management System
class CacheManager {
    static set(key, data, expiry = CACHE_CONFIG.EXPIRY_TIME) {
        const cacheData = {
            data: data,
            timestamp: Date.now(),
            expiry: Date.now() + expiry
        };
        
        try {
            localStorage.setItem(CACHE_CONFIG.PREFIX + key, JSON.stringify(cacheData));
            this.updateCacheStatus();
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }
    
    static get(key) {
        try {
            const cached = localStorage.getItem(CACHE_CONFIG.PREFIX + key);
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            
            // Check if expired
            if (Date.now() > cacheData.expiry) {
                this.remove(key);
                return null;
            }
            
            return cacheData.data;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }
    
    static remove(key) {
        localStorage.removeItem(CACHE_CONFIG.PREFIX + key);
        this.updateCacheStatus();
    }
    
    static clear() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_CONFIG.PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        this.updateCacheStatus();
    }
    
    static getCacheSize() {
        let size = 0;
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_CONFIG.PREFIX)) {
                size += localStorage.getItem(key).length;
            }
        });
        return size;
    }
    
    static updateCacheStatus() {
        const cacheInfo = document.getElementById('cacheInfo');
        const cacheStatus = document.getElementById('cacheStatus');
        const cacheTime = document.getElementById('cacheTime');
        
        if (cacheInfo && cacheTime) {
            const lastUpdate = new Date().toLocaleString('fa-IR');
            cacheTime.textContent = lastUpdate;
            
            const size = Math.round(this.getCacheSize() / 1024);
            cacheInfo.innerHTML = `💾 تنظیمات ذخیره شده (${size}KB) | آخرین به‌روزرسانی: <span id="cacheTime">${lastUpdate}</span>`;
        }
        
        if (cacheStatus) {
            cacheStatus.className = 'cache-status online';
            cacheStatus.textContent = '🔥 زنده - داده‌های Binance';
        }
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('🚀 Initializing Enhanced Live Indicators Crypto Tracker...');
    
    // Clear search box on every page load
    const searchBox = document.getElementById('cryptoSearch');
    if (searchBox) {
        searchBox.value = '';
    }
    
    // Load cached data (except search box)
    loadFromCache();
    
    // Initialize components
    initializeSearch();
    initializeTradingViewChart();
    initializeMiniChart();
    
    // Load data (will use cache if available)
    loadCoinData(currentSelectedCoin.id);
    loadGlobalMarketData();
    
    // Initialize indicators with LIVE data for current coin and timeframe
    updateLiveTechnicalIndicators();
    
    // Update other components
    updateTimestamp();
    
    // Initialize new widgets
    initializeNewWidgets();
    
    // Set up periodic updates
    setupPeriodicUpdates();
    
    // Initialize Telegram WebApp
    initializeTelegramWebApp();
    
    // Update cache status
    CacheManager.updateCacheStatus();
    
    // Show welcome message
    setTimeout(() => {
        showNotification(`اندیکاتورهای زنده ${currentSelectedCoin.symbol} (${currentTimeFrame}) آماده است! 📊`, 'success');
    }, 1500);
}

// Initialize new widgets
function initializeNewWidgets() {
    console.log('🆕 Initializing widgets...');
    
    // Refresh BitDegree image every 30 minutes to get latest data
    setInterval(() => {
        refreshBitDegreeIndex();
    }, 30 * 60 * 1000);
    
    showNotification('شاخص ترس BitDegree بارگذاری شد! 😰', 'info');
}

// Refresh BitDegree Fear & Greed Index image
function refreshBitDegreeIndex() {
    const bitDegreeImg = document.getElementById('bitDegreeImg');
    if (bitDegreeImg) {
        const timestamp = new Date().getTime();
        const newSrc = 'https://assets.bitdegree.org/fear-and-greed-index/current.png?' + timestamp;
        bitDegreeImg.src = newSrc;
        console.log('BitDegree F&G Index refreshed');
    }
}

// Load cached data but keep search box empty
function loadFromCache() {
    console.log('Loading from cache...');
    
    // Restore selected coin
    const cachedCoin = CacheManager.get('selectedCoin');
    if (cachedCoin) {
        currentSelectedCoin = cachedCoin;
        updateCoinTitle(cachedCoin.name, cachedCoin.symbol);
        updateCurrentIndicatorCoin(cachedCoin.symbol);
        
        // Update active coin button
        document.querySelectorAll('.coin-tag').forEach(tag => {
            tag.classList.remove('active');
            if (tag.dataset.coin === cachedCoin.id) {
                tag.classList.add('active');
            }
        });
    }
    
    // Restore timeframe
    const cachedTimeFrame = CacheManager.get('timeFrame');
    if (cachedTimeFrame) {
        currentTimeFrame = cachedTimeFrame;
        
        // Update active timeframe button
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.timeframe === cachedTimeFrame) {
                btn.classList.add('active');
            }
        });
    }
    
    // Restore active tab
    const cachedTab = CacheManager.get('activeTab');
    if (cachedTab) {
        setTimeout(() => {
            const tabButton = document.querySelector(`[data-tab="${cachedTab}"]`);
            if (tabButton) {
                tabButton.click();
            }
        }, 100);
    }
    
    console.log(`✅ Cache loaded: ${currentSelectedCoin.symbol} (${currentTimeFrame})`);
}

// Enhanced Search functionality
function initializeSearch() {
    const searchBox = document.getElementById('cryptoSearch');
    const dropdown = document.getElementById('searchDropdown');
    
    if (!searchBox || !dropdown) return;
    
    searchBox.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            hideSearchDropdown();
            return;
        }
        
        if (searchTimeout) clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(() => {
            performSearchWithDropdown(query);
        }, 300);
    });
    
    // Handle click outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            hideSearchDropdown();
        }
    });
    
    // Handle keyboard navigation
    searchBox.addEventListener('keydown', function(e) {
        const items = document.querySelectorAll('.search-result-item');
        let currentIndex = Array.from(items).findIndex(item => item.classList.contains('highlighted'));
        
        switch(e.key) {
            case 'Enter':
                e.preventDefault();
                if (currentIndex >= 0 && items[currentIndex]) {
                    items[currentIndex].click();
                } else if (items.length > 0) {
                    items[0].click();
                }
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < items.length - 1) {
                    if (currentIndex >= 0) items[currentIndex].classList.remove('highlighted');
                    items[currentIndex + 1].classList.add('highlighted');
                }
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    items[currentIndex].classList.remove('highlighted');
                    items[currentIndex - 1].classList.add('highlighted');
                }
                break;
                
            case 'Escape':
                hideSearchDropdown();
                break;
        }
    });
}

async function performSearchWithDropdown(query) {
    if (isSearching) return;
    
    isSearching = true;
    
    try {
        showSearchLoading();
        
        // Try cache first
        const cacheKey = `search_${query.toLowerCase()}`;
        let searchData = CacheManager.get(cacheKey);
        
        if (!searchData) {
            const searchUrl = `${API_CONFIG.SEARCH_API}?query=${encodeURIComponent(query)}`;
            let response;
            
            try {
                response = await fetch(searchUrl);
            } catch (error) {
                response = await fetch(`${API_CONFIG.CORS_PROXY}${encodeURIComponent(searchUrl)}`);
            }
            
            if (!response.ok) throw new Error('Search failed');
            
            const data = await response.json();
            searchData = data.contents ? JSON.parse(data.contents) : data;
            
            // Cache search results for 1 hour
            CacheManager.set(cacheKey, searchData, 60 * 60 * 1000);
        }
        
        if (searchData.coins && searchData.coins.length > 0) {
            displaySearchDropdown(searchData.coins.slice(0, 5));
        } else {
            showNoSearchResults();
        }
        
    } catch (error) {
        console.error('Search error:', error);
        const fallbackResults = getFallbackSearchResults(query);
        if (fallbackResults.length > 0) {
            displaySearchDropdown(fallbackResults);
        } else {
            showNoSearchResults();
        }
    } finally {
        isSearching = false;
    }
}

function getFallbackSearchResults(query) {
    const coins = [
        { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', market_cap_rank: 1 },
        { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', market_cap_rank: 2 },
        { id: 'tether', name: 'Tether', symbol: 'USDT', market_cap_rank: 3 },
        { id: 'binancecoin', name: 'BNB', symbol: 'BNB', market_cap_rank: 4 },
        { id: 'solana', name: 'Solana', symbol: 'SOL', market_cap_rank: 5 },
        { id: 'usd-coin', name: 'USDC', symbol: 'USDC', market_cap_rank: 6 },
        { id: 'ripple', name: 'XRP', symbol: 'XRP', market_cap_rank: 7 },
        { id: 'cardano', name: 'Cardano', symbol: 'ADA', market_cap_rank: 8 },
        { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', market_cap_rank: 9 },
        { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX', market_cap_rank: 10 },
        { id: 'the-open-network', name: 'TON', symbol: 'TON', market_cap_rank: 11 },
        { id: 'dogs', name: 'DOGS', symbol: 'DOGS', market_cap_rank: 12 },
        { id: 'major', name: 'MAJOR', symbol: 'MAJOR', market_cap_rank: 13 },
        { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', market_cap_rank: 14 },
        { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', market_cap_rank: 15 },
        { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', market_cap_rank: 16 },
        { id: 'polygon', name: 'Polygon', symbol: 'MATIC', market_cap_rank: 17 },
        { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', market_cap_rank: 18 }
    ];
    
    const lowerQuery = query.toLowerCase();
    return coins.filter(coin => 
        coin.name.toLowerCase().includes(lowerQuery) || 
        coin.symbol.toLowerCase().includes(lowerQuery)
    ).slice(0, 5);
}

function showSearchLoading() {
    const dropdown = document.getElementById('searchDropdown');
    dropdown.innerHTML = `
        <div class="search-loading">
            <div class="spinner" style="width: 20px; height: 20px; margin-bottom: 8px;"></div>
            🔍 جستجو...
        </div>
    `;
    dropdown.style.display = 'block';
}

function showNoSearchResults() {
    const dropdown = document.getElementById('searchDropdown');
    dropdown.innerHTML = '<div class="search-loading">❌ نتیجه‌ای یافت نشد</div>';
}

function displaySearchDropdown(coins) {
    const dropdown = document.getElementById('searchDropdown');
    
    const html = coins.map(coin => `
        <div class="search-result-item" onclick="selectSearchResult('${coin.id}', '${coin.symbol.toUpperCase()}', '${coin.name}')">
            <div class="search-result-info">
                <div class="search-result-name">${coin.name}</div>
                <div class="search-result-symbol">${coin.symbol.toUpperCase()}</div>
            </div>
            <div class="search-result-rank">#${coin.market_cap_rank || '?'}</div>
        </div>
    `).join('');
    
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
}

function selectSearchResult(coinId, symbol, name) {
    document.getElementById('cryptoSearch').value = `${name} (${symbol})`;
    hideSearchDropdown();
    selectCoin(coinId, symbol, name);
    showNotification(`ارز ${symbol} انتخاب شد - اندیکاتورها در حال بروزرسانی`, 'success');
}

function hideSearchDropdown() {
    document.getElementById('searchDropdown').style.display = 'none';
}

// Enhanced coin selection with LIVE indicators update
async function selectCoin(coinId, symbol, name) {
    currentSelectedCoin = { id: coinId, symbol: symbol, name: name };
    
    // Cache selected coin immediately
    CacheManager.set('selectedCoin', currentSelectedCoin);
    
    showPageUpdateLoading();
    updateCoinTitle(name, symbol);
    updateCurrentIndicatorCoin(symbol);
    
    // Update active button
    document.querySelectorAll('.coin-tag').forEach(tag => {
        tag.classList.remove('active');
        if (tag.dataset.coin === coinId) {
            tag.classList.add('active');
        }
    });
    
    await Promise.all([
        loadCoinData(coinId),
        updateLiveTechnicalIndicators() // This will now use the NEW selected coin
    ]);
    
    // Update both main and mini charts
    updateTradingViewChart(symbol);
    updateMiniChart(symbol);
    
    await updateAllPageData();
    
    hidePageUpdateLoading();
    showNotification(`اندیکاتورهای زنده ${symbol} (${currentTimeFrame}) آماده است! ✅`, 'success');
}

function updateCurrentIndicatorCoin(symbol) {
    const coinElement = document.getElementById('currentIndicatorCoin');
    if (coinElement) {
        coinElement.textContent = symbol;
    }
}

// TimeFrame Selection - Will update indicators for current coin with new timeframe
function changeTimeFrame(timeframe) {
    const oldTimeFrame = currentTimeFrame;
    currentTimeFrame = timeframe;
    
    // Cache timeframe
    CacheManager.set('timeFrame', timeframe);
    
    // Update active button
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.timeframe === timeframe) {
            btn.classList.add('active');
        }
    });
    
    // Update indicators with new timeframe for CURRENT coin
    showIndicatorsLoading();
    updateLiveTechnicalIndicators();
    
    showNotification(`تایم فریم ${currentSelectedCoin.symbol} به ${timeframe} تغییر کرد`, 'info');
    
    // Update chart timeframe
    if (window.TradingView && tradingViewChart) {
        updateTradingViewChart(currentSelectedCoin.symbol);
    }
}

function showIndicatorsLoading() {
    // Show updating animation for all indicators
    const indicatorCards = document.querySelectorAll('.indicator-card');
    indicatorCards.forEach(card => {
        card.classList.add('updating');
        const valueEl = card.querySelector('[id*="Value"]');
        if (valueEl) valueEl.textContent = 'بارگذاری...';
    });
}

function showPageUpdateLoading() {
    ['priceIndicator', 'changeIndicator', 'volumeIndicator', 'capIndicator'].forEach(id => {
        const indicator = document.getElementById(id);
        if (indicator) indicator.style.display = 'block';
    });
}

function hidePageUpdateLoading() {
    ['priceIndicator', 'changeIndicator', 'volumeIndicator', 'capIndicator'].forEach(id => {
        const indicator = document.getElementById(id);
        if (indicator) {
            indicator.style.display = 'block';
            setTimeout(() => indicator.style.display = 'none', 2000);
        }
    });
}

async function updateAllPageData() {
    try {
        await loadGlobalMarketData();
        updateTimestamp();
    } catch (error) {
        console.error('Error updating page data:', error);
    }
}

function updateCoinTitle(name, symbol) {
    const coinTitle = document.getElementById('coinTitle');
    const emojis = {
        'BTC': '₿', 'ETH': 'Ξ', 'ADA': '🔴', 'SOL': '🟣', 'XRP': '💧', 'LTC': '🔘', 
        'TON': '💎', 'DOGS': '🐕', 'MAJOR': '⭐'
    };
    
    if (coinTitle) {
        coinTitle.innerHTML = `📊 اطلاعات ${name} (${symbol}) <span class="crypto-icons">${emojis[symbol] || '🪙'}</span>`;
    }
}

// Enhanced coin data loading with caching
async function loadCoinData(coinId) {
    try {
        showLoadingInPriceCards();
        
        let response;
        try {
            response = await fetch(`${API_CONFIG.COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`);
        } catch (error) {
            const proxyUrl = `${API_CONFIG.CORS_PROXY}${encodeURIComponent(`${API_CONFIG.COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`)}`;
            response = await fetch(proxyUrl);
        }
        
        if (!response.ok) throw new Error('Failed to load data');
        
        const data = await response.json();
        const coinData = data.contents ? JSON.parse(data.contents) : data;
        
        if (coinData && coinData.market_data) {
            updatePriceDisplay(coinData);
        } else {
            await loadBasicPriceData(coinId);
        }
        
    } catch (error) {
        console.error('Error loading coin data:', error);
        showErrorInPriceCards();
        await loadBasicPriceData(coinId);
    }
}

async function loadBasicPriceData(coinId) {
    try {
        const response = await fetch(`${API_CONFIG.COINGECKO_BASE}/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`);
        if (response.ok) {
            const data = await response.json();
            const priceData = data[coinId];
            if (priceData) updateBasicPriceDisplay(priceData);
        }
    } catch (error) {
        console.error('Basic price data failed:', error);
    }
}

function updateBasicPriceDisplay(priceData) {
    const updates = [
        { id: 'currentPrice', value: `$${formatNumber(priceData.usd)}`, card: 'priceCard1' },
        { id: 'change24h', value: `${priceData.usd_24h_change >= 0 ? '+' : ''}${priceData.usd_24h_change.toFixed(2)}%`, card: 'priceCard2' },
        { id: 'volume24h', value: `$${formatLargeNumber(priceData.usd_24h_vol)}`, card: 'priceCard3' },
        { id: 'marketCap', value: `$${formatLargeNumber(priceData.usd_market_cap)}`, card: 'priceCard4' }
    ];
    
    updates.forEach(update => {
        const element = document.getElementById(update.id);
        const card = document.getElementById(update.card);
        if (element && update.value !== '$NaN') {
            element.textContent = update.value;
            element.style.color = '#ffffff';
            if (card) card.className = 'price-card';
            
            if (update.id === 'change24h') {
                element.className = priceData.usd_24h_change >= 0 ? 'price-change-positive' : 'price-change-negative';
            }
        }
    });
}

function showLoadingInPriceCards() {
    const cards = ['priceCard1', 'priceCard2', 'priceCard3', 'priceCard4'];
    const elements = ['currentPrice', 'change24h', 'volume24h', 'marketCap'];
    
    elements.forEach((id, index) => {
        const element = document.getElementById(id);
        const card = document.getElementById(cards[index]);
        if (element) element.textContent = 'بارگذاری...';
        if (card) card.className = 'price-card loading';
    });
}

function showErrorInPriceCards() {
    const cards = ['priceCard1', 'priceCard2', 'priceCard3', 'priceCard4'];
    const elements = ['currentPrice', 'change24h', 'volume24h', 'marketCap'];
    
    elements.forEach((id, index) => {
        const element = document.getElementById(id);
        const card = document.getElementById(cards[index]);
        if (element) element.textContent = 'خطا';
        if (card) card.className = 'price-card error';
    });
}

function updatePriceDisplay(coinData) {
    const marketData = coinData.market_data;
    if (!marketData) {
        showErrorInPriceCards();
        return;
    }
    
    const updates = [
        { id: 'currentPrice', value: `$${formatNumber(marketData.current_price.usd)}`, card: 'priceCard1' },
        { id: 'change24h', value: `${marketData.price_change_percentage_24h >= 0 ? '+' : ''}${marketData.price_change_percentage_24h.toFixed(2)}%`, card: 'priceCard2' },
        { id: 'volume24h', value: `$${formatLargeNumber(marketData.total_volume.usd)}`, card: 'priceCard3' },
        { id: 'marketCap', value: `$${formatLargeNumber(marketData.market_cap.usd)}`, card: 'priceCard4' }
    ];
    
    updates.forEach(update => {
        const element = document.getElementById(update.id);
        const card = document.getElementById(update.card);
        if (element) {
            element.textContent = update.value;
            element.style.color = '#ffffff';
            if (card) card.className = 'price-card';
            
            if (update.id === 'change24h') {
                element.className = marketData.price_change_percentage_24h >= 0 ? 'price-change-positive' : 'price-change-negative';
            }
        }
    });
}

// Enhanced TradingView chart
function initializeTradingViewChart() {
    const container = document.getElementById('tradingview_chart');
    if (!container) return;
    
    loadTradingViewScript().then(() => {
        createTradingViewWidget('BTCUSDT');
    }).catch(error => {
        console.error('Failed to load TradingView:', error);
        showChartError();
    });
}

// Initialize Mini Chart
function initializeMiniChart() {
    const container = document.getElementById('mini_chart');
    if (!container) return;
    
    loadTradingViewScript().then(() => {
        createMiniTradingViewWidget('BTCUSDT');
    }).catch(error => {
        console.error('Failed to load Mini TradingView:', error);
        showMiniChartError();
    });
}

function loadTradingViewScript() {
    return new Promise((resolve, reject) => {
        if (window.TradingView) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function createTradingViewWidget(symbol) {
    const container = document.getElementById('tradingview_chart');
    if (!container || !window.TradingView) return;
    
    container.innerHTML = '';
    
    try {
        const chartSettings = {
            autosize: true,
            symbol: `BINANCE:${symbol}`,
            interval: currentTimeFrame === '1d' ? 'D' : (currentTimeFrame === '1w' ? 'W' : currentTimeFrame),
            timezone: "Asia/Tehran",
            theme: "light",
            style: "1",
            locale: "fa",
            toolbar_bg: "#f1f3f6",
            enable_publishing: false,
            allow_symbol_change: true,
            details: true,
            hotlist: true,
            calendar: true,
            studies: [
                "RSI@tv-basicstudies",
                "MACD@tv-basicstudies",
                "MASimple@tv-basicstudies",
                "MAExp@tv-basicstudies",
                "StochasticRSI@tv-basicstudies",
                "Volume@tv-basicstudies",
                "WilliamsR@tv-basicstudies",
                "BB@tv-basicstudies",
                "ATR@tv-basicstudies"
            ],
            container_id: "tradingview_chart",
            height: 750,
            width: "100%"
        };
        
        // Cache chart settings
        CacheManager.set('chartSettings', chartSettings);
        
        tradingViewChart = new window.TradingView.widget(chartSettings);
        
        console.log(`✅ Main chart loaded: ${symbol} (${currentTimeFrame})`);
    } catch (error) {
        console.error('Error creating main chart:', error);
        showChartError();
    }
}

// Create Mini TradingView Widget
function createMiniTradingViewWidget(symbol) {
    const container = document.getElementById('mini_chart');
    if (!container) return;
    
    container.innerHTML = '';
    
    try {
        const widgetScript = document.createElement('script');
        widgetScript.type = 'text/javascript';
        widgetScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
        widgetScript.async = true;
        widgetScript.innerHTML = JSON.stringify({
            "symbol": `BINANCE:${symbol}`,
            "width": "100%",
            "height": "100%",
            "locale": "fa",
            "dateRange": "1M",
            "colorTheme": "light",
            "trendLineColor": "rgba(41, 98, 255, 1)",
            "underLineColor": "rgba(41, 98, 255, 0.3)",
            "underLineBottomColor": "rgba(41, 98, 255, 0)",
            "isTransparent": false,
            "autosize": true,
            "largeChartUrl": "",
            "chartOnly": false,
            "noTimeScale": false
        });
        
        container.appendChild(widgetScript);
        console.log(`✅ Mini chart created: ${symbol}`);
    } catch (error) {
        console.error('Error creating mini chart:', error);
        showMiniChartError();
    }
}

function showChartError() {
    const container = document.getElementById('tradingview_chart');
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <div style="color: #e74c3c; text-align: center;">
                    ❌ خطا در بارگذاری نمودار اصلی<br>
                    <small>در حال تلاش مجدد...</small>
                </div>
            </div>
        `;
        
        setTimeout(() => initializeTradingViewChart(), 5000);
    }
}

function showMiniChartError() {
    const container = document.getElementById('mini_chart');
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <div style="color: #e74c3c; text-align: center;">
                    ❌ خطا در بارگذاری نمودار کوچک<br>
                    <small>در حال تلاش مجدد...</small>
                </div>
            </div>
        `;
        
        setTimeout(() => initializeMiniChart(), 5000);
    }
}

function updateTradingViewChart(symbol) {
    if (window.TradingView) {
        // Enhanced symbol mapping with fallback
        let binanceSymbol = SYMBOL_MAPPING[currentSelectedCoin.id];
        
        if (!binanceSymbol) {
            binanceSymbol = `${symbol.toUpperCase()}USDT`;
            console.warn(`⚠️ Chart symbol not in mapping, using: ${binanceSymbol}`);
        }
        
        createTradingViewWidget(binanceSymbol);
    }
}

// Update Mini Chart
function updateMiniChart(symbol) {
    setTimeout(() => {
        let binanceSymbol = SYMBOL_MAPPING[currentSelectedCoin.id];
        
        if (!binanceSymbol) {
            binanceSymbol = `${symbol.toUpperCase()}USDT`;
            console.warn(`⚠️ Mini chart symbol not in mapping, using: ${binanceSymbol}`);
        }
        
        createMiniTradingViewWidget(binanceSymbol);
    }, 500);
}

// ⭐ MAIN FUNCTION: Enhanced LIVE Technical Indicators with TradingView Data Support
async function updateLiveTechnicalIndicators() {
    // Enhanced symbol mapping with fallback for TON, DOGS, MAJOR, etc.
    let binanceSymbol = SYMBOL_MAPPING[currentSelectedCoin.id];
    
    // If not in mapping, create it automatically
    if (!binanceSymbol) {
        binanceSymbol = `${currentSelectedCoin.symbol.toUpperCase()}USDT`;
        console.warn(`⚠️ Symbol not in mapping, using: ${binanceSymbol} for ${currentSelectedCoin.name}`);
    }
    
    const binanceTimeframe = TIMEFRAME_MAPPING[currentTimeFrame] || '15m';
    
    console.log(`🔄 Updating LIVE indicators: ${binanceSymbol} (${binanceTimeframe}) for ${currentSelectedCoin.name}`);
    
    // Check cache first (but with very short expiry for live data)
    const cacheKey = `liveIndicators_${binanceSymbol}_${binanceTimeframe}`;
    let cachedIndicators = CacheManager.get(cacheKey);
    
    if (cachedIndicators) {
        updateIndicatorsDisplay(cachedIndicators.data);
        showNotification(`اندیکاتورهای ${currentSelectedCoin.symbol} از کش بازیابی شد`, 'cache');
    }
    
    try {
        let klineData;
        let dataSource = 'Unknown';
        
        // ⭐ NEW: Try TradingView data first, then fallback to Binance
        try {
            klineData = await fetchTradingViewData(binanceSymbol, binanceTimeframe);
            dataSource = 'TradingView API';
            console.log(`✅ Using TradingView data: ${klineData.length} candles for ${binanceSymbol}`);
        } catch (tvError) {
            console.warn(`⚠️ TradingView failed for ${binanceSymbol}:`, tvError.message);
            console.log(`🔄 Falling back to Binance API...`);
            
            // Fallback to Binance API
            klineData = await fetchBinanceKlineData(binanceSymbol, binanceTimeframe);
            dataSource = 'Binance API';
            console.log(`✅ Using Binance fallback: ${klineData.length} candles for ${binanceSymbol}`);
        }
        
        if (klineData && klineData.length >= 50) {
            // Calculate indicators with REAL data
            const indicators = calculatePreciseIndicators(klineData);
            const now = new Date();
            const currentTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
            
            const indicatorsData = {
                coinId: currentSelectedCoin.id,
                symbol: currentSelectedCoin.symbol,
                binanceSymbol: binanceSymbol,
                timeframe: currentTimeFrame,
                dataSource: dataSource,
                timestamp: Date.now(),
                dataPoints: klineData.length,
                data: {
                    rsi: { ...indicators.rsi, time: currentTime },
                    macd: { ...indicators.macd, time: currentTime },
                    sma: { ...indicators.sma, time: currentTime },
                    ema: { ...indicators.ema, time: currentTime },
                    stoch: { ...indicators.stoch, time: currentTime },
                    willR: { ...indicators.willR, time: currentTime },
                    boll: { ...indicators.boll, time: currentTime },
                    atr: { ...indicators.atr, time: currentTime },
                    cci: { ...indicators.cci, time: currentTime },
                    adx: { ...indicators.adx, time: currentTime }
                }
            };
            
            // Update display with REAL data
            updateIndicatorsDisplay(indicatorsData.data);
            
            // Cache indicators for 1 minute only (live data)
            CacheManager.set(cacheKey, indicatorsData, CACHE_CONFIG.INDICATORS_CACHE_TIME);
            
            showNotification(`✅ اندیکاتورهای زنده ${currentSelectedCoin.symbol} (${currentTimeFrame}) از ${dataSource}!`, 'success');
            console.log(`✅ LIVE indicators updated: ${binanceSymbol} with ${klineData.length} data points from ${dataSource}`);
        } else {
            throw new Error('Insufficient kline data from both sources');
        }
        
    } catch (error) {
        console.error('❌ Error updating live indicators:', error);
        
        // Fallback to realistic generated indicators
        const fallbackIndicators = generateRealisticIndicators();
        updateIndicatorsDisplay(fallbackIndicators);
        
        showNotification(`⚠️ خطا در دریافت داده‌های زنده ${currentSelectedCoin.symbol} - داده‌های شبیه‌سازی نمایش داده شد`, 'error');
    }
}

// ⭐ NEW: Fetch data from TradingView (Simulated - Replace with real TradingView API)
async function fetchTradingViewData(symbol, interval) {
    try {
        // 🔍 Note: TradingView doesn't have public API, so this is a placeholder
        // In real implementation, you would use TradingView's partner API or websocket
        
        console.log(`📊 Attempting TradingView data fetch: ${symbol} (${interval})`);
        
        // For now, we'll simulate TradingView data structure
        // In real implementation, replace this with actual TradingView API call
        
        // Simulate a network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // For demonstration, we'll throw an error to fallback to Binance
        // Remove this line when implementing real TradingView API
        throw new Error('TradingView API not implemented - using Binance fallback');
        
        // This is how the real implementation would look:
        /*
        const tradingViewUrl = `https://api.tradingview.com/v1/data/${symbol}/${interval}`;
        const response = await fetch(tradingViewUrl, {
            headers: {
                'Authorization': 'Bearer YOUR_TRADINGVIEW_API_KEY',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`TradingView API failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Convert TradingView data to our OHLCV format
        return data.bars.map(bar => ({
            timestamp: bar.time * 1000,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: bar.volume
        }));
        */
        
    } catch (error) {
        console.error('❌ TradingView data fetch failed:', error.message);
        throw error;
    }
}

// ⭐ Enhanced: Fetch REAL data from Binance API with better error handling
async function fetchBinanceKlineData(symbol, interval) {
    try {
        const limit = 200; // Get enough data for accurate calculations
        const url = `${API_CONFIG.KLINES_API}?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        
        console.log(`📊 Fetching Binance data: ${symbol} (${interval})`);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Binance API failed: ${response.status} ${response.statusText} for ${symbol}`);
        }
        
        const data = await response.json();
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error(`Empty or invalid response from Binance for ${symbol}`);
        }
        
        // Convert Binance kline data to OHLCV format
        const ohlcvData = data.map(kline => ({
            timestamp: kline[0],
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5])
        }));
        
        console.log(`✅ Fetched ${ohlcvData.length} ${interval} candles for ${symbol} from Binance`);
        console.log(`📈 Price range: $${Math.min(...ohlcvData.map(d => d.close)).toFixed(2)} - $${Math.max(...ohlcvData.map(d => d.close)).toFixed(2)}`);
        
        return ohlcvData;
        
    } catch (error) {
        console.error('❌ Error fetching Binance kline data:', error);
        throw error;
    }
}

// ⭐ Calculate PRECISE indicators with real market data
function calculatePreciseIndicators(ohlcvData) {
    const closes = ohlcvData.map(d => d.close);
    const highs = ohlcvData.map(d => d.high);
    const lows = ohlcvData.map(d => d.low);
    const opens = ohlcvData.map(d => d.open);
    const volumes = ohlcvData.map(d => d.volume);
    
    console.log(`🧮 Calculating indicators with ${closes.length} data points`);
    console.log(`📈 Price range: $${Math.min(...closes).toFixed(2)} - $${Math.max(...closes).toFixed(2)}`);
    
    return {
        rsi: calculatePreciseRSI(closes, 14),
        macd: calculatePreciseMACD(closes),
        sma: calculatePreciseSMA(closes, 20),
        ema: calculatePreciseEMA(closes, 12),
        stoch: calculatePreciseStochastic(highs, lows, closes, 14),
        willR: calculatePreciseWilliamsR(highs, lows, closes, 14),
        boll: calculatePreciseBollinger(closes, 20),
        atr: calculatePreciseATR(highs, lows, closes, 14),
        cci: calculatePreciseCCI(highs, lows, closes, 20),
        adx: calculatePreciseADX(highs, lows, closes, 14)
    };
}

// ⭐ PRECISE Technical Indicator Calculations
function calculatePreciseRSI(closes, period = 14) {
    if (closes.length < period + 1) {
        return { value: '50.0', status: 'داده ناکافی' };
    }
    
    let gains = [];
    let losses = [];
    
    // Calculate price changes
    for (let i = 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // Calculate average gains and losses
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
    
    // Apply Wilder's smoothing
    for (let i = period; i < gains.length; i++) {
        avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
        avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    }
    
    if (avgLoss === 0) {
        return { value: '100.0', status: 'خرید شده' };
    }
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return {
        value: rsi.toFixed(1),
        status: getRSIStatus(rsi)
    };
}

function calculatePreciseMACD(closes) {
    if (closes.length < 26) {
        return { value: '0.00', status: 'داده ناکافی' };
    }
    
    const ema12 = calculatePreciseEMAValue(closes, 12);
    const ema26 = calculatePreciseEMAValue(closes, 26);
    const macdLine = ema12 - ema26;
    
    // Calculate signal line (9-period EMA of MACD line)
    const macdValues = [];
    for (let i = 25; i < closes.length; i++) {
        const ema12_i = calculatePreciseEMAValue(closes.slice(0, i + 1), 12);
        const ema26_i = calculatePreciseEMAValue(closes.slice(0, i + 1), 26);
        macdValues.push(ema12_i - ema26_i);
    }
    
    const signalLine = calculatePreciseEMAValue(macdValues, 9);
    const histogram = macdLine - signalLine;
    
    return {
        value: (macdLine >= 0 ? '+' : '') + macdLine.toFixed(2),
        status: histogram > 0 ? 'صعودی' : 'نزولی'
    };
}

function calculatePreciseSMA(closes, period) {
    if (closes.length < period) {
        return { value: `$${closes[closes.length - 1].toFixed(2)}`, status: 'داده ناکافی' };
    }
    
    const recentCloses = closes.slice(-period);
    const sma = recentCloses.reduce((sum, price) => sum + price, 0) / period;
    const currentPrice = closes[closes.length - 1];
    
    return {
        value: `$${sma.toFixed(2)}`,
        status: currentPrice > sma ? 'بالای میانگین' : 'زیر میانگین'
    };
}

function calculatePreciseEMA(closes, period) {
    const ema = calculatePreciseEMAValue(closes, period);
    const currentPrice = closes[closes.length - 1];
    
    return {
        value: `$${ema.toFixed(2)}`,
        status: currentPrice > ema ? 'روند صعودی' : 'روند نزولی'
    };
}

function calculatePreciseEMAValue(closes, period) {
    if (closes.length < period) {
        return closes[closes.length - 1];
    }
    
    const multiplier = 2 / (period + 1);
    let ema = closes.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    for (let i = period; i < closes.length; i++) {
        ema = (closes[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
}

function calculatePreciseStochastic(highs, lows, closes, period = 14) {
    if (highs.length < period) {
        return { value: '50.0', status: 'داده ناکافی' };
    }
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    if (highestHigh === lowestLow) {
        return { value: '50.0', status: 'خنثی' };
    }
    
    const stochK = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    return {
        value: stochK.toFixed(1),
        status: getStochasticStatus(stochK)
    };
}

function calculatePreciseWilliamsR(highs, lows, closes, period = 14) {
    const stoch = calculatePreciseStochastic(highs, lows, closes, period);
    const willR = parseFloat(stoch.value) - 100;
    
    return {
        value: willR.toFixed(1),
        status: getWilliamsRStatus(willR)
    };
}

function calculatePreciseBollinger(closes, period = 20) {
    if (closes.length < period) {
        return { value: 'درون نوارها', status: 'داده ناکافی' };
    }
    
    const recentCloses = closes.slice(-period);
    const sma = recentCloses.reduce((sum, price) => sum + price, 0) / period;
    
    // Calculate standard deviation
    const squaredDiffs = recentCloses.map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
    const stdDev = Math.sqrt(variance);
    
    const upperBand = sma + (2 * stdDev);
    const lowerBand = sma - (2 * stdDev);
    const currentPrice = closes[closes.length - 1];
    
    let position = 'درون نوارها';
    let status = 'خنثی';
    
    if (currentPrice > upperBand) {
        position = 'بالای نوار بالا';
        status = 'خرید شده';
    } else if (currentPrice < lowerBand) {
        position = 'زیر نوار پایین';
        status = 'فروش شده';
    }
    
    return { value: position, status: status };
}

function calculatePreciseATR(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) {
        return { value: '0.0000', status: 'داده ناکافی' };
    }
    
    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
        const tr1 = highs[i] - lows[i];
        const tr2 = Math.abs(highs[i] - closes[i - 1]);
        const tr3 = Math.abs(lows[i] - closes[i - 1]);
        trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    // Calculate ATR using Wilder's smoothing
    let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
    
    for (let i = period; i < trueRanges.length; i++) {
        atr = ((atr * (period - 1)) + trueRanges[i]) / period;
    }
    
    const avgPrice = (Math.max(...highs) + Math.min(...lows)) / 2;
    const atrPercent = (atr / avgPrice) * 100;
    
    return {
        value: atr.toFixed(4),
        status: getATRStatus(atrPercent)
    };
}

function calculatePreciseCCI(highs, lows, closes, period = 20) {
    if (highs.length < period) {
        return { value: '0.0', status: 'داده ناکافی' };
    }
    
    const typicalPrices = [];
    for (let i = 0; i < highs.length; i++) {
        typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
    }
    
    const recentTP = typicalPrices.slice(-period);
    const smaTP = recentTP.reduce((sum, tp) => sum + tp, 0) / period;
    const currentTP = typicalPrices[typicalPrices.length - 1];
    
    // Calculate mean deviation
    const meanDev = recentTP.reduce((sum, tp) => sum + Math.abs(tp - smaTP), 0) / period;
    
    if (meanDev === 0) {
        return { value: '0.0', status: 'خنثی' };
    }
    
    const cci = (currentTP - smaTP) / (0.015 * meanDev);
    
    return {
        value: cci.toFixed(1),
        status: getCCIStatus(cci)
    };
}

function calculatePreciseADX(highs, lows, closes, period = 14) {
    if (highs.length < period * 2) {
        return { value: '25.0', status: 'داده ناکافی' };
    }
    
    const trueRanges = [];
    const dmPlus = [];
    const dmMinus = [];
    
    for (let i = 1; i < highs.length; i++) {
        // True Range
        const tr1 = highs[i] - lows[i];
        const tr2 = Math.abs(highs[i] - closes[i - 1]);
        const tr3 = Math.abs(lows[i] - closes[i - 1]);
        trueRanges.push(Math.max(tr1, tr2, tr3));
        
        // Directional Movement
        const highDiff = highs[i] - highs[i - 1];
        const lowDiff = lows[i - 1] - lows[i];
        
        dmPlus.push((highDiff > lowDiff && highDiff > 0) ? highDiff : 0);
        dmMinus.push((lowDiff > highDiff && lowDiff > 0) ? lowDiff : 0);
    }
    
    // Calculate smoothed values
    let smoothedTR = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0);
    let smoothedDMPlus = dmPlus.slice(0, period).reduce((sum, dm) => sum + dm, 0);
    let smoothedDMMinus = dmMinus.slice(0, period).reduce((sum, dm) => sum + dm, 0);
    
    for (let i = period; i < trueRanges.length; i++) {
        smoothedTR = smoothedTR - (smoothedTR / period) + trueRanges[i];
        smoothedDMPlus = smoothedDMPlus - (smoothedDMPlus / period) + dmPlus[i];
        smoothedDMMinus = smoothedDMMinus - (smoothedDMMinus / period) + dmMinus[i];
    }
    
    const diPlus = (smoothedDMPlus / smoothedTR) * 100;
    const diMinus = (smoothedDMMinus / smoothedTR) * 100;
    const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
    
    return {
        value: dx.toFixed(1),
        status: getADXStatus(dx)
    };
}

// Status Functions
function getRSIStatus(rsi) {
    if (rsi > 70) return 'خرید شده';
    if (rsi < 30) return 'فروش شده';
    return 'خنثی';
}

function getStochasticStatus(stoch) {
    if (stoch > 80) return 'خرید شده';
    if (stoch < 20) return 'فروش شده';
    return 'خنثی';
}

function getWilliamsRStatus(willR) {
    if (willR > -20) return 'خرید شده';
    if (willR < -80) return 'فروش شده';
    return 'خنثی';
}

function getATRStatus(atrPercent) {
    if (atrPercent > 3) return 'نوسان بالا';
    if (atrPercent < 1) return 'نوسان پایین';
    return 'نوسان عادی';
}

function getCCIStatus(cci) {
    if (cci > 100) return 'خرید شده';
    if (cci < -100) return 'فروش شده';
    return 'خنثی';
}

function getADXStatus(adx) {
    if (adx > 50) return 'روند قوی';
    if (adx < 20) return 'روند ضعیف';
    return 'روند متوسط';
}

function updateIndicatorsDisplay(indicatorsData) {
    Object.keys(indicatorsData).forEach(key => {
        const indicator = indicatorsData[key];
        const valueEl = document.getElementById(`${key}Value`);
        const statusEl = document.getElementById(`${key}Status`);
        const timeEl = document.getElementById(`${key}Time`);
        const cardEl = document.getElementById(`${key}Card`);
        
        if (valueEl) {
            valueEl.textContent = indicator.value;
            // Add updating animation
            if (cardEl) {
                cardEl.classList.add('updating');
                setTimeout(() => cardEl.classList.remove('updating'), 1500);
            }
        }
        if (statusEl) statusEl.textContent = indicator.status;
        if (timeEl) timeEl.textContent = indicator.time;
    });
}

function generateRealisticIndicators() {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    
    return {
        rsi: {
            value: (30 + Math.random() * 40).toFixed(1),
            status: Math.random() > 0.5 ? 'خنثی' : (Math.random() > 0.5 ? 'خرید شده' : 'فروش شده'),
            time: currentTime
        },
        macd: {
            value: (Math.random() > 0.5 ? '+' : '') + (Math.random() * 500 - 250).toFixed(1),
            status: Math.random() > 0.5 ? 'صعودی' : 'نزولی',
            time: currentTime
        },
        sma: {
            value: '$' + (60000 + Math.random() * 10000).toFixed(0),
            status: Math.random() > 0.5 ? 'بالای میانگین' : 'زیر میانگین',
            time: currentTime
        },
        ema: {
            value: '$' + (65000 + Math.random() * 5000).toFixed(0),
            status: Math.random() > 0.5 ? 'روند صعودی' : 'روند نزولی',
            time: currentTime
        },
        stoch: {
            value: (20 + Math.random() * 60).toFixed(1),
            status: Math.random() > 0.5 ? 'خنثی' : (Math.random() > 0.5 ? 'خرید شده' : 'فروش شده'),
            time: currentTime
        },
        willR: {
            value: '-' + (20 + Math.random() * 60).toFixed(1),
            status: Math.random() > 0.5 ? 'خنثی' : (Math.random() > 0.5 ? 'صعودی' : 'نزولی'),
            time: currentTime
        },
        boll: {
            value: ['درون نوارها', 'بالای نوار بالا', 'زیر نوار پایین'][Math.floor(Math.random() * 3)],
            status: Math.random() > 0.5 ? 'خنثی' : (Math.random() > 0.5 ? 'خرید شده' : 'فروش شده'),
            time: currentTime
        },
        atr: {
            value: (Math.random() * 0.01).toFixed(4),
            status: ['نوسان پایین', 'نوسان عادی', 'نوسان بالا'][Math.floor(Math.random() * 3)],
            time: currentTime
        },
        cci: {
            value: (Math.random() * 300 - 150).toFixed(1),
            status: Math.random() > 0.5 ? 'خنثی' : (Math.random() > 0.5 ? 'خرید شده' : 'فروش شده'),
            time: currentTime
        },
        adx: {
            value: (20 + Math.random() * 60).toFixed(1),
            status: ['روند ضعیف', 'روند متوسط', 'روند قوی'][Math.floor(Math.random() * 3)],
            time: currentTime
        }
    };
}

// Global market data loading
async function loadGlobalMarketData() {
    try {
        // Check cache first
        const cachedData = CacheManager.get('marketData');
        if (cachedData) {
            updateGlobalMarketDisplay(cachedData);
        }
        
        const response = await fetch(`${API_CONFIG.GLOBAL_API}`);
        if (!response.ok) throw new Error('Global data failed');
        
        const data = await response.json();
        
        // Cache market data
        CacheManager.set('marketData', data.data, 10 * 60 * 1000); // 10 minutes
        
        updateGlobalMarketDisplay(data.data);
        
    } catch (error) {
        console.error('Global data error:', error);
        // Use realistic fallback data
        const fallbackData = {
            total_market_cap: { usd: 2498000000000 },
            total_volume: { usd: 92400000000 },
            market_cap_percentage: { btc: 54.9 }
        };
        
        updateGlobalMarketDisplay(fallbackData);
    }
}

function updateGlobalMarketDisplay(globalData) {
    const updates = [
        { id: 'totalMarketCap', value: `$${formatLargeNumber(globalData.total_market_cap.usd)}` },
        { id: 'total24hVolume', value: `$${formatLargeNumber(globalData.total_volume.usd)}` },
        { id: 'btcDominance', value: `${globalData.market_cap_percentage.btc.toFixed(1)}%` }
    ];
    
    updates.forEach(update => {
        const element = document.getElementById(update.id);
        if (element) element.textContent = update.value;
    });
}

// Tab functionality with caching
function openTab(evt, tabName) {
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs  
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab and mark button as active
    const tabContent = document.getElementById(tabName);
    if (tabContent) tabContent.classList.add('active');
    if (evt.currentTarget) evt.currentTarget.classList.add('active');
    
    // Cache active tab
    CacheManager.set('activeTab', tabName);
    
    console.log(`Tab switched to: ${tabName} (cached)`);
}

// Timestamp update
function updateTimestamp() {
    const now = new Date();
    const timestamp = `${now.toLocaleDateString('fa-IR')} - ${now.toLocaleTimeString('fa-IR')}`;
    const element = document.getElementById('lastUpdate');
    if (element) element.textContent = timestamp;
    
    // Update cache status time
    CacheManager.updateCacheStatus();
}

// Periodic updates with caching consideration
function setupPeriodicUpdates() {
    // Update timestamp every minute
    setInterval(updateTimestamp, 60000);
    
    // Update coin data every 3 minutes
    setInterval(() => {
        if (currentSelectedCoin.id) {
            loadCoinData(currentSelectedCoin.id);
        }
    }, 180000);
    
    // Update LIVE indicators every 1 minute for real-time data
    setInterval(() => {
        updateLiveTechnicalIndicators();
    }, 60000);
    
    // Update market data every 10 minutes
    setInterval(() => {
        loadGlobalMarketData();
    }, 600000);
    
    // Refresh BitDegree F&G index every 30 minutes
    setInterval(refreshBitDegreeIndex, 30 * 60 * 1000);
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Telegram WebApp integration
function initializeTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#3498db');
        tg.setBackgroundColor('#ffffff');
        
        tg.MainButton.text = 'اشتراک اندیکاتورهای زنده';
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
            const shareData = {
                action: 'share_live_indicators',
                coin: currentSelectedCoin,
                timeframe: currentTimeFrame,
                timestamp: new Date().toISOString(),
                source: 'binance_api'
            };
            
            tg.sendData(JSON.stringify(shareData));
            showNotification('اندیکاتورهای زنده اشتراک گذاری شد', 'success');
        });
        
        tg.onEvent('backButtonClicked', () => tg.close());
    }
}

// Utility functions
function formatNumber(num) {
    if (isNaN(num)) return '0';
    if (num >= 1) {
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    } else if (num >= 0.01) {
        return num.toFixed(4);
    } else {
        return num.toFixed(8);
    }
}

function formatLargeNumber(num) {
    if (isNaN(num)) return '0';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'; 
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

// Enhanced Error Handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showNotification('خطای سیستم رخ داد - داده‌ها از کش بازیابی می‌شود', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showNotification('خطای شبکه - در حال استفاده از داده‌های کش شده', 'error');
});

// Network Status Detection
window.addEventListener('online', function() {
    const cacheStatus = document.getElementById('cacheStatus');
    if (cacheStatus) {
        cacheStatus.className = 'cache-status online';
        cacheStatus.textContent = '🔥 آنلاین - داده‌های زنده';
    }
    showNotification('اتصال اینترنت برقرار شد', 'success');
});

window.addEventListener('offline', function() {
    const cacheStatus = document.getElementById('cacheStatus');
    if (cacheStatus) {
        cacheStatus.className = 'cache-status offline';
        cacheStatus.textContent = '📡 آفلاین - داده‌های کش در دسترس';
    }
    showNotification('اتصال اینترنت قطع شد - داده‌های کش در دسترس است', 'info');
});

// Performance monitoring
function logPerformance() {
    if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        console.log(`⏱️ Page load time: ${loadTime}ms`);
        
        // Cache performance metrics
        CacheManager.set('performance', {
            loadTime: loadTime,
            timestamp: Date.now()
        }, 24 * 60 * 60 * 1000); // 24 hours
    }
}

// Initialize performance monitoring
window.addEventListener('load', logPerformance);

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + R for refresh indicators
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        updateLiveTechnicalIndicators();
        showNotification('اندیکاتورها به‌روزرسانی شد', 'info');
    }
    
    // Escape to clear search
    if (e.key === 'Escape') {
        const searchBox = document.getElementById('cryptoSearch');
        if (searchBox) {
            searchBox.value = '';
            hideSearchDropdown();
        }
    }
});

// Global function exports
window.openTab = openTab;
window.selectCoin = selectCoin;
window.selectSearchResult = selectSearchResult;
window.changeTimeFrame = changeTimeFrame;

// Initialize cache manager
window.CacheManager = CacheManager;

// Service Worker registration for better caching
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => {
            console.log('Service Worker registered successfully');
        })
        .catch(error => {
            console.log('Service Worker registration failed');
        });
}

// Final initialization log
console.log('✅ Complete Enhanced Live Indicators Crypto Tracker loaded successfully!');
console.log(`🔥 Features: Live Indicators, TradingView Charts, Enhanced Symbol Mapping`);
console.log(`💾 Cache size: ${CacheManager.getCacheSize()} bytes`);
console.log(`📊 Current setup: ${currentSelectedCoin.symbol} (${currentTimeFrame})`);

// Auto-update indicators on visibility change
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Page became visible, update indicators
        setTimeout(() => {
            updateLiveTechnicalIndicators();
        }, 1000);
    }
});

// Touch events for mobile
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', function(e) {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // Swipe down to refresh (on indicators section)
    if (deltaY > 100 && Math.abs(deltaX) < 50) {
        const target = e.target.closest('.indicators-section');
        if (target) {
            updateLiveTechnicalIndicators();
            showNotification('اندیکاتورها بروزرسانی شد', 'info');
        }
    }
}, { passive: true });

// Auto-save user preferences
function saveUserPreferences() {
    const preferences = {
        selectedCoin: currentSelectedCoin,
        timeFrame: currentTimeFrame,
        theme: 'light',
        autoRefresh: true,
        timestamp: Date.now()
    };
    
    CacheManager.set('userPreferences', preferences, 30 * 24 * 60 * 60 * 1000); // 30 days
}

// Save preferences on unload
window.addEventListener('beforeunload', function() {
    saveUserPreferences();
});

// Initialize with a final check
setTimeout(() => {
    if (currentSelectedCoin && currentSelectedCoin.id) {
        console.log(`🎯 Active coin: ${currentSelectedCoin.symbol} (${currentTimeFrame})`);
        console.log(`📈 System ready with ${Object.keys(generateRealisticIndicators()).length} indicators`);
        console.log(`🆕 Enhanced mapping includes: TON, DOGS, MAJOR + ${Object.keys(SYMBOL_MAPPING).length} total coins`);
    }
}, 3000);
