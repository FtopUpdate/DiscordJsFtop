const Discord = require('discord.js');
const fs = require('fs');
const config = require('./config.json');
const cron = require('node-cron');
const mongo = require('mongodb').MongoClient;
if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}
let url = process.env.MONGO_URL;

const bot = new Discord.Client({disableEveryone: true});
let ownerId;

//Set bots activity to be the help command.
bot.on('ready', async () => {
    console.log("Bot loaded!");
    getOwnerId();
    bot.user.setActivity(`v${config.version}`, {type:"PLAYING"}).catch(console.error);
    cron.schedule('0 * * * *', function(){
        sendFtopValues();
    });
});

bot.on('message', async msg => {
    let msgaut = msg.author.username + "#" + msg.author.discriminator;
    if(!msg.channel.name === config.channelName){
        return;
    }
    if((msgaut === config.owner)){
        let args = msg.content.slice(config.prefix.length).trim().split(/ +/g);
        let command = args.shift().toLowerCase();

        if(command === "forceftop"){
            console.log("Forcing ftop.");
            msg.delete();
            sendFtopValues();
        }
    }

});

let milisToDays = function (ms) {

    days = Math.floor(ms / (24 * 60 * 60 * 1000));
    daysms = ms % (24 * 60 * 60 * 1000);
    hours = Math.floor((daysms) / (60 * 60 * 1000));
    hoursms = ms % (60 * 60 * 1000);
    minutes = Math.floor((hoursms) / (60 * 1000));
    minutesms = ms % (60 * 1000);
    sec = Math.floor((minutesms) / (1000));
    return days + " days " + hours + " hours " + minutes + " minutes " + sec + " seconds ago.";

}

let MongoOptions = {
    useNewUrlParser: true
};

let getOwnerId = function(){
    let botusers = bot.users;
    let ownerUsername = config.owner.split("#")[0];
    let ownerDisc = config.owner.split("#")[1];
    botusers.forEach(user => {
        if(user.username === ownerUsername && user.discriminator == ownerDisc){
            ownerId = user.id;
        }
    });
}

//Start sendInfoMsgToOwner
let sendInfoMsgToOwner = function(message){
    let ownerUser = bot.users.get(ownerId);
    ownerUser.send(ownerUser + " : " + message);
}
//End sendInfoMsgToOwner

//start sendFtopValues
let sendFtopValues = function(){

    //start bot.channels.foreach
    try {
        bot.channels.forEach(server => {
            if(server.name === "facinfo"){
    
                let serverid = server.guild.id;
                
                mongo.connect(url, MongoOptions, function(err, db){
    
                    if(err) throw err;
                    let dbo = db.db("DiscordFtopBot");
                    let serverColExists = false;
                    dbo.listCollections().toArray(function(err, col){
                        let elCount = 0;
                        col.forEach(element => {
                            elCount++;
                            if(element.name === serverid){
                                serverColExists = true;
                            }
                        });
                        if(elCount >= col.length){
                            if(!serverColExists){
                                createCol();
                            }else{
                                getLastValues();
                            }  
                        }
                    });
                    let createCol = function(){
                        dbo.createCollection(serverid, function(error, result){
                            if(error) console.log("Something went wrong when creating a collection.");
                        });
                        addInfoDoc();
                    }
                    let addInfoDoc = function(){
                        dbo.collection(serverid).insertOne({_id: "info", guildName: server.name, authorisedUsers: ["Nukeᶦᵗ#2745"]}, function(error2, res){
                            if(error2) console.log("Something went wrong when creating a document.");
                        });
                        closeCon();
                    }
    
                    let closeCon = function(){
                        db.close();
                    }
    
                    let getLastValues = function(){
                        dbo.collection(serverid).find({}).sort({"timeSent" : -1}).toArray(function(err, res){
                            if(err) throw err;
                            
                            let newObj = new Object();
                            let lastObj = res[0];
                            let semilastObj = res[1];
            
                            newObj.sentBy = lastObj.sentBy;
                            newObj.timeSent = milisToDays(new Date().getTime() - lastObj.timeSent);
                            newObj.values = [];
            
                            for(let i in lastObj.ftop){
                                let facName = lastObj.ftop[i].split(" ")[1];
                                let found = false;
                                for(let j in semilastObj.ftop){
                                    let facName2 = semilastObj.ftop[j].split(" ")[1];
                                    if(facName === facName2){
                                        let val = (Number(lastObj.ftop[i].split(" ")[2] - Number(semilastObj.ftop[j].split(" ")[2])));
                                        if(val >= 0){
                                            val = "(+$" + val.toLocaleString() + ")";
                                        }else{
                                            val = "(-$" + (val.toLocaleString() + '').substr(1) + ")";
                                        }
                                        found = true;
                                        newObj.values[i] = lastObj.ftop[i].split(" ")[0] + " " + facName  + " $" + (Number(lastObj.ftop[i].split(" ")[2])).toLocaleString() + " " + val;
                                    }
                                }
                                if(!found){
                                    newObj.values[i] = lastObj.ftop[i].split(" ")[0] + " " + facName  + " $" + (Number(lastObj.ftop[i].split(" ")[2])).toLocaleString();
                                }
    
                            }
            
                            let embed = new Discord.RichEmbed()
                                .setTitle("Factions")
                                .setColor(0x42f47d)
                                .addField("Time:", newObj.timeSent);
                            let str = "";
            
                            for(let value of newObj.values){
                                str += value + "\n";
                            }
                           

                            if(!(str === "")){
                                embed.addField("F top:", str);
                            }

                            let flistStr = "";
                            if(lastObj.flist !== null && lastObj.flist !== undefined){
                                for(let value of lastObj.flist){
                                    flistStr += value + "\n";
                                }
                                embed.addField("F list:", flistStr);
                                server.send(embed);
                                console.log("Sent embed to server; ", server.guild.name);
                            }

                            let timeDiff = new Date().getTime() - lastObj.timeSent;
                            if(timeDiff > 5400000){
                                console.log("sent msg to owner -> timeDiff:", timeDiff);
                                sendInfoMsgToOwner("Bot sent info that was updated " + milisToDays(timeDiff) + " Discord Guild Name: " + server.guild.name);
                            }
    
                            closeCon();
                        });
            
                        
                    }
                });
            }
        });//end bot.channels.foreach
    } catch (err) {
        console.log("ERRORRRR");
        console.log(err);
    }


}//end SendFtopValues

//Login the bot
bot.login(process.env.BOT_TOKEN);