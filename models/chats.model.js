import mongoose from "mongoose";


export const chatSchema = new mongoose.Schema({
    key:String,
    data: mongoose.Schema.Types.Mixed
  });

  