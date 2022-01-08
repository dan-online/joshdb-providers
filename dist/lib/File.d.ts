import type { Awaitable } from '@sapphire/utilities';
export declare class File<StoredValue = unknown> {
    options: File.Options;
    path: string;
    constructor(options: File.Options);
    read<Data = File.Data<StoredValue>>(): Promise<Data>;
    write<Data = File.Data<StoredValue>>(data: Data): Promise<void>;
    copy(to: string): Promise<void>;
    rename(to: string): Promise<void>;
    delete(): Promise<void>;
    protected attempt<T = unknown>(callback: File.Callback<T>, retry?: File.RetryOptions): Promise<T>;
    get retryOptions(): File.RetryOptions;
    get exists(): boolean;
    static defaultRetryOptions: File.RetryOptions;
}
export declare namespace File {
    interface Options {
        directory: string;
        name: string;
        retry?: RetryOptions;
    }
    interface RetryOptions {
        delay: number;
        attempts: number;
    }
    type Callback<T> = () => Awaitable<T>;
    type Data<Value = unknown> = Record<string, Value>;
}
//# sourceMappingURL=File.d.ts.map