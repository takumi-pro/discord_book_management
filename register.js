const { Client, Intents } = require('discord.js')

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] })
const dotenv = require('dotenv')
dotenv.config()

client.once('ready', async () => {
    const data = [
        {
            name: "search",
            description: "書籍のタイトルで検索",
            options: [
                {
                    name: '検索ワード',
                    description: '検索ワードを入力',
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: "delete",
            description: "pageIdでNotionの書籍削除",
            options: [
                {
                    name: 'ページ',
                    description: 'ページを入力',
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: "fetch",
            description: "Notionで管理している書籍の表示"
        },
        {
            name: "fetchnumber",
            description: "Notionで管理している書籍の冊数表示"
        }
    ];
    await client.application.commands.set(data, '951673215414042654');
    console.log("Ready!");
});

client.login(process.env.DISCORD_TOKEN);