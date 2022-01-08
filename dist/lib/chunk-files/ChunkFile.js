"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkFile = void 0;
const File_1 = require("../File");
const ChunkLockFile_1 = require("./ChunkLockFile");
class ChunkFile extends File_1.File {
    constructor(options) {
        const { directory, id, retry } = options;
        super({ directory, name: `${id}.json`, retry });
        this.lock = new ChunkLockFile_1.ChunkLockFile(options);
    }
    async fetch() {
        if (!this.exists)
            return undefined;
        await this.copy(this.lock.path);
        const data = await this.lock.read();
        await this.lock.delete();
        return data;
    }
    async save(data) {
        await this.lock.write(data);
        await this.lock.rename(this.path);
    }
}
exports.ChunkFile = ChunkFile;
//# sourceMappingURL=ChunkFile.js.map