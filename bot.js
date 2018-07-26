const Discord = require('discord.js');
const fs = require('fs');
const config = require('./config.json');
const bot = new Discord.Client({disableEveryone: true});

//Load in all the commands from ./commands/
bot.commands = new Discord.Collection();
fs.readdir("./commands/", (err, data) =>{
    if(err) console.log(err);
    let files = data.filter(file => file.split(".").pop() === "js");
    if(files.length <= 0){
        return;
    }
    files.forEach((file, index) => {
        let exports = require(`./commands/${file}`);
        bot.commands.set(exports.help.name, exports);
    });
    console.log(`Loaded ${files.length} commands!`);
});

//Set bots activity to be the help command.
bot.on('ready', async () => {
    bot.user.setActivity(`${config.prefix}help (v${config.version})`, {type:"PLAYING"}).catch(console.error);
});

//Command handler
bot.on('message', async msg => {

    
    if(msg.author.client === bot.user.id) return;
    if(msg.channel.type === "dm") return;

    let prefix = config.prefix;
    let content = msg.content.split(" ");
    let cmd = content[0];
    let args = content.slice(1);

    if(content[0].slice(0, 2) !== prefix) return;


    let command = bot.commands.get(cmd.slice(prefix.length));
    if(command){
        //execute the command
        command.run(bot, msg, args);
    }
});

//Login the bot
bot.login(process.env.BOT_TOKEN);