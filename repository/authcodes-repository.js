import mongose from "mongoose";
import dataSource from "../modules/stored-data-mod.js";
import { authCodesSchema } from "../models/authcodes.model.js";
import { Console as console  } from "../modules/logger-mod.js";

/**
 * Gestisce la sessione della chat
 */
class AuthCodesRepository {
    model = dataSource.connection.model('authcodes', authCodesSchema, "authcodes");

    /**
     * Ottiene la lista degli utenti autorizzati ad utilizzare la chat
     * 
     * @returns {authCodesSchema[]} lista degli utenti autorizzati
     */
    async findAll() {
        let results = null;
        try {
            results = await this.model.find({});

            return results;
        } catch (err) {
            console.error(err);
        }
        return null;
    }

    /**
     * Cerca l'account cha ha il flag binanceAccount a true
     * @returns {authCodesSchema}
     */
    async findDefaultAccount() {
        let results = null;
        try {
            results = await this.model.findOne({binanceAccount: true});

            return results;
        } catch (err) {
            console.error(err);
        }
        return results;
    }
    /**
     * verifica se il codice inserito è in chat
     * 
     * @param {number} chatId 
     * @param {string} pair 
     */
    async verifyCode(chatId,username) {
        let results = null;
        try {
            results = await this.model.findOne({ chatId,username });

            if (!!results && mongose.isValidObjectId(results._id)) {
                return results;
            }
        } catch (err) {
            console.error(err);
        }
        return null;
    }

    async save(chatObject) {
        try {
            return await this.model.updateOne({ chatId: chatObject.chatId }, {
                $set: chatObject
            },{
                upsert: true
            });
        } catch (err) {
            console.error(err);
        }

        return null;
    }

    async deleteAll(chatId) {

    }
}

export const authCodesRepo = new AuthCodesRepository();