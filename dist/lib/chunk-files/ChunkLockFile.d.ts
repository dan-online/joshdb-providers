import { File } from '../File';
export declare class ChunkLockFile<StoredValue = unknown> extends File<StoredValue> {
    constructor(options: ChunkLockFile.Options);
}
export declare namespace ChunkLockFile {
    interface Options {
        directory: string;
        id: string;
        retry?: File.RetryOptions;
    }
}
//# sourceMappingURL=ChunkLockFile.d.ts.map