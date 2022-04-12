import mongose from "mongoose";
import dataSource from "../modules/stored-data-mod.js";
import { chatSchema } from "../models/chats.model.js";
import { Console as console  } from "../modules/logger-mod.js";

/**
 * Gestisce la sessione della chat
 */
class ChatsRepository {
    model = dataSource.connection.model('chats', chatSchema, "chats");

    async updateOne(key,data) {
        try {
            return await this.model.updateOne({ key }, { $set: { data } }, { upsert: true });
        } catch (err) {
            console.error(err);
        }

        return null;
    }

    async findOne(key) {
        try {
            const result = await this.model.findOne({ key });

            if(!!result && result.data && mongose.isValidObjectId(result._id)){
                return result.data;
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
    async findAllAuthorized(){
        try {
            const result = await this.model.find({ "data.authorized": true });

            if(!!result && result.length>0){
                return result;
            }
            return [];
            
        }catch (err) {
            console.error(err);
        }

        return [];
    }
    async deleteKey(key) {
        try {
            return await this.model.deleteMany({ key });
            
        }catch (err) {
            console.error(err);
        }

        return null;
    }
}

export const chatsRepo = new ChatsRepository();