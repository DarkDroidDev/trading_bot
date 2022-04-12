import mongose from "mongoose";
import dataSource from "../modules/stored-data-mod.js";
import { settingsSchema } from "../models/settings.model.js";
import { Console as console  } from "../modules/logger-mod.js";

class SettingsRepository {
    model = dataSource.connection.model('settings', settingsSchema, "settings");
    /**
     * carica tutti i settings necessari per il pair
     * 
     * @param {number} chatId 
     * @param {string} pair 
     */
    async loadSettingsForPair(chatId, pair) {
        let results=null;
        try {
            results = await this.model.findOne({pair: pair, chatId });

            if (!!results && mongose.isValidObjectId(results._id)) {
                return results._doc;
            }
        } catch (err) {
            console.error(err);
        }
        return null;
    }

    async save(chatId, pair, settings) {
        try {
            return await this.model.updateOne({pair, chatId }, { $set: { 
                feesMax: settings.feesMax,
                levaMax: settings.levaMax,
                timeFrame: settings.timeFrame,
                smartTakeProfit: settings.smartTakeProfit,
                stopLossPercent: settings.stopLossPercent,
                takeProfitPercent: settings.takeProfitPercent,
                startLevelPercent: settings.startLevelPercent,
                timeOorderExpiration: settings.timeOorderExpiration,
                stopBotFor: settings.stopBotFor,
                shortTradePricePercent1: settings.shortTradePricePercent1,
                shortTradePricePercent2: settings.shortTradePricePercent2,
                shortTradePricePercent3: settings.shortTradePricePercent3,
                shortOrderAmount1: settings.shortOrderAmount1,
                shortOrderAmount2: settings.shortOrderAmount2,
                shortOrderAmount3: settings.shortOrderAmount3,
                longTradePricePercent1: settings.longTradePricePercent1,
                longTradePricePercent2: settings.longTradePricePercent2,
                longTradePricePercent3: settings.longTradePricePercent3,
                longOrderAmount1: settings.longOrderAmount1,
                longOrderAmount2: settings.longOrderAmount2,
                longOrderAmount3: settings.longOrderAmount3,
                
             } });
        } catch (err) {
            console.error(err);
        }

        return null;
    }

    async deleteAll(chatId, pair) {
        try{
            return await this.model.deleteOne({ $and: { pair: pair, chatId } });
        }
        catch(err){
            console.error(err);
        }
    }
}

export const settingsRepo = new SettingsRepository();