"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkIndexFile = void 0;
const File_1 = require("../File");
const ChunkLockFile_1 = require("./ChunkLockFile");
class ChunkIndexFile extends File_1.File {
    constructor(options) {
        const { directory, retry } = options;
        super({ directory, name: 'index.json', retry });
        this.lock = new ChunkLockFile_1.ChunkLockFile({ directory, id: 'index', retry });
    }
    async fetch() {
        if (!this.exists) {
            await this.save({ name: this.options.name, autoKeyCount: 0, chunks: [] });
            return this.fetch();
        }
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
exports.ChunkIndexFile = ChunkIndexFile;
//# sourceMappingURL=ChunkIndexFile.js.map