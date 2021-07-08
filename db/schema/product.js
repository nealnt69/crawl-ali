const mongoose = require("mongoose");
const { Schema } = mongoose;

const schema = new Schema(
  {
    store: mongoose.ObjectId,
    sku: String,
    title: String,
    description: String,
    ortherImage: Array,
    childrenSku: Array,
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const productModel = mongoose.model("Product", schema);

module.exports = productModel;
