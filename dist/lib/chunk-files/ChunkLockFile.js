"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkLockFile = void 0;
const File_1 = require("../File");
class ChunkLockFile extends File_1.File {
    constructor(options) {
        const { directory, id, retry } = options;
        super({ directory, name: `.temp-${id}.json.lock`, retry });
    }
}
exports.ChunkLockFile = ChunkLockFile;
//# sourceMappingURL=ChunkLockFile.js.map