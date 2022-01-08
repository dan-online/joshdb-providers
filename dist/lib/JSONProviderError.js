"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONProviderError = void 0;
const core_1 = require("@joshdb/core");
class JSONProviderError extends core_1.JoshProviderError {
    get name() {
        return 'JSONProviderError';
    }
}
exports.JSONProviderError = JSONProviderError;
//# sourceMappingURL=JSONProviderError.js.map