import type { StringArray } from '@joshdb/core';
import { File } from '../File';
import { ChunkLockFile } from './ChunkLockFile';
export declare class ChunkIndexFile extends File {
    lock: ChunkLockFile;
    constructor(options: ChunkIndexFile.Options);
    fetch(): Promise<ChunkIndexFile.Data>;
    save(data: ChunkIndexFile.Data): Promise<void>;
}
export declare namespace ChunkIndexFile {
    interface Options {
        directory: string;
        retry?: File.RetryOptions;
    }
    interface Data {
        chunks: Chunk[];
        autoKeyCount: number;
        name: string;
    }
    interface Chunk {
        keys: StringArray;
        id: string;
    }
}
//# sourceMappingURL=ChunkIndexFile.d.ts.map