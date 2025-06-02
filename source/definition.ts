
export type PACKAGE = {
    name:string,
    version:string,
    dependencies?:{[key:string]:string},
    devDependencies?:{[key:string]:string},
    peerDependencies?:{[key:string]:string}
}
export type ARGUMENT<T> = {
    name:string,
    argv?:string|[string]
    desc?:string,
    alias?:string,
    defaultValue?:string,
    field?:keyof T;
}

export type BASE_CONFIG<CMD extends string | "help", STR extends string, BOOL extends string >  = //{[key:string]:string[]|string|boolean|CMD} 
     {argv:string[]} & {command:CMD} & {[key in  STR ]:string} & {[key in BOOL]:boolean}
    