"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMongoDoc = void 0;
const tslib_1 = require("tslib");
const MongoDocSchema_1 = require("./MongoDocSchema");
const mongoose_1 = (0, tslib_1.__importDefault)(require("mongoose"));
function generateMongoDoc(collectionName) {
    return mongoose_1.default.model('MongoDoc', MongoDocSchema_1.MongoDocSchema, collectionName);
}
exports.generateMongoDoc = generateMongoDoc;
//# sourceMappingURL=MongoDoc.js.map