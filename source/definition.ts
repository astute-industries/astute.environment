
export type PACKAGE = {
    name:string,
    version:string,
    dependencies:{[key:string]:string},
    devDependencies:{[key:string]:string}
}