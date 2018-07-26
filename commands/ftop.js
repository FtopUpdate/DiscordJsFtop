const discordjs = require('discord.js');
const fs = require('fs');
const config = require('../config.json');
const mongo = require('mongodb').MongoClient;
let url = process.env.MONGO_URL;

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

module.exports.run = async (bot, msg, args) => {  

    var MongoOptions = {
        useNewUrlParser: true
    };

    mongo.connect(url, MongoOptions, function(err, db){

        if(err) throw err;
        let dbo = db.db("DiscordFtopBot");

        let serverColExists = false;

        dbo.listCollections().toArray(function(err, col){
            col.forEach(element => {
                if(element.name === msg.guild.id){
                    serverColExists = true;
                }
            });

            if(!serverColExists){
                createCol();
            }else{
                isAuthorized();
            }                
            
        });

        let createCol = function(){
            dbo.createCollection(msg.guild.id, function(error, result){
                if(error) console.log("Something went wrong when creating a collection.");
				msg.channel.send("Succesfully added a config file for this server.").then(msg => msg.delete(3000));
            });
            addInfoDoc();
        }

        let addInfoDoc = function(){
            dbo.collection(msg.guild.id).insertOne({_id: "info", guildName: msg.guild.name, authorisedUsers: ["Nukeᶦᵗ#2745"]}, function(error2, res){
                if(error2) console.log("Something went wrong when creating a document.");
            });

            closeCon();
        }

        let isAuthorized = function(){
            let authUsers = [];
            dbo.collection(msg.guild.id).findOne({_id: "info"}, function(err, res){
                if(err) console.log("Something went wrong when getting info doc.");
                authUsers = res.authorisedUsers;
                let curUser = msg.author.username + "#" + msg.author.discriminator;
                if(authUsers.includes(curUser)){
                    checkGoal();
                }else{
                    msg.channel.send("You are not authorized to use this command.").then(msg => msg.delete(3000));
                    closeCon();
                }
            });

        }

        let checkGoal = function(){

            if(args.length <= 0){
                let value = dbo.collection(msg.guild.id).countDocuments().then(result => {
                    if(result >= 3){
                        getLastValues();
                    }else{
                        msg.channel.send("Not enough data yet.").then(msg => msg.delete(3000));
                        return;
                    }
                });
            }else{
                let arg = (args.join(" ") + '').split("\n");
                if(arg.length < 9){
                    msg.channel.send("Invalid input.").then(msg => msg.delete(3000));
                    return;
                }
                let validBool = true;
                let regex1 = new RegExp(/^[\d{1,2}]{1,2}./);
                let regex2 = new RegExp(/[a-zA-Z0-9]{3,16}/i);
                let regex3 = new RegExp(/\$[0-9]{1,3}.+/);
                for(let i in arg){
                    let current = arg[i].split(" ");
                    if(!regex1.test(current[0])){
                        validBool = false;
                    }
                    if(!regex2.test(current[1])){
                        validBool = false;
                    }
                    if(!regex3.test(current[2])){
                        validBool = false;
                    }
                }
                if(!validBool){
                    msg.channel.send("Invalid input.").then(msg => msg.delete(3000));
                    return;
                }
                
                addNewValues();
            }
        }

        let getLastValues = function(){

            dbo.collection(msg.guild.id).find({}).sort({"timeSent" : -1}).toArray(function(err, res){
                if(err) console.log("Somethign went wrong when getting last values.");
                
                let newObj = new Object();
                let lastObj = res[0];
                let semiLastObj = res[1];

                newObj.sentBy = lastObj.sentBy;
                newObj.timeSent = milisToDays(new Date().getTime() - lastObj.timeSent);
                newObj.values = [];

                for(let i in lastObj.values){
                    let facName = lastObj.values[i].split(" ")[1];
                    for(let j in semiLastObj.values){
                        let facName2 = semiLastObj.values[j].split(" ")[1];
                        if(facName === facName2){
                            let val = (Number(lastObj.values[i].split(" ")[2] - Number(semiLastObj.values[j].split(" ")[2])));
                            if(val >= 0){
                                val = "(+$" + val.toLocaleString() + ")";
                            }else{
                                val = "(-$" + (val.toLocaleString() + '').substr(1) + ")";
                            }
                            newObj.values[i] = lastObj.values[i].split(" ")[0] + " " + facName  + " " + val;
                        }
                    }
                }

                let embed = new discordjs.RichEmbed()
                    .setTitle("Factions Top")
                    .setColor(0x42f47d)
                    .addField("Updated by:", newObj.sentBy)
                    .addField("Time:", newObj.timeSent);
                let str = "";

                for(let value of newObj.values){
                    str += value + "\n";
                   
                }
                embed.addField("Values:", str);
                msg.channel.send(embed);

            });

            closeCon();
        }

        let addNewValues = function(){
            let ftopObj = new Object();
            ftopObj.values = [];
            ftopObj.sentBy = msg.author.username + "#" + msg.author.discriminator;
            ftopObj.timeSent = new Date().getTime();

            let vals = (args.join(" ") + '').split("\n");
            for(let i = 0; i < vals.length; i++){
                let row = vals[i].split(" ");
                let part1 = row[0] + " ";
                let part2 = row[1] + " ";
                let part3 = row[2].replace("$", "").replace(/,/g, "");
                ftopObj.values[i] = part1 + part2 + part3;
            }

            dbo.collection(msg.guild.id).insertOne(ftopObj, function(err, res){
                if(err) console.log("Something went wrong when saving new doc");
                msg.channel.send("Added values into db.").then(msg => msg.delete(3000));
                closeCon();
            });
        }

        let closeCon = function(){
            db.close();
        }

        msg.delete();
   
    });

};
module.exports.help = {
    "name": "ftop",
    "desc": "Update or view ftop values",
    "usage": "ftop [ftop values formatted in a MCC string]"
}