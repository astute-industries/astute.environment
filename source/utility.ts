import {spawn} from "child_process"
import os from "os"
import path from "path"
import fs from "fs";


export function spawnProcess(command:string[], config?:{cwd?:string}){
    return new Promise<number>((res)=>{
        const action = command.splice(0,1);
        const env = {cwd:config?.cwd, env:process.env};
        const npm = os.platform()==="win32"?spawn("cmd.exe",["/c",...command],env)
            : spawn(command[0],command.slice(1),env);
        console.log("executing ",action, command)
        npm.stderr.on("data",(m=>{
            console.log(m.toString());
        }))
        npm.on("close",(code)=>{
            console.log("EXIT CODE = "+code);
            res(code||-1);
        })
    });
}
export function copyFolder(root:string,target:string,rel:string){
    return new Promise<void>(Res=>{
        const ori =rel.length? path.join(root,rel):root;
        const tar =rel.length? path.join(target,rel):target;
        fs.stat(ori,(err, stat)=>{
            if(stat.isDirectory()){
                return fs.readdir(ori,(err, dir)=>{
                    if(dir.length===0)return Res();
                    return fs.mkdir(tar,{recursive:true},()=>{
                        Promise.all(dir.map(x=>new Promise<void>(res=>{
                            copyFolder(root,target,path.join(rel,x)).finally(res);
                        }))).finally(Res);
                    })
                });
            };
            if(stat.isFile()){
                return fs.copyFile(ori,tar,()=>{
                    Res();
                })
            }
            Res();
        })
    })
}