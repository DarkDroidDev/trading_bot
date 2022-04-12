import mongose from "mongoose";
import dataSource from "../modules/stored-data-mod.js";
import { ordersbook } from "../models/ordersBook.model.js";
import { Console as console  } from "../modules/logger-mod.js";

/**
 * Gestisce la sessione della chat
 */
class OrderBokkRepository {
    model = dataSource.connection.model('ordersbook', ordersbook, "ordersbook",{
        overwriteModels: true
    });

    async updateOne(chatId,orderId,order) {
        try {
            return await this.model.updateOne({ chatId,orderId }, { $set: { order } }, { upsert: true });
        } catch (err) {
            console.error(err);
        }

        return null;
    }

    async findOne(chatId,orderId) {
        try {
            const result = await this.model.findOne({ chatId,orderId });

            if(!!result  && mongose.isValidObjectId(result._id)){
                return result.order;
            }
            return {};
            
        }catch (err) {
            console.error(err);
        }

        return {};
    }

    /**
     * Get all authorized users
     * @returns {Array} all auth users
     */
    async findAll(chatId,symbol){
        try {
            const result = await this.model.find({ chatId,"order.symbol":symbol });

            if(!!result && result.length>0){
                return result;
            }
            return [];
            
        }catch (err) {
            console.error(err);
        }

        return [];
    }


    async deleteOrder(chatId,orderId) {
        try {
            return await this.model.deleteMany({ chatId,orderId });
            
        }catch (err) {
            console.error(err);
        }

        return null;
    }
}

export const ordersBookRepo = new OrderBokkRepository();