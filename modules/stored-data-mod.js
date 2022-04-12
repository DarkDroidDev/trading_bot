import mongoose from "mongoose";
import { enviorments } from "./properties-mod.js";
import { Console as console  } from './logger-mod.js';

//DOC: https://mongoosejs.com/docs/guide.html
const { dbSettings } = enviorments();


class DataStorage {
    constructor() {
        /// @type mongose
        this.connection = mongoose;
        this.isConnected = false;
        this.db = null;
    }

    async connectDb() {
        try {
            this.connection = await mongoose.connect(dbSettings.connection);
            console.info('database is connected');
            this.isConnected = true;
            return true;
        } catch (err) {
            console.error(err);
            this.isConnected = false;
        }

        return false;
    }

    close() {
        if (this.connection && this.isConnected) {
            this.connection.disconnect().then((res) => {
                this.isConnected = false;
                console.info('database disconnected');
            }).catch(err => {
                console.error(err);
                this.isConnected = false;
            });
        }
    }
}

const dataSource = new DataStorage();
await dataSource.connectDb();


export default dataSource;