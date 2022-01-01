"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoProviderError = void 0;
const core_1 = require("@joshdb/core");
class MongoProviderError extends core_1.JoshProviderError {
    /**
     * The name for this error.
     */
    get name() {
        return 'MongoProviderError';
    }
}
exports.MongoProviderError = MongoProviderError;
//# sourceMappingURL=MongoProviderError.js.map