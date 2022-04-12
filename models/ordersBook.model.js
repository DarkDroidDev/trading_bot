import mongoose from "mongoose";


export const ordersbook = new mongoose.Schema({
    chatId:String,
    type: String,
    orderId: mongoose.Schema.Types.String,
    order: mongoose.Schema.Types.Mixed
  });

  