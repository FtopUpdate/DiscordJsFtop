const Discord = require('discord.js');
const fs = require('fs');
const config = require('./config.json');
const cron = require('node-cron');
const mongo = require('mongodb').MongoClient;
let url = process.env.MONGO_URL;

const bot = new Discord.Client({disableEveryone: true});

//Set bots activity to be the help command.
bot.on('ready', async () => {
    console.log("Bot loaded!");
    bot.user.setActivity(`v${config.version}`, {type:"PLAYING"}).catch(console.error);
    cron.schedule('0 * * * *', function(){
        sendFtopValues();
    });
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

let sendFtopValues = function(){

    bot.channels.forEach(server => {
        if(server.name === "ftopupdate"){

            let serverid = server.guild.id;
            
            mongo.connect(url, MongoOptions, function(err, db){

                if(err) throw err;
                let dbo = db.db("DiscordFtopBot");
                dbo.listCollections().toArray(function(err, col){
                    col.forEach(element => {
                        if(element.name === serverid){
                            serverColExists = true;
                        }
                    });
        
                    if(!serverColExists){
                        createCol();
                    }else{
                        getLastValues();
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
                        if(err) console.log("Something went wrong when getting last values.");
                        
                        let newObj = new Object();
                        let lastObj = res[0];
                        let semiLastObj = res[1];
        
                        newObj.sentBy = lastObj.sentBy;
                        newObj.timeSent = milisToDays(new Date().getTime() - lastObj.timeSent);
                        newObj.values = [];
        
                        for(let i in lastObj.values){
                            let facName = lastObj.values[i].split(" ")[1];
                            let found = false;
                            for(let j in semiLastObj.values){
                                let facName2 = semiLastObj.values[j].split(" ")[1];
                                if(facName === facName2){
                                    let val = (Number(lastObj.values[i].split(" ")[2] - Number(semiLastObj.values[j].split(" ")[2])));
                                    if(val >= 0){
                                        val = "(+$" + val.toLocaleString() + ")";
                                    }else{
                                        val = "(-$" + (val.toLocaleString() + '').substr(1) + ")";
                                    }
                                    found = true;
                                    newObj.values[i] = lastObj.values[i].split(" ")[0] + " " + facName  + " $" + (Number(lastObj.values[i].split(" ")[2])).toLocaleString() + " " + val;
                                }
                            }
                            if(!found){
                                newObj.values[i] = lastObj.values[i].split(" ")[0] + " " + facName  + " $" + (Number(lastObj.values[i].split(" ")[2])).toLocaleString();
                            }

                        }
        
                        let embed = new Discord.RichEmbed()
                            .setTitle("Factions Top")
                            .setColor(0x42f47d)
                            .addField("Time:", newObj.timeSent);
                        let str = "";
        
                        for(let value of newObj.values){
                            str += value + "\n";
                        }
                        if(!(str === "")){
                            embed.addField("Values:", str);
                            server.send(embed);
                            console.log("Sent embed to server; ", server.guild.name);
                        }
                    });
        
                    closeCon();
                }
            });
        }
    });

}

//Login the bot
bot.login(process.env.BOT_TOKEN);