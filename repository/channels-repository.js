import dataSource from "../modules/stored-data-mod.js";
import { Console as console  } from "../modules/logger-mod.js";
import { channelsSchema } from "../models/channels-model.js";

/**
 * Gestisce la sessione della chat
 */
class ChannelsRepository {
    model = dataSource.connection.model('channels', channelsSchema, "channels");

    /**
     * Ottiene la lista degli utenti autorizzati ad utilizzare la chat
     * 
     * @returns {channelsSchema[]} lista degli utenti autorizzati
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
}

export const channelsRepo = new ChannelsRepository();