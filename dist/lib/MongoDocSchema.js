"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDocSchema = void 0;
const mongoose_1 = require("mongoose");
exports.MongoDocSchema = new mongoose_1.Schema({
    key: { type: String, required: true },
    value: { type: mongoose_1.Schema.Types.Mixed, required: true }
});
//# sourceMappingURL=MongoDocSchema.js.map