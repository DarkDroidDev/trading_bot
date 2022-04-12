import dotenv from 'dotenv';

export const configEnv = () => {

    const currentEnv = process.env.NODE_ENV;

    console.log("loading env properties");

    let envFile = "";
    switch (currentEnv) {
        case "production":
            envFile = ".env.production";
            break;
        case "development":
            envFile = ".env.development";
            break;
        case "local":
            envFile = ".env.local";
            break;
        default:
            envFile = ".env.local";
    }

    console.log('env file ',envFile);
    dotenv.config({
        debug:false,
        path: envFile
    });

    console.log(`Enviorment ${process.env.ENVNAME} is loaded`);
}

export const enviorments = () => {
    return {
        sessionName: `session_${process.env.ENVNAME}`,
        telegram: {
            token: process.env.TELEGRAM_BOT_TOKEN,
            secretPath: process.env.TELEGRAM_SECRET_PATH,
            defaultPort: process.env.TELEGRAM_WEBHOOK_PORT,
            host: process.env.TELEGRAM_HOST ? process.env.TELEGRAM_HOST: null
        },
        binanceFeauturesMarket: {
            apikey: process.env.BINANCE_API_KEY,
            apiSecret: process.env.BINANCE_SECRET,
            test: process.env.BINANCE_TESTNET === 'true'
        },
        dbSettings: {
            connection: process.env.MONGO_DB_CONNECTION,
            debug: process.env.BINANCE_TESTNET === 'true'
        },
        websocketEnv: {
            port: process.env.WEBSOCKET_PORT,
            server: "localhost",
            path: "/tradingBotws",
            maxretry: process.env.WEBSOCKET_MAX_RETRY_CONNECTION
        },
        httpLocalserver: {
            port: process.env.HTTP_SERVER_PORT,
            serverPath: process.env.HTTP_STATIC_FILES_PATH,
            baseDomain: process.env.HTTP_SERVER_BASE_ADDRESS
        },
        logging: process.env.LOG_LEVEL
    }
};


configEnv();