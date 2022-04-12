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
        chatId: 1082955475,
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
            chatId: 1082955475,
            username: 'lucianogrippa',
            code: '',
            lastUsedPair: 'BTCUSDT',
            binanceAccount: true,
            defaultCurrency: 'USDT',
            binanceApiKey: 'c7360de7980af816aa203947a74ec058971b63f4f1b4cba2da5c900f95efb312',
            binanceSecret: '2672a656da24a29c9f9e76387ed02cf9e21c3218c034bd8895a82b3caa3ba6db',
            binanceTestnet: true
        }
    ]);