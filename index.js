const { Client, Intents } = require('discord.js')
const axios = require('axios')

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] })
const dotenv = require('dotenv')
dotenv.config()

const DUMY_URL        = "https://placehold.jp/150x150.png?text=No%20Image"
const ISBN_PATTERN    = /(ISBN[-]*(1[03])*[ ]*(: ){0,1})*(([0-9Xx][- ]*){13}|([0-9Xx][- ]*){10})/
const GOOLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes?q='
const OPENDB_URL      = 'https://api.openbd.jp/v1/get?isbn='
const NOTION_URL      = 'https://api.notion.com/v1'
const SERVER_ID       = '955757807578279956'
const DATABASE_ID     = process.env.DATABASE_ID
const NOTION_TOKEN = process.env.NOTION_TOKEN


const createOption = (summary) => {
    const { title, cover, isbn } = summary
    const url = cover || DUMY_URL
    const headers = {
        headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-02-22'
        }
    }

    const data = {
        parent: { database_id: DATABASE_ID },
        properties: {
            title: {
                title: [{
                    text: {
                        content: title
                    }
                }]
            },
            "進捗率": {
                "number": 0
            },
            "カテゴリ": {
                "multi_select": [{ "name": "デフォルト" }]
            },
            "ステータス": {
                "select": { "name": "デフォルト" }
            },
            "画像": {
                "files": [
                    {
                        "type": "external",
                        "name": title,
                        "external": {
                            "url": url
                        }
                    }
                ]
            },
            "ISBN": {
                "rich_text": [{
                    "type": "text",
                    "text": {
                        "content": isbn
                    }
                }]
            }
        }
    }

    return {
        data,
        headers
    }
}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return
    const headers = {
        headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-02-22'
        }
    }

    if (interaction.commandName === "delete") {
        const optionText = interaction.options.getString('ページ')
        try {
            await axios.patch(`${NOTION_URL}/pages/${optionText}`, {archived: true}, headers)
            interaction.reply('ページが削除されました')
        } catch (error) {
            console.log(error)
            interaction.reply('問題が発生しました。。')
        }
    }

    if (interaction.commandName === "fetchnumber") {
        try {
            const notionRes = await axios.post(`${NOTION_URL}/databases/${DATABASE_ID}/query`, {}, headers)
            const results = notionRes.data.results
            interaction.reply(`Notionでは${results.length}冊の書籍を管理しています`)
        } catch (error) {
            console.log(error)
            interaction.reply('問題が発生しました。。')
        }
    }

    if (interaction.commandName === "fetch") {
        try {
            const notionRes = await axios.post(`${NOTION_URL}/databases/${DATABASE_ID}/query`, {}, headers)
            const results = notionRes.data.results
            const fields = []
            results.map(result => {
                const title = result.properties['タイトル'].title[0].text.content
                const pageId = result.id
                const field = { name: `:book: ${title}`, value: `ページID: ${pageId}` }
                fields.push(field)
            })
            interaction.reply({
                embeds: [{
                    title: 'Notionで管理している書籍一覧',
                    fields: fields,
                    color: 4303284,
                    timestamp: new Date()
                }]
            })
        } catch (error) {
            console.log(error)
            interaction.reply('問題が発生しました。。')
        }
    }

    if (interaction.commandName === "search") {
        const userSearchText = interaction.options.getString('検索ワード')
        try {
            // urlのエンコードが必要
            const encodeUrl = encodeURI(`${GOOLE_BOOKS_URL}${userSearchText}`)
            const googleBooksRes = await axios.get(encodeUrl)
            const items = googleBooksRes.data.items.slice(0, 5)
            const fields = []
            items.map(item => {
                const title = item.volumeInfo.title
                const isbn = item.volumeInfo.industryIdentifiers[0].identifier
                const field = { name: title, value: `ISBN : ${isbn}` }
                fields.push(field)
            })

            interaction.reply({
                embeds: [{
                    title: `「${userSearchText}」の検索結果`,
                    fields: fields,
                    color: 4303284,
                    timestamp: new Date()
                }]
            })
        } catch (error) {
            console.log(error)
            interaction.reply('問題が発生しました。。')
        }
    }
})

client.on('messageCreate', async (message) => {
    if (message.author === client.user) return;

    if (!message.author.bot && message.channel.id === SERVER_ID) {
        const channel = client.channels.cache.get(SERVER_ID)
        const userContent = message.content

        if (ISBN_PATTERN.test(userContent)) {
            try {
                // openBDにGET
                const openbdRes = await axios.get(`${OPENDB_URL}${userContent}`)
                const summary = openbdRes.data[0].summary
                const url = summary.cover || DUMY_URL

                // notion api
                await axios.post(`${NOTION_URL}/pages`, createOption(summary).data, createOption(summary).headers)
                channel.send({
                    content: 'Notionに追加されました！',
                    embeds: [{
                        title: summary.title,
                        image: {
                            url: url
                        },
                        description: `ISBN : ***${summary.isbn}***`,
                        color: 4303284,
                        timestamp: new Date()
                    }]
                })
            } catch (error) {
                console.log(error)
                channel.send('Notionへの追加が失敗しました。。。')
            }
        }
    }
})

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.DISCORD_TOKEN);