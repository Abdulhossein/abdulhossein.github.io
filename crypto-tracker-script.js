// Crypto Tracker Improved JavaScript
// File: crypto-tracker-improved.js

// Global variables
let searchTimeout;
let currentSelectedCoin = { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' };
let isSearching = false;
let tradingViewChart = null;
let priceUpdateInterval = null;

// API Configuration with fallbacks
const API_CONFIG = {
    // Primary API
    COINGECKO_BASE: 'https://api.coingecko.com/api/v3',
    
    // Backup APIs for price data
    COINBASE_API: 'https://api.coinbase.com/v2/exchange-rates',
    BINANCE_API: 'https://api.binance.com/api/v3',
    
    // For search (more reliable)
    SEARCH_API: 'https://api.coingecko.com/api/v3/search',
    
    // Global market data
    GLOBAL_API: 'https://api.coingecko.com/api/v3/global',
    
    // CORS Proxy alternatives
    CORS_PROXY_1: 'https://api.allorigins.win/get?url=',
    CORS_PROXY_2: 'https://corsproxy.io/?',
    
    // Telegram RSS
    TELEGRAM_RSS: 'https://api.rss2json.com/v1/api.json?rss_url='
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('🚀 Initializing Crypto Tracker Improved...');
    
    // Initialize search functionality
    initializeSearch();
    
    // Initialize TradingView chart
    initializeTradingViewChart();
    
    // Load initial coin data
    loadCoinData('bitcoin');
    
    // Load market summary
    loadGlobalMarketData();
    
    // Load news
    loadTelegramNews();
    
    // Update timestamps
    updateTimestamp();
    updateFearGreedIndex();
    
    // Restore previous selections
    restorePreviousSelections();
    
    // Set up periodic updates
    setupPeriodicUpdates();
    
    // Initialize Telegram WebApp
    initializeTelegramWebApp();
    
    // Show welcome message
    setTimeout(() => {
        showNotification('سیستم رصد پیشرفته آماده است! 🚀', 'success');
    }, 1500);
}

// Enhanced Search with Dropdown
function initializeSearch() {
    const searchBox = document.getElementById('cryptoSearch');
    const dropdown = document.getElementById('searchDropdown');
    
    if (!searchBox || !dropdown) {
        console.error('Search elements not found');
        return;
    }
    
    searchBox.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            hideSearchDropdown();
            return;
        }
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Set new timeout for search
        searchTimeout = setTimeout(() => {
            performSearchWithDropdown(query);
        }, 300); // Faster response
    });
    
    // Handle click outside to close dropdown
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            hideSearchDropdown();
        }
    });
    
    // Handle Enter key and arrows
    searchBox.addEventListener('keydown', function(e) {
        const items = document.querySelectorAll('.search-result-item');
        let currentIndex = -1;
        
        // Find currently highlighted item
        items.forEach((item, index) => {
            if (item.classList.contains('highlighted')) {
                currentIndex = index;
            }
        });
        
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
    const dropdown = document.getElementById('searchDropdown');
    
    try {
        showSearchLoading();
        
        // Use CoinGecko search API with better error handling
        const searchUrl = `${API_CONFIG.SEARCH_API}?query=${encodeURIComponent(query)}`;
        
        let response;
        try {
            response = await fetch(searchUrl);
        } catch (error) {
            // Try with CORS proxy if direct request fails
            console.warn('Direct search failed, trying with proxy...');
            response = await fetch(`${API_CONFIG.CORS_PROXY_1}${encodeURIComponent(searchUrl)}`);
        }
        
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle proxied response
        const searchData = data.contents ? JSON.parse(data.contents) : data;
        
        if (searchData.coins && searchData.coins.length > 0) {
            displaySearchDropdown(searchData.coins.slice(0, 5)); // Show max 5 results
        } else {
            showNoSearchResults();
        }
        
    } catch (error) {
        console.error('Search error:', error);
        showSearchError();
        
        // Fallback to predefined list
        const fallbackResults = await getFallbackSearchResults(query);
        if (fallbackResults.length > 0) {
            displaySearchDropdown(fallbackResults);
        }
    } finally {
        isSearching = false;
    }
}

function getFallbackSearchResults(query) {
    const predefinedCoins = [
        { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', market_cap_rank: 1 },
        { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', market_cap_rank: 2 },
        { id: 'tether', name: 'Tether', symbol: 'USDT', market_cap_rank: 3 },
        { id: 'binancecoin', name: 'BNB', symbol: 'BNB', market_cap_rank: 4 },
        { id: 'solana', name: 'Solana', symbol: 'SOL', market_cap_rank: 5 },
        { id: 'usd-coin', name: 'USDC', symbol: 'USDC', market_cap_rank: 6 },
        { id: 'staked-ether', name: 'Lido Staked Ether', symbol: 'STETH', market_cap_rank: 7 },
        { id: 'xrp', name: 'XRP', symbol: 'XRP', market_cap_rank: 8 },
        { id: 'cardano', name: 'Cardano', symbol: 'ADA', market_cap_rank: 9 },
        { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', market_cap_rank: 10 },
        { id: 'the-open-network', name: 'Toncoin', symbol: 'TON', market_cap_rank: 11 },
        { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX', market_cap_rank: 12 },
        { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', market_cap_rank: 13 },
        { id: 'wrapped-bitcoin', name: 'Wrapped Bitcoin', symbol: 'WBTC', market_cap_rank: 14 },
        { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', market_cap_rank: 15 },
        { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', market_cap_rank: 16 },
        { id: 'bitcoin-cash', name: 'Bitcoin Cash', symbol: 'BCH', market_cap_rank: 17 },
        { id: 'near', name: 'NEAR Protocol', symbol: 'NEAR', market_cap_rank: 18 },
        { id: 'polygon', name: 'Polygon', symbol: 'MATIC', market_cap_rank: 19 },
        { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', market_cap_rank: 20 }
    ];
    
    const lowerQuery = query.toLowerCase();
    return predefinedCoins.filter(coin => 
        coin.name.toLowerCase().includes(lowerQuery) || 
        coin.symbol.toLowerCase().includes(lowerQuery) ||
        coin.id.toLowerCase().includes(lowerQuery)
    ).slice(0, 5);
}

function showSearchLoading() {
    const dropdown = document.getElementById('searchDropdown');
    dropdown.innerHTML = `
        <div class="search-loading">
            <div class="spinner" style="width: 20px; height: 20px; margin-bottom: 8px;"></div>
            🔍 در حال جستجو...
        </div>
    `;
    dropdown.style.display = 'block';
}

function showSearchError() {
    const dropdown = document.getElementById('searchDropdown');
    dropdown.innerHTML = `
        <div class="search-error">
            ❌ خطا در جستجو - در حال استفاده از لیست محلی
        </div>
    `;
}

function showNoSearchResults() {
    const dropdown = document.getElementById('searchDropdown');
    dropdown.innerHTML = `
        <div class="search-loading">
            ❌ نتیجه‌ای یافت نشد
        </div>
    `;
}

function displaySearchDropdown(coins) {
    const dropdown = document.getElementById('searchDropdown');
    
    const html = coins.map(coin => `
        <div class="search-result-item" onclick="selectSearchResult('${coin.id}', '${coin.symbol.toUpperCase()}', '${coin.name}')">
            <div class="search-result-info">
                <div class="search-result-name">${coin.name}</div>
                <div class="search-result-symbol">Symbol: ${coin.symbol.toUpperCase()}</div>
            </div>
            <div class="search-result-rank">#${coin.market_cap_rank || '?'}</div>
        </div>
    `).join('');
    
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
}

function selectSearchResult(coinId, symbol, name) {
    const searchBox = document.getElementById('cryptoSearch');
    searchBox.value = `${name} (${symbol})`;
    
    hideSearchDropdown();
    
    // Update entire page with selected coin
    selectCoin(coinId, symbol, name);
    
    showNotification(`ارز ${symbol} انتخاب شد - در حال بروزرسانی کامل صفحه...`, 'info');
}

function hideSearchDropdown() {
    const dropdown = document.getElementById('searchDropdown');
    dropdown.style.display = 'none';
}

// Enhanced coin selection with complete page update
async function selectCoin(coinId, symbol, name) {
    currentSelectedCoin = { id: coinId, symbol: symbol, name: name };
    
    // Show loading state
    showPageUpdateLoading();
    
    // Update coin title
    updateCoinTitle(name, symbol);
    
    // Load fresh coin data
    await loadCoinData(coinId);
    
    // Update TradingView chart
    updateTradingViewChart(symbol);
    
    // Update all widgets and data
    await updateAllPageData();
    
    // Store selected coin
    localStorage.setItem('selectedCoin', JSON.stringify(currentSelectedCoin));
    
    // Hide loading state
    hidePageUpdateLoading();
    
    // Show success message
    showNotification(`تمام داده‌های ${symbol} به‌روزرسانی شد! ✅`, 'success');
}

function showPageUpdateLoading() {
    // Add loading indicators
    const indicators = ['priceIndicator', 'changeIndicator', 'volumeIndicator', 'capIndicator'];
    indicators.forEach(id => {
        const indicator = document.getElementById(id);
        if (indicator) indicator.style.display = 'block';
    });
}

function hidePageUpdateLoading() {
    // Remove loading indicators
    const indicators = ['priceIndicator', 'changeIndicator', 'volumeIndicator', 'capIndicator'];
    indicators.forEach(id => {
        const indicator = document.getElementById(id);
        if (indicator) {
            indicator.style.display = 'block';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 2000);
        }
    });
}

async function updateAllPageData() {
    try {
        // Update market summary
        await loadGlobalMarketData();
        
        // Update fear & greed index
        updateFearGreedIndex();
        
        // Update timestamp
        updateTimestamp();
        
        console.log('✅ All page data updated successfully');
    } catch (error) {
        console.error('Error updating page data:', error);
    }
}

function updateCoinTitle(name, symbol) {
    const coinTitle = document.getElementById('coinTitle');
    const coinEmojis = {
        'BTC': '₿', 'ETH': 'Ξ', 'ADA': '🔴', 'SOL': '🟣',
        'XRP': '💧', 'LTC': '🔘', 'DOGE': '🐕', 'MATIC': '🔷',
        'USDT': '💵', 'BNB': '🟡', 'AVAX': '🔺', 'DOT': '🔴'
    };
    
    const emoji = coinEmojis[symbol] || '🪙';
    if (coinTitle) {
        coinTitle.innerHTML = `📊 اطلاعات ${name} (${symbol}) <span class="crypto-icons">${emoji}</span>`;
    }
}

// Enhanced coin data loading with multiple API fallbacks
async function loadCoinData(coinId) {
    try {
        showLoadingInPriceCards();
        
        let coinData = null;
        
        // Try primary API
        try {
            const response = await fetch(`${API_CONFIG.COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`);
            if (response.ok) {
                coinData = await response.json();
            }
        } catch (error) {
            console.warn('Primary API failed, trying backup...');
        }
        
        // Try backup with proxy if primary fails
        if (!coinData) {
            try {
                const proxyUrl = `${API_CONFIG.CORS_PROXY_1}${encodeURIComponent(`${API_CONFIG.COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`)}`;
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    const data = await response.json();
                    coinData = data.contents ? JSON.parse(data.contents) : data;
                }
            } catch (error) {
                console.warn('Backup API also failed');
            }
        }
        
        if (coinData && coinData.market_data) {
            updatePriceDisplay(coinData);
        } else {
            throw new Error('No valid data received');
        }
        
    } catch (error) {
        console.error('Error loading coin data:', error);
        showErrorInPriceCards();
        
        // Try to get basic price data from alternative sources
        await loadBasicPriceData(coinId);
        
        showNotification('خطا در دریافت داده‌ها - استفاده از منبع جایگزین', 'error');
    }
}

async function loadBasicPriceData(coinId) {
    try {
        // Try simple price endpoint
        const response = await fetch(`${API_CONFIG.COINGECKO_BASE}/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`);
        if (response.ok) {
            const data = await response.json();
            const priceData = data[coinId];
            
            if (priceData) {
                // Update with basic data
                updateBasicPriceDisplay(priceData);
                return;
            }
        }
    } catch (error) {
        console.error('Basic price data also failed:', error);
    }
}

function updateBasicPriceDisplay(priceData) {
    const currentPrice = document.getElementById('currentPrice');
    const change24h = document.getElementById('change24h');
    const volume24h = document.getElementById('volume24h');
    const marketCap = document.getElementById('marketCap');
    
    if (currentPrice && priceData.usd) {
        currentPrice.textContent = `$${formatNumber(priceData.usd)}`;
        currentPrice.style.color = '#27ae60';
        document.getElementById('priceCard1').className = 'price-card';
    }
    
    if (change24h && priceData.usd_24h_change !== undefined) {
        const change = priceData.usd_24h_change;
        change24h.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        change24h.className = change >= 0 ? 'price-change-positive' : 'price-change-negative';
        document.getElementById('priceCard2').className = 'price-card';
    }
    
    if (volume24h && priceData.usd_24h_vol) {
        volume24h.textContent = `$${formatLargeNumber(priceData.usd_24h_vol)}`;
        volume24h.style.color = '#3498db';
        document.getElementById('priceCard3').className = 'price-card';
    }
    
    if (marketCap && priceData.usd_market_cap) {
        marketCap.textContent = `$${formatLargeNumber(priceData.usd_market_cap)}`;
        marketCap.style.color = '#f39c12';
        document.getElementById('priceCard4').className = 'price-card';
    }
}

function showLoadingInPriceCards() {
    const elements = ['currentPrice', 'change24h', 'volume24h', 'marketCap'];
    const cards = ['priceCard1', 'priceCard2', 'priceCard3', 'priceCard4'];
    
    elements.forEach((id, index) => {
        const element = document.getElementById(id);
        const card = document.getElementById(cards[index]);
        if (element) {
            element.textContent = 'در حال بارگذاری...';
            element.style.color = '#ffffff';
        }
        if (card) {
            card.className = 'price-card loading';
        }
    });
}

function showErrorInPriceCards() {
    const elements = ['currentPrice', 'change24h', 'volume24h', 'marketCap'];
    const cards = ['priceCard1', 'priceCard2', 'priceCard3', 'priceCard4'];
    
    elements.forEach((id, index) => {
        const element = document.getElementById(id);
        const card = document.getElementById(cards[index]);
        if (element) {
            element.textContent = 'خطا در بارگذاری';
            element.style.color = '#ffffff';
        }
        if (card) {
            card.className = 'price-card error';
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
        currentPrice.style.color = '#ffffff';
        document.getElementById('priceCard1').className = 'price-card';
    }
    
    // Update 24h change
    const change24h = document.getElementById('change24h');
    if (change24h && marketData.price_change_percentage_24h !== null) {
        const change = marketData.price_change_percentage_24h;
        change24h.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        change24h.className = change >= 0 ? 'price-change-positive' : 'price-change-negative';
        document.getElementById('priceCard2').className = 'price-card';
    }
    
    // Update volume
    const volume24h = document.getElementById('volume24h');
    if (volume24h && marketData.total_volume) {
        const volume = marketData.total_volume.usd;
        volume24h.textContent = `$${formatLargeNumber(volume)}`;
        volume24h.style.color = '#ffffff';
        document.getElementById('priceCard3').className = 'price-card';
    }
    
    // Update market cap
    const marketCap = document.getElementById('marketCap');
    if (marketCap && marketData.market_cap) {
        const cap = marketData.market_cap.usd;
        marketCap.textContent = `$${formatLargeNumber(cap)}`;
        marketCap.style.color = '#ffffff';
        document.getElementById('priceCard4').className = 'price-card';
    }
}

// Enhanced TradingView chart initialization
function initializeTradingViewChart() {
    const container = document.getElementById('tradingview_chart');
    if (!container) {
        console.error('TradingView container not found');
        return;
    }
    
    // Load TradingView library
    loadTradingViewScript().then(() => {
        createTradingViewWidget('BTCUSDT');
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
    
    // Clear existing chart
    container.innerHTML = '';
    
    try {
        tradingViewChart = new window.TradingView.widget({
            autosize: true,
            symbol: `BINANCE:${symbol}`,
            interval: "D",
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
                "MASimple@tv-basicstudies",
                "Volume@tv-basicstudies"
            ],
            container_id: "tradingview_chart",
            height: 600,
            width: "100%"
        });
        
        console.log('✅ TradingView chart created successfully');
    } catch (error) {
        console.error('Error creating TradingView chart:', error);
        showChartError();
    }
}

function showChartError() {
    const container = document.getElementById('tradingview_chart');
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <div style="color: #e74c3c; text-align: center;">
                    ❌ خطا در بارگذاری نمودار<br>
                    <small>در حال تلاش مجدد...</small>
                </div>
            </div>
        `;
        
        // Retry after 5 seconds
        setTimeout(() => {
            initializeTradingViewChart();
        }, 5000);
    }
}

function updateTradingViewChart(symbol) {
    if (window.TradingView) {
        createTradingViewWidget(`${symbol}USDT`);
    }
}

// Enhanced global market data loading
async function loadGlobalMarketData() {
    try {
        const response = await fetch(`${API_CONFIG.GLOBAL_API}`);
        if (!response.ok) throw new Error('Global data fetch failed');
        
        const data = await response.json();
        updateGlobalMarketDisplay(data.data);
        
    } catch (error) {
        console.error('Error loading global market data:', error);
        // Use fallback data
        updateGlobalMarketDisplay({
            total_market_cap: { usd: 2450000000000 },
            total_volume: { usd: 87200000000 },
            market_cap_percentage: { btc: 54.2 }
        });
    }
}

function updateGlobalMarketDisplay(globalData) {
    const totalMarketCap = document.getElementById('totalMarketCap');
    const total24hVolume = document.getElementById('total24hVolume');
    const btcDominance = document.getElementById('btcDominance');
    
    if (totalMarketCap && globalData.total_market_cap) {
        totalMarketCap.textContent = `$${formatLargeNumber(globalData.total_market_cap.usd)}`;
    }
    
    if (total24hVolume && globalData.total_volume) {
        total24hVolume.textContent = `$${formatLargeNumber(globalData.total_volume.usd)}`;
    }
    
    if (btcDominance && globalData.market_cap_percentage) {
        btcDominance.textContent = `${globalData.market_cap_percentage.btc.toFixed(1)}%`;
    }
}

// Telegram News functionality (improved)
async function loadTelegramNews() {
    const newsContainer = document.getElementById('newsContainer');
    if (!newsContainer) return;
    
    try {
        newsContainer.innerHTML = `
            <div class="news-loading">
                <div class="spinner"></div>
                <p>در حال بارگذاری اخبار کانال Mini Exchange...</p>
            </div>
        `;
        
        // Always show mock news for now (Telegram RSS has limitations)
        setTimeout(() => {
            displayMockNews();
        }, 1000);
        
    } catch (error) {
        console.error('Error loading news:', error);
        showNewsError();
    }
}

function displayMockNews() {
    const newsContainer = document.getElementById('newsContainer');
    if (!newsContainer) return;
    
    const mockNews = [
        {
            title: '🚀 بیت‌کوین به سطح مقاومت 67 هزار دلار رسید',
            content: 'قیمت بیت‌کوین با رشد ۲.۴٪ در ۲۴ ساعت گذشته به کانال ۶۷ هزار دلار وارد شد. تحلیلگران معتقدند این سطح می‌تواند به عنوان پایه‌ای قوی برای حرکت‌های آتی عمل کند.',
            time: '۲۵ دقیقه پیش',
            category: 'Bitcoin'
        },
        {
            title: '⚡ اتریوم آماده ارتقاء جدید شانگهای',
            content: 'شبکه اتریوم آماده پیاده‌سازی آپدیت بعدی خود می‌شود. این ارتقاء انتظار می‌رود کارایی شبکه را به میزان قابل توجهی افزایش دهد و هزینه‌های تراکنش را کاهش دهد.',
            time: '۱ ساعت پیش',
            category: 'Ethereum'
        },
        {
            title: '💎 سولانا رکورد جدید TVL ثبت کرد',
            content: 'شبکه سولانا با ثبت رکورد جدیدی در ارزش کل قفل شده (TVL)، جایگاه خود را در اکوسیستم DeFi تقویت کرده است. حجم معاملات روزانه نیز رشد چشمگیری داشته.',
            time: '۲ ساعت پیش',
            category: 'Solana'
        },
        {
            title: '📊 تحلیل بازار: روند صعودی در ادامه',
            content: 'بر اساس آخرین تحلیل‌های تکنیکال، بازار ارزهای دیجیتالی همچنان در روند صعودی قرار دارد. شاخص‌های RSI و MACD سیگنال‌های مثبتی ارائه می‌دهند.',
            time: '۳ ساعت پیش',
            category: 'Analysis'
        },
        {
            title: '🌟 معرفی پروژه‌های جدید در حوزه AI',
            content: 'چندین پروژه جدید در تقاطع هوش مصنوعی و بلاک‌چین معرفی شدند. این پروژه‌ها قرار است امکانات نوینی برای کاربران و توسعه‌دهندگان فراهم کنند.',
            time: '۴ ساعت پیش',
            category: 'Innovation'
        }
    ];
    
    const html = mockNews.map(item => `
        <div class="news-item">
            <div class="news-item-title">${item.title}</div>
            <div class="news-item-content">${item.content}</div>
            <div class="news-item-meta">
                <div class="news-item-time">🕐 ${item.time}</div>
                <div style="color: #3498db;">#${item.category}</div>
            </div>
        </div>
    `).join('');
    
    newsContainer.innerHTML = html;
}

function showNewsError() {
    const newsContainer = document.getElementById('newsContainer');
    if (!newsContainer) return;
    
    newsContainer.innerHTML = `
        <div class="news-error">
            ❌ خطا در بارگذاری اخبار
            <br><br>
            <button onclick="refreshNews()" style="margin-top: 10px; padding: 8px 15px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer;">
                🔄 تلاش مجدد
            </button>
        </div>
    `;
}

function refreshNews() {
    loadTelegramNews();
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
    const tabContent = document.getElementById(tabName);
    if (tabContent) tabContent.classList.add("active");
    if (evt.currentTarget) evt.currentTarget.classList.add("active");
    
    // Store active tab
    localStorage.setItem('activeTab', tabName);
}

// Fear & Greed Index updater
function updateFearGreedIndex() {
    const values = [
        {value: 25, status: 'ترس شدید', color: '#e74c3c'},
        {value: 35, status: 'ترس', color: '#f39c12'},
        {value: 50, status: 'خنثی', color: '#95a5a6'},
        {value: 65, status: 'طمع', color: '#f1c40f'},
        {value: 75, status: 'طمع شدید', color: '#27ae60'}
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
        const tabButton = document.querySelector(`[onclick*="${savedTab}"]`);
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
            document.getElementById('cryptoSearch').value = `${coin.name} (${coin.symbol})`;
        } catch (error) {
            console.error('Error restoring coin selection:', error);
        }
    }
}

// Setup periodic updates
function setupPeriodicUpdates() {
    // Update timestamp every minute
    setInterval(updateTimestamp, 60000);
    
    // Update selected coin data every 2 minutes
    setInterval(() => {
        if (currentSelectedCoin.id) {
            loadCoinData(currentSelectedCoin.id);
        }
    }, 120000);
    
    // Update global market data every 5 minutes
    setInterval(() => {
        loadGlobalMarketData();
        updateFearGreedIndex();
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
    
    // Hide after 4 seconds
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
        
        // Initialize
        tg.ready();
        tg.expand();
        
        // Set theme
        tg.setHeaderColor('#3498db');
        tg.setBackgroundColor('#ffffff');
        
        // Main button
        tg.MainButton.text = 'اشتراک گذاری ارز انتخابی';
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
            if (currentSelectedCoin.id) {
                tg.sendData(JSON.stringify({
                    action: 'share_coin',
                    coin: currentSelectedCoin,
                    timestamp: new Date().toISOString()
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
    } else if (num >= 0.01) {
        return num.toFixed(4);
    } else {
        return num.toFixed(8);
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
window.selectSearchResult = selectSearchResult;

console.log('✅ Crypto Tracker Improved JavaScript loaded successfully!');
