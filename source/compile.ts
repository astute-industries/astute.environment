#!/usr/bin/env node

import fs from "fs"
import { ARGUMENT, BASE_CONFIG, PACKAGE } from "./definition"
import { randomUUID } from "crypto";
import { copyFolder, getConfiguration } from "./utility";
import path from "path";
import { exec } from "child_process";


const VALID_COMMAND = ["compile","help"] as const;
type ValidCommand = typeof VALID_COMMAND[number]


type STR_PROP = "output"
type BOOL_PROP="source"

interface CONFIG extends BASE_CONFIG<ValidCommand,STR_PROP,BOOL_PROP>{}
const allAction:Partial<{[key in ValidCommand]: ARGUMENT<CONFIG>[]}>={};

allAction["compile"] = [
    {name:"-output",alias:"-o", desc:"Release folder",argv:"release folder", defaultValue:"../release",field:"output"},
    {name:"-source",alias:"-s", desc:"Asset repository", defaultValue:"astute.rmf.sdks",field:"source"},
    {name:"-help",alias:"-h",desc:"Showing help"}
]
allAction["help"] = []

const argv = process.argv.slice(2);
    
const cmd = argv.splice(0,1)[0];
var aCommand = cmd ? VALID_COMMAND.reduce((p,c)=>{
    if(cmd.toLowerCase()===c.toLowerCase())p=c;
    return p;
},"compile"):"compile";


const defConfig:CONFIG ={
    argv:argv,
    command:aCommand||VALID_COMMAND[VALID_COMMAND.length-1],
    output:"",
    source:false
}

const config = getConfiguration<ValidCommand,STR_PROP,BOOL_PROP,CONFIG>(aCommand,allAction,defConfig);

function prepareFolder():Promise<{pkg:PACKAGE,temp:string}>{
    return new Promise(res=>{
        fs.readFile("package.json",{encoding:"utf-8"},(err, data)=>{
            const pkg:PACKAGE = JSON.parse(data);
            const temporary = `${new Date().getTime()}-${randomUUID().toString()}`.substring(0,10)
            fs.readdir(".",(err, data)=>{
                fs.mkdir(temporary,()=>{

                    (data.map(x=>()=>copyFolder(x,path.join(temporary,x),""))).reduce((p:Promise<void>,c)=>new Promise(res=>{
                        p.finally(()=>{
                            c().finally(res);
                        })
                    }),Promise.resolve()).finally(()=>{
                        res({pkg,temp:temporary});
                    });
                });
            });
        })
    });
}
function compile(temp:string, currentPkg:PACKAGE){
    
    const BASE = config?.output||"../release";
    console.log("NC",temp)
    currentPkg.dependencies = currentPkg.dependencies||{};
    currentPkg.dependencies =  Object.entries(currentPkg.dependencies).reduce((p,c)=>{
        if(c[1].startsWith("file:../")){
            p[c[0]]="file:./"+c[1].substring(8)+".tgz";
        }
        return p;
    },currentPkg.dependencies);
    const fn = currentPkg.name+"-"+currentPkg.version;
    const cur=process.cwd();
    return new Promise<void>(Res=>{
        fs.mkdir(BASE,()=>{
            fs.rm(path.join(temp,".github"),{recursive:true},()=>{
                fs.writeFile(path.join(temp,"package.json"),JSON.stringify(currentPkg,undefined,"  "),{encoding:"utf-8"},()=>{
                    const callback = config?.source?(cb:()=>void)=>{
                        fs.rm(path.join(temp,"types"),{recursive:true},()=>{
                            exec("npm pack",{cwd:temp},()=>{
                                fs.rename(path.join(temp,fn+".tgz"),path.join( BASE, currentPkg.name+".dev.tgz"),()=>{
                                    cb();
                                });
                            })
                        });
                    }:(cb:()=>void)=>{
                        fs.rm(path.join(temp,"source"),{recursive:true},()=>{
                            fs.rename(path.join(temp,"types"),path.join(temp,"source"),()=>{
                                exec("npm pack",{cwd:temp},()=>{
                                    fs.rename(path.join(temp,fn+".tgz"),path.join( BASE, currentPkg.name+".dev.tgz"),()=>{
                                        cb();
                                    });
                                })
                            });
                        });
                    }
                    callback(()=>{
                        fs.rm(path.join(temp,"source"),{recursive:true},()=>{
                            exec('npm pack', {cwd:temp},()=>{
                                fs.copyFile(path.join(temp,fn+".tgz") ,path.join(BASE,currentPkg.name+".tgz"),()=>{
                                    fs.rm(temp,{recursive:true},()=>{
                                        Res();
                                    })
                                });
                            });
                        });
                    });
                })
            });
           
        })
    })
}

prepareFolder().then(pkg=>{
    compile(pkg.temp,pkg.pkg).finally(()=>{
        console.log("done")
    })
})