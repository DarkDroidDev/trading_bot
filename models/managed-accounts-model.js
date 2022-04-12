import mongoose from "mongoose";


export const managedAccountSchema = new mongoose.Schema({
    name: String,
    lastName: String,
    emanil: String,
    exchange: String,
    key: String,
    secret: String
});