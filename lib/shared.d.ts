export declare function absPath(...fileparts: string[]): string;
export declare function ensureDir(dirname: string): string | null;
export declare function ensureDirForFilename(filename: string): string | null;
export declare const sType: import("jsonschema-definer").BaseSchema<"character" | "vocabulary" | "sentence", true, Readonly<import("jsonschema-definer/dist/base").BaseJsonSchema>>;
export declare const sEntry: import("jsonschema-definer").ObjectSchema<{
    frequency?: number | undefined;
    level?: number | undefined;
    type: "character" | "vocabulary" | "sentence";
    entry: string[];
    reading: string[];
    english: string[];
    tag: string[];
    hLevel: number;
}, true>;
export declare const sHan: import("jsonschema-definer").StringSchema<string, true>;
export declare const sRadical: import("jsonschema-definer").ObjectSchema<{
    entry: string;
    sub: string[];
    sup: string[];
    var: string[];
}, true>;
export declare const ROOTDIR: string;
export declare function runMain<T = any>(main: () => Promise<T>): Promise<T | null>;
//# sourceMappingURL=shared.d.ts.map