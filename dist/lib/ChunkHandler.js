"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkHandler = void 0;
const core_1 = require("@joshdb/core");
const async_queue_1 = require("@sapphire/async-queue");
const snowflake_1 = require("@sapphire/snowflake");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const ChunkFile_1 = require("./chunk-files/ChunkFile");
const ChunkIndexFile_1 = require("./chunk-files/ChunkIndexFile");
class ChunkHandler {
    constructor(options) {
        this.queue = new async_queue_1.AsyncQueue();
        this.files = {};
        const { name, dataDirectoryName, epoch, retry } = options;
        this.options = options;
        this.snowflake = epoch === undefined ? snowflake_1.TwitterSnowflake : new snowflake_1.Snowflake(epoch);
        this.directory = (0, path_1.resolve)(process.cwd(), dataDirectoryName ?? 'data', name);
        this.index = new ChunkIndexFile_1.ChunkIndexFile({ directory: this.directory, retry });
    }
    async init() {
        if (!(0, fs_1.existsSync)((0, path_1.resolve)(process.cwd(), 'package.json')))
            throw new core_1.JoshError({
                identifier: ChunkHandler.Identifiers.PackageFileNotFound,
                message: 'A "package.json" file was not found in the working directory. This is required for "ChunkHandler" to run.'
            });
        if (!(0, fs_1.existsSync)(this.directory)) {
            await this.queue.wait();
            await (0, promises_1.mkdir)(this.directory, { recursive: true });
            this.queue.shift();
        }
        const { name, synchronize } = this.options;
        if (!this.index.exists)
            await this.index.save({ name, autoKeyCount: 0, chunks: [] });
        if (synchronize)
            await this.synchronize();
        return this;
    }
    async synchronize() {
        await this.queue.wait();
        const index = await this.index.fetch();
        const { maxChunkSize, retry } = this.options;
        const chunks = [];
        for (const chunk of index.chunks) {
            const file = this.files[chunk.id] ?? (this.files[chunk.id] = new ChunkFile_1.ChunkFile({ directory: this.directory, id: chunk.id, retry }));
            const data = await file.fetch();
            if (data === undefined)
                continue;
            let keys = Object.keys(data);
            if (chunk.keys.length > maxChunkSize)
                chunk.keys = keys.slice(0, maxChunkSize);
            if (keys.length > maxChunkSize) {
                for (let i = maxChunkSize + 1; i > 0; i--) {
                    Reflect.deleteProperty(data, keys[i]);
                    keys = keys.filter((_, index) => index !== i);
                }
                await file.save(data);
            }
            for (const key of keys)
                if (!chunk.keys.includes(key))
                    keys.push(key);
            for (const key of chunk.keys)
                if (!keys.includes(key))
                    chunk.keys = chunk.keys.filter((k) => k !== key);
            chunks.push(chunk);
        }
        await this.index.save({ name: index.name, autoKeyCount: index.autoKeyCount, chunks });
        this.queue.shift();
    }
    async has(key) {
        await this.queue.wait();
        const index = await this.index.fetch();
        this.queue.shift();
        for (const chunk of index.chunks)
            if (chunk.keys.some((k) => k === key))
                return true;
        return false;
    }
    async get(key) {
        const chunkId = await this.locateChunkId(key);
        if (chunkId === undefined)
            return;
        await this.queue.wait();
        const { retry } = this.options;
        const file = this.files[chunkId] ?? (this.files[chunkId] = new ChunkFile_1.ChunkFile({ directory: this.directory, id: chunkId, retry }));
        const data = await file.fetch();
        if (data === undefined)
            return;
        this.queue.shift();
        if (!(key in data))
            return;
        return data[key];
    }
    async set(key, value) {
        await this.queue.wait();
        const index = await this.index.fetch();
        this.queue.shift();
        const { maxChunkSize, retry } = this.options;
        const chunkId = await this.locateChunkId(key);
        const chunk = index.chunks.find((chunk) => chunk.keys.length < maxChunkSize);
        await this.queue.wait();
        if (chunkId !== undefined) {
            const file = this.files[chunkId] ?? (this.files[chunkId] = new ChunkFile_1.ChunkFile({ directory: this.directory, id: chunkId, retry }));
            const data = (await file.fetch()) ?? {};
            Reflect.set(data, key, value);
            await file.save(data);
        }
        else if (chunk === undefined) {
            const chunkId = this.snowflake.generate().toString();
            index.chunks.push({ keys: [key], id: chunkId });
            await this.index.save(index);
            // @ts-expect-error 2345
            await (this.files[chunkId] = new ChunkFile_1.ChunkFile({ directory: this.directory, id: chunkId, retry })).save({ [key]: value });
        }
        else {
            for (const c of index.chunks)
                if (c.id === chunk.id)
                    c.keys.push(key);
            await this.index.save(index);
            const file = this.getChunkFile(chunk.id);
            const data = (await file.fetch()) ?? {};
            Reflect.set(data, key, value);
            await file.save(data);
        }
        this.queue.shift();
    }
    async delete(key) {
        const chunkId = await this.locateChunkId(key);
        if (chunkId === undefined)
            return false;
        const { retry } = this.options;
        const file = this.files[chunkId] ?? (this.files[chunkId] = new ChunkFile_1.ChunkFile({ directory: this.directory, id: chunkId, retry }));
        await this.queue.wait();
        const data = (await file.fetch()) ?? {};
        Reflect.deleteProperty(data, key);
        await file.save(data);
        const index = await this.index.fetch();
        for (const chunk of index.chunks)
            if (chunk.keys.some((k) => k === key))
                chunk.keys = chunk.keys.filter((k) => k !== key);
        await this.index.save(index);
        this.queue.shift();
        await this.cleanupEmptyChunks();
        return true;
    }
    async clear() {
        await this.queue.wait();
        const index = await this.index.fetch();
        const chunks = index.chunks.reduce((chunks, chunk) => [...chunks, chunk.id], []);
        const { retry } = this.options;
        for (const chunkId of chunks) {
            const file = this.files[chunkId] ?? (this.files[chunkId] = new ChunkFile_1.ChunkFile({ directory: this.directory, id: chunkId, retry }));
            if (file.exists)
                await file.delete();
            Reflect.deleteProperty(this.files, chunkId);
        }
        index.chunks = [];
        index.autoKeyCount = 0;
        await this.index.save(index);
        this.queue.shift();
    }
    async size() {
        await this.queue.wait();
        const index = await this.index.fetch();
        this.queue.shift();
        return index.chunks.reduce((size, chunk) => size + chunk.keys.length, 0);
    }
    async values() {
        await this.queue.wait();
        const index = await this.index.fetch();
        const values = [];
        for (const chunk of index.chunks) {
            const file = this.getChunkFile(chunk.id);
            const data = await file.fetch();
            if (data === undefined)
                continue;
            values.push(...Object.values(data));
        }
        this.queue.shift();
        return values;
    }
    async entries() {
        await this.queue.wait();
        const index = await this.index.fetch();
        const entries = [];
        for (const chunk of index.chunks) {
            const file = this.getChunkFile(chunk.id);
            const data = await file.fetch();
            if (data === undefined)
                continue;
            entries.push(...Object.entries(data));
        }
        this.queue.shift();
        return entries;
    }
    async keys() {
        await this.queue.wait();
        const index = await this.index.fetch();
        this.queue.shift();
        return index.chunks.reduce((keys, chunk) => [...keys, ...chunk.keys], []);
    }
    async locateChunkId(key) {
        await this.queue.wait();
        const index = await this.index.fetch();
        this.queue.shift();
        for (const chunk of index.chunks)
            if (chunk.keys.some((k) => k === key))
                return chunk.id;
        return undefined;
    }
    async cleanupEmptyChunks() {
        await this.queue.wait();
        const index = await this.index.fetch();
        for (const chunk of index.chunks.filter((chunk) => !chunk.keys.length)) {
            const file = this.getChunkFile(chunk.id);
            await file.delete();
            Reflect.deleteProperty(this.files, chunk.id);
        }
        this.queue.shift();
    }
    getChunkFile(chunkId) {
        const { retry } = this.options;
        return this.files[chunkId] ?? (this.files[chunkId] = new ChunkFile_1.ChunkFile({ directory: this.directory, id: chunkId, retry }));
    }
}
exports.ChunkHandler = ChunkHandler;
(function (ChunkHandler) {
    let Identifiers;
    (function (Identifiers) {
        Identifiers["PackageFileNotFound"] = "packageFileNotFound";
    })(Identifiers = ChunkHandler.Identifiers || (ChunkHandler.Identifiers = {}));
})(ChunkHandler = exports.ChunkHandler || (exports.ChunkHandler = {}));
//# sourceMappingURL=ChunkHandler.js.map