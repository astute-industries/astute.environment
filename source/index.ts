#!/usr/bin/env node

import fetch, { Headers } from "node-fetch"
import path from "path"
import fs from "fs"
import os from "os"
import {spawn} from "child_process"

type ValidCommand = typeof VALID_COMMAND[number]

type CONFIG ={
    token: string,
    host:string,
    owner:string,
    repo:string,
    tag:string
    argv:string[],
    command:ValidCommand
    clean?:boolean
    all?:boolean
}
type ASSETINFO =  {releaseName:string, downLoad:string, assetName:string}

type ARGUMENT = {
    name:string,
    argv?:string|[string]
    desc?:string,
    alias?:string,
    defaultValue?:string,
    field?:keyof CONFIG;
}

function cmd(c:string){
    return (os.platform()==="win32")?`${c}.cmd`:c;
}
const [,,...argv]=process.argv;
const VALID_COMMAND = ["install","list","help"] as const;


var argu:Partial<{[key in ValidCommand]: ARGUMENT[]}>={};

argu["install"] =[
    {name:"-token",alias:"-t", desc:"Github Personal acess token",argv:"PST TToken", defaultValue:process.env.ASTUTE_TOKEN,field:"token" },
    {name:"-owner",alias:"-o", desc:"Asset repository's organization",argv:"organization name", defaultValue:"astute-industries",field:"owner"},
    {name:"-repo",alias:"-r", desc:"Asset repository",argv:"repository name", defaultValue:"astute.rmf.sdks",field:"repo"},
    {name:"-tag",alias:"-t", desc:"Asset Deployment name",argv:"deployment name", defaultValue:"development-build",field:"tag"},
    {name:"-clean",alias:"-c",desc:"remove all download upon installation complete",defaultValue:"false",field:"clean"},
    {name:"", desc:"list of asset to be installed", argv:["asset name to be deployed"],field:"argv"},
    {name:"-help",alias:"-h",desc:"Showing help"}
]
argu["list"] = [
    {name:"-token",alias:"-t", desc:"Github Personal acess token",argv:["PST TToken"], defaultValue:process.env.ASTUTE_TOKEN,field:"token"},
    {name:"-owner",alias:"-o", desc:"Asset repository's organization",argv:["organization name"], defaultValue:"astute-industries",field:"owner"},
    {name:"-repo",alias:"-r", desc:"Asset repository",argv:["repository name"], defaultValue:"astute.rmf.sdks",field:"repo"},
    {name:"-tag",alias:"-t", desc:"Asset Deployment name",argv:["deployment name"], defaultValue:"development-build",field:"tag"},
    {name:"-all",alias:"-a",desc:"show from all repo",field:"all", defaultValue:"false"},
    {name:"-help",alias:"-h",desc:"Showing help"}
]
argu["help"] = []

const dict:{[key:string]:string} = {
    "astute.database":"astute.open.database|astute.ext.database",
    "astute.stream"  :"astute.open.stream|astute.ext.stream",
    "astute.service" :"astute.open.service|astute.ext.service",
    "astute.security":"astute.rmf.security",
    "":"astute.rmf.sdks"
}

function getRepo(prefix:string){
    const key = Object.keys(dict).filter(x=>prefix.startsWith(x+"."))[0];
    return dict[key] || dict[""];
}

function getConfiguration(...argv:string[]):CONFIG|null{
    var argvStart = 0;
    var command:ValidCommand = "help"
    switch((argv?.[0]||"").toLowerCase()){
        case "list": argvStart = 1;command = "list";break;
        case "install": argvStart = 1;command = "install";break;
        default:
            console.log("Astute Environment Setup");
            console.log("npm exec setup -- [ "+ Object.keys(argu).join(" | ")+" ]" );
            return null;
    }
    if(argvStart)argv=argv.slice(1);
    const action = argu[command]||[];
    const help  = action.filter(x=>x.alias==="-h")||[];
    if(help.length){
        if(argv[0]===help[0].name || (argv[0]||"")===help[0].alias){
            console.log("Astute Environment Setup");
            const arr = action.reduce((p,c)=>Math.max(10,c.name.length,(c.alias||"").length),0 )+4;
            const withArgu = action.filter(x=>x.argv?.length && x.name.length);
            const noArgu = action.filter(x=>!x.argv?.length);

            const cmd1 = noArgu.map(a=>a.alias?`${a.name} | ${a.alias}`:a.name).join(" | ");
            const cmd2 = withArgu.map(a=>"[ ( "+(a.alias?`${a.name} | ${a.alias}`:a.name)+")"+` ${a.name.substring(1)}.inst ]`).join(" | ");
            const cmd3 = action.filter(x=>x.argv?.length && x.name==="")[0]
            console.log("npm exec setup -- "+command + " [ "+ [cmd1,cmd2,...(cmd3?[`...inst`]:[])].join(" | ")+  " ]" );

            action.forEach(x=>{
                var keyy = ("  "+x.name);
                if(x.name.length===0)return;
                if(x.alias){
                    console.log(keyy.padStart(arr)+" : "+(x.desc||"-"));
                    keyy = x.alias.padStart(arr," ");
                }
                console.log(keyy.padStart(arr)+" : "+(x.desc||"-"));
                if(x.argv?.length){
                    const cmt = Array.isArray(x.argv)?x.argv[0]:x.argv;
                    console.log(`${x.name.substring(1)}.inst`.padStart(arr)+" : "+cmt);
                }
                
            })
            if(cmd3){
                console.log("  ...instance  : "+cmd3.desc||"-")
            }
                
            return null;
        }
    }
    argvStart = 0;

    
    var cfg:CONFIG = {
        token:  "",
        host:"https://api.github.com",
        owner:"astute-industries",
        repo:"astute.rmf.sdks",
        tag:"development-build",
        argv: argv,clean:false,all:false,
        command
    }
    const lw = argv.map(x=>x.toLowerCase());
    const err = (action.reduce((p:string[],c)=>{
        if(c.field && !c.defaultValue && c.name.length){
            const msg = lw.indexOf(c.name.toLowerCase())>=0 || (!!c.alias && lw.indexOf(c.alias.toLowerCase())>=0 );
            if(!msg)p.push(c.name+ " is not provided");
        }
        return p;
    },[]));
    if(err.length){
        err.forEach(x=>{
            console.error(x);
        })
        process.exit(1);
    }
    
    cfg = argv.reduce((p,c,i, all)=>{
        var x =action.filter(k=>k.name.toLowerCase()===c.toLowerCase() || k.alias?.toLowerCase()===c.toLowerCase() )[0];
        if(x===null || !x?.name?.length){
            
            return p;
        }
        argvStart = i+1;
        
        if(x.field==="clean" || x.field==="all"){
            console.log("................",x.field);
            p[x.field] = true;
            return p;
        }
        var txt = all[i+1];
        if(txt===undefined){
            if(x.argv?.length){
                throw Error("default value not found");
            }
            return p;
        }
        if(x.field==="argv" || x.field==="command" || x.field===undefined){
            return p;
        }
        if(x.argv?.length)argvStart = i+2;
        const m = x.field;

        p[m]=txt;
        return p;
    },cfg);
    var p = argv.slice(argvStart);
    cfg.argv = p;
    return cfg;

}
const config = getConfiguration(...argv);
if(config===null)process.exit(0);
function getAssetList(config:CONFIG,repo?:string):Promise<{[key:string]:ASSETINFO}>{
    const actualRepo = (repo||config.repo).split("|");
    if(actualRepo.length!==1){
        return actualRepo.map(x=>()=>new Promise<{[key:string]:ASSETINFO}>(res=>{
            getAssetList(config,x ).then(ret=>{
                res(ret);
            }).catch(()=>res({}));
        })).reduce((p:Promise<{[key:string]:ASSETINFO}>,c)=>new Promise(res=>{
            p.then(a=>{
                c().then(e=>res(Object.assign(a,e)));
            })
            return p;
        }),Promise.resolve({}));
    }
    return new Promise((res,rej)=>{
        const  h = new Headers({
            accept:"application/vnd.github+json", "X-GitHub-Api-Version":"2022-11-28",
            'Authorization': `Bearer ${config.token}`
        });
        const url = `${config.host}/repos/${config.owner}/${actualRepo[0]}/releases?sort=updated&direction=desc`;
        fetch(url,{ headers: h, method:"get"}).then(r=>{
            if(Math.floor(r.status/100)===4){
                if(r.status===404)return rej("not found");
                return rej("not authorized");
            }
            r.json().then((e:any[])=>{
                var t=e.filter(x=>x.tag_name===config.tag).reduce((p:{[key:string]:{releaseName:string, downLoad:string, assetName:string}},c)=>{
                    var m :{name:string, url:string}[] = c.assets||[];
                    p = m.reduce((x,y)=>{
                        if(x[y.name])return x;
                        x[y.name.toLowerCase()] = {
                            releaseName:c.name, downLoad:y.url, assetName:y.name
                        }
                        return x;
                    },p)
                    return p;
                },{});
                res(t);
            });
        });
    });
}
function spawnProcess(command:string[], config?:{cwd?:string}){
    return new Promise<void>((res,rej)=>{
        const action = command.splice(0,1);
        const npm = spawn(action[0],command);
        console.log("executing ",action, command)
        npm.stderr.on("data",(m=>{
            console.log(m.toString());
        }))
        npm.on("close",(code)=>{
            console.log("EXIT CODE = "+code);
            if(code)return rej(code);
            res();
        })
    });
}
function getAsset(config:CONFIG,meta: ASSETINFO){
    const h = new Headers({
        accept:"application/octet-stream", "X-GitHub-Api-Version":"2022-11-28",
        'Authorization': `Bearer ${config.token}`,"content-type":"application/json"
    });
    return new Promise<string>((res,rej)=>{
        fetch(meta.downLoad,{headers:h,method:"get"}).then(x=>{
            if(Math.floor(x.status/100)!==2)return rej("error downloading");
            console.log("SYTATUS",x.status)
            x.arrayBuffer().then(k=>{
                if(!k?.byteLength)return rej("unable to download")
                fs.mkdir("release",{recursive:true},()=>{
                    console.log("installing ",meta.assetName);
                    if(meta.assetName.endsWith(".dev.tgz")){
                        meta.assetName = meta.assetName.substring(0,meta.assetName.length-8)+".tgz";
                    }
                    fs.writeFile(path.join(".","release",meta.assetName),Buffer.from(k),(err)=>{
                        err && rej(err);
                        res(path.resolve(".","release",meta.assetName));
                    })
                });
            }).catch(rej);
        });
    });
}

function processArgv(config:CONFIG|null){
    if(config===null)return;
    switch(config.command){
        case "list":return (config.all? Object.values(dict) : [config.repo]).map(x=>()=>new Promise<{[key:string]:ASSETINFO}>(res=>{
            getAssetList(config,x).then(resp=>{
                res(resp);
            }).catch(()=>res({}));
        })).reduce((p:Promise<{[key:string]:ASSETINFO}>,c)=>{
            return new Promise(r=>{
                p.then(a=>{
                    c().then(x=>r(Object.assign(a,x)));
                })
            });
        },Promise.resolve({})).then(cfg=>{
            console.log(Object.values(cfg));
        });
        case "install":getAssetList(config).then(resp=>{
            const func : ((argv:[x:string,y:ASSETINFO] )=>boolean)|null = 
                config.argv.find(x=>x==="?dev") ?  (argv)=>argv[0].endsWith(".dev.tgz")  : (config.argv.find(x=>x==="?prod")?(argv)=>argv[0].endsWith(".tgz") && !argv[0].endsWith(".dev.tgz") : null  );
            var rep =  Object.entries(resp);
            var pro=Promise.resolve();
            if(func!==null){
                rep = rep.filter(func);
            }else{
                const repo = Object.keys((config.argv||[]).map(x=>getRepo(x)).reduce((p:{[ket:string]:number},c)=>{
                    if(c===config.repo)return p;
                    p[c]=(p[c]||0)+1;
                    return p;
                },{}));
                pro = new Promise<void>(res=>{ repo.map(a=>()=>new Promise<void>(res=>{
                        getAssetList(config,a).then(o=>{
                            resp = Object.assign(resp,o);
                            res();
                        }).catch(res);
                    })).reduce((p,c)=>new Promise<void>(Res=>{
                        p.finally(()=>{
                            c().finally(Res);
                        })
                    }),Promise.resolve()).finally(()=>{
                        rep = Object.entries(resp).filter(x=>config.argv.indexOf(x[0])>=0);
                        res();
                    })
                });
            }
            pro.finally(()=>{
                if(rep.length===0){
                    console.log("Available asset");
                    console.log(["?dev","?prod",...Object.keys(resp)].join(", "));
                    return;
                }
                const seq = rep.map(x=>()=>new Promise<string>(rr=>{
                    getAsset(config,x[1]).then(lib=>{
                        rr(lib);
                    })
                }))
                seq.reduce((p:Promise<string[]>,c)=>new Promise((res,j)=>{
                    p.then((d)=>{
                        c().then(a=>{
                            d.push(a);
                            res(d);
                        }).catch(j); 
                    }).catch(j)
                }),Promise.resolve([])).then((libs)=>{
                    libs.map(lib=>()=>new Promise<void>(res=>{
                        spawnProcess([cmd("npm"),"install",lib]).finally(res);
                    })).reduce((p,c)=>new Promise<void>((x)=>{
                        p.finally(()=>{
                            c().finally(x);
                        })
                    }),Promise.resolve()).finally(()=>{
                        if(config.clean){
                            console.log("cleaning up")
                            return fs.rm("./release",{recursive:true},()=>{
                                console.log("installed");
                            })
                        }
                        console.log("installed");
                    });
                })
            });
        })
    }
}
try{
    processArgv(getConfiguration(...argv));
}catch(ex){

}
