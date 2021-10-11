export declare const sLibraryRaw: import("jsonschema-definer").ObjectSchema<{
    type?: "character" | "vocabulary" | "sentence" | undefined;
    description?: string | undefined;
    tag?: string[] | undefined;
    createdAt?: string | Date | undefined;
    updatedAt?: string | Date | undefined;
    isShared?: boolean | undefined;
    title: string;
    id: string;
    entries: (string | {
        type?: "character" | "vocabulary" | "sentence" | undefined;
        reading?: string | string[] | undefined;
        english?: string | string[] | undefined;
        tag?: string[] | undefined;
        translation?: {
            [x: string]: string | string[];
        } | undefined;
        entry: string | string[];
    })[];
}, true>;
export declare const sLibrary: import("jsonschema-definer").ObjectSchema<{
    type: "character" | "vocabulary" | "sentence";
    title: string;
    description: string;
    id: string;
    tag: string[];
    createdAt: string;
    updatedAt: string;
    isShared: boolean;
    entries: {}[];
}, true>;
export declare function populate(filename: string): Promise<void>;
//# sourceMappingURL=library.d.ts.map