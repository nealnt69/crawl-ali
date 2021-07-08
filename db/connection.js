const mongoose = require("mongoose");

const db = mongoose.connection;

mongoose.connect("mongodb://localhost:27017/crawl-ali", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

module.exports = db;
