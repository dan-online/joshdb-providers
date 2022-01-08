import { AsyncQueue } from '@sapphire/async-queue';
import { Snowflake, TwitterSnowflake } from '@sapphire/snowflake';
import { ChunkFile } from './chunk-files/ChunkFile';
import { ChunkIndexFile } from './chunk-files/ChunkIndexFile';
import type { File } from './File';
export declare class ChunkHandler<StoredValue = unknown> {
    options: ChunkHandler.Options;
    snowflake: Snowflake | typeof TwitterSnowflake;
    directory: string;
    queue: AsyncQueue;
    index: ChunkIndexFile;
    files: Record<string, ChunkFile<StoredValue>>;
    constructor(options: ChunkHandler.Options);
    init(): Promise<this>;
    synchronize(): Promise<void>;
    has(key: string): Promise<boolean>;
    get(key: string): Promise<StoredValue | undefined>;
    set<Value = StoredValue>(key: string, value: Value): Promise<void>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    size(): Promise<number>;
    values(): Promise<StoredValue[]>;
    entries(): Promise<[string, StoredValue][]>;
    keys(): Promise<string[]>;
    private locateChunkId;
    private cleanupEmptyChunks;
    private getChunkFile;
}
export declare namespace ChunkHandler {
    interface Options {
        name: string;
        dataDirectoryName?: string;
        maxChunkSize: number;
        epoch?: number | bigint | Date;
        synchronize?: boolean;
        retry?: File.RetryOptions;
    }
    enum Identifiers {
        PackageFileNotFound = "packageFileNotFound"
    }
}
//# sourceMappingURL=ChunkHandler.d.ts.map