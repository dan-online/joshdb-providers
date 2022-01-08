import { File } from '../File';
import { ChunkLockFile } from './ChunkLockFile';
export declare class ChunkFile<StoredValue = unknown> extends File<StoredValue> {
    lock: ChunkLockFile;
    constructor(options: ChunkFile.Options);
    fetch(): Promise<File.Data<StoredValue> | undefined>;
    save(data: File.Data<StoredValue>): Promise<void>;
}
export declare namespace ChunkFile {
    interface Options {
        directory: string;
        id: string;
        retry?: File.RetryOptions;
    }
}
//# sourceMappingURL=ChunkFile.d.ts.map