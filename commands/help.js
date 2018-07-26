const discordjs = require('discord.js');
const config = require('../config.json');

module.exports.run = async(bot, msg, args) => {
    let sicon = msg.guild.iconURL;
    let serverEmbed = new discordjs.RichEmbed()
    .setDescription(`**Factions Top Bot v${config.version} : Command List**`)
    .setThumbnail(sicon)
    .setColor("#77f442")
    .addBlankField();
    
    bot.commands.forEach(element => {
        let str = "";
        if(element.help.desc){
            str += ("Description: _" + element.help.desc + "_");
        }
        if(element.help.usage){
            str += ("\nUsage: _" + element.help.usage + "_");
        }
        if(!str.length == 0 ){
            serverEmbed.addField(`${element.help.name}`, str);
            // serverEmbed.addBlankField();
        }
    });

    msg.delete();
    return msg.channel.send(serverEmbed);
};

module.exports.help = {
    "name": "help"
};