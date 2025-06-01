#!/usr/bin/env node

import fs from "fs"
import { PACKAGE } from "./definition"
import { randomUUID } from "crypto";
import { copyFolder } from "./utility";
import path from "path";
import { exec } from "child_process";



function prepareFolder():Promise<{pkg:PACKAGE,temp:string}>{
    return new Promise(res=>{
        fs.readFile("package.json",{encoding:"utf-8"},(err, data)=>{
            const pkg:PACKAGE = JSON.parse(data);
            const temporary = `${new Date().getTime()}-${randomUUID().toString()}`.substring(0,10)
            fs.readdir(".",(err, data)=>{
                fs.mkdir(temporary,()=>{
                    Promise.all(data.map(x=>copyFolder(".",temporary,x))).then(()=>{
                        res({pkg, temp:temporary});
                    })
                });
            });
        })
    });
}
function compile(temp:string, currentPkg:PACKAGE){
    console.log("NC",temp)
    currentPkg.dependencies =  Object.entries(currentPkg.dependencies).reduce((p,c)=>{
        if(c[1].startsWith("file:../")){
            p[c[0]]="file:./"+c[1].substring(8)+".tgz";
        }
        return p;
    },currentPkg.dependencies);
    const fn = currentPkg.name+"-"+currentPkg.version;
    console.log("cur",path.resolve(path.join(temp,fn+".tgz")),"\ntar\n",path.resolve(path.join("release",currentPkg.name+".dev.tgz")));
    const cur=process.cwd();
    return new Promise<void>(Res=>{
        fs.writeFile(path.join(temp,"package.json"),JSON.stringify(currentPkg,undefined,"  "),{encoding:"utf-8"},()=>{
            const promises = [
                new Promise<any>(res=>fs.rm(path.join(temp,"source"),{recursive:true, force:true},res)),
                copyFolder(path.join(temp,"types"),path.join(temp,"source"),""),
                new Promise<any>(res=>exec("npm pack",{cwd:temp},res)),
                new Promise<any>(res=>fs.mkdir("release",res)),
                new Promise<any>(res=>fs.rename(path.join(temp,fn+".tgz"),path.join("release",currentPkg.name+".dev.tgz"), res)),
                new Promise<any>(res=>fs.rm(path.join(temp,"source"),{recursive:true, force:true},res)),
                new Promise<any>(res=>exec("npm pack",{cwd:temp},res)),
                new Promise<any>(res=>fs.rename(path.join(temp,fn+".tgz"),path.join("release",currentPkg.name+".tgz"),res)),
                new Promise<any>(res=>fs.rm(temp,{recursive:true, force:true},res)),
            ]
            promises.map(x=>()=>x).reduce((p:Promise<void>,c)=>new Promise(res=>{
                p.finally(()=>{
                    c().then((err)=>{
                        err && console.log(">>>>>>>>",err);
                        res();
                    });
                })
            }),Promise.resolve()).finally(Res);
        })
    })
}

prepareFolder().then(pkg=>{
    compile(pkg.temp,pkg.pkg).finally(()=>{
        console.log("done")
    })
})