
export type PACKAGE = {
    name:string,
    version:string,
    dependencies:{[key:string]:string},
    devDependencies:{[key:string]:string}
}
export type ARGUMENT<T> = {
    name:string,
    argv?:string|[string]
    desc?:string,
    alias?:string,
    defaultValue?:string,
    field?:keyof T;
}

export type BASE_CONFIG<CMD extends string | "help">  = {[key:string]:string[]|string|boolean|CMD} 
    