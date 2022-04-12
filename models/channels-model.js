import mongoose from "mongoose";


export const channelsSchema = new mongoose.Schema({
    id: String,
    chatId: String,
    name: String
  });
