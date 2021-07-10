const mongoose = require("mongoose");
const { Schema } = mongoose;

const schema = new Schema(
  {
    url: String,
    page: Number,
    ship: Number,
    num: Number,
    prefix: String,
    length: Number,
    total: Number,
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const storeModel = mongoose.model("Store", schema);

module.exports = storeModel;
