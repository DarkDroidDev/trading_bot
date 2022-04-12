/* eslint-disable no-undef */
db.auth('mainadmin', '84htKKzzMhj7632023sdd')

db = db.getSiblingDB('tradingbotdb')

db.createUser({
    user: "tradingapp",
    pwd: "4230g1cfasgard4c95bb55a3accVtrewsllo987Y6534",
    roles: [
        { role: "readWrite", db: "tradingbotdb" }
    ],
    mechanisms: [
        "SCRAM-SHA-1"
    ]
});

db.createCollection('settings');
db.createCollection('chats');
db.createCollection('authcodes');

db.settings.insertMany([
    {
        chatId: 492085777,
        pair: "BTCUSDT",
        feesMax: 0.1,
        levaMax: 4,
        longOrderAmount1: 200,
        longOrderAmount2: 200,
        longOrderAmount3: 500,
        longTradePricePercent1: 0.2,
        longTradePricePercent2: -0.2,
        longTradePricePercent3: -5,
        shortOrderAmount1: 200,
        shortOrderAmount2: 200,
        shortOrderAmount3: 500,
        shortTradePricePercent1: -0.2,
        shortTradePricePercent2: 0.2,
        shortTradePricePercent3: 5,
        smartTakeProfit: 1,
        startLevelPercent: 0,
        stopBotFor: 6,
        stopLossPercent: 7,
        takeProfitPercent: 0.25,
        timeFrame: "5m",
        timeOorderExpiration: 30,
        limDMIMin: 9,
        limDMIMax: 40
    }
])
db.authcodes.insertMany(
    [
        {
            chatId: 492085777,
            username: 'ZetaParent',
            code: '',
            lastUsedPair: 'BTCUSDT',
            binanceAccount: true,
            defaultCurrency: 'USDT',
            binanceApiKey: 'a67af280a61b859e9c771dc12f685e7e55874146ddc161c528f947accff576d8',
            binanceSecret: '3d0cdf6237abd67493e561320947415a4b3475494e60bf2d62017276cf4aeccb',
            binanceTestnet: true
        }
    ]);