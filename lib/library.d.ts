export declare const sLibraryRaw: import("jsonschema-definer").ObjectSchema<{
    type?: "character" | "vocabulary" | "sentence" | undefined;
    description?: string | undefined;
    tag?: string[] | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    isShared?: boolean | undefined;
    title: string;
    id: string;
    entries: (string | {
        type: "character" | "vocabulary" | "sentence";
        entry: string | string[];
        reading: string | string[];
        english: string | string[];
        tag: string[];
        translation: {
            [x: string]: string | string[];
        };
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