import { serve } from "https://deno.land/std@0.139.0/http/server.ts";
import { ActivityTypes, Bot, createBot, DiscordenoInteraction, DiscordenoUser, startBot } from 'https://deno.land/x/discordeno@13.0.0-rc18/mod.ts';
import { BotWithCache, enableCachePlugin, enableCacheSweepers } from 'https://deno.land/x/discordeno_cache_plugin@0.0.21/mod.ts';
import 'https://deno.land/x/dotenv@v3.2.0/load.ts';

async function getHDMFloorPrice(): Promise<string> {
    const response = await fetch('https://api-mainnet.magiceden.dev/v2/collections/hoteldementia/stats');
    const collectionStat = await response.json();

    return (collectionStat.floorPrice / 1e9).toString();
}

async function getHDMTheInvitationFloorPrice(): Promise<string> {
    const response = await fetch('https://api-mainnet.magiceden.dev/v2/collections/hdmtheinvitation/stats');
    const collectionStat = await response.json();

    return (collectionStat.floorPrice / 1e9).toString();
}

async function setFloorPriceDiscordStatus(bot: Bot): Promise<void> {
    try {
        const floorPrice = await getHDMFloorPrice();
        const invitationFloorPrice = await getHDMTheInvitationFloorPrice();
        bot.helpers.editBotStatus({
            status: 'online',
            activities: [
                {
                    type: ActivityTypes.Custom,
                    name: `Novelty: ${floorPrice} ◎`,
                    emoji: {
                        name: 'woman_astronaut',
                    },
                    createdAt: new Date().getTime(),
                },
                {
                    type: ActivityTypes.Custom,
                    name: `Invitation: ${invitationFloorPrice} ◎`,
                    emoji: {
                        name: 'luggage',
                    },
                    createdAt: new Date().getTime(),
                },
            ]
        });
    } catch (error) {
        console.error(error);
        return;
    }
}

const baseBot = createBot({
    token: Deno.env.get('DISCORD_TOKEN') ?? '',
    intents: ['Guilds'],
    botId: BigInt(Deno.env.get('BOT_ID') ?? 0),
    events: {
        ready(_bot: Bot, payload: { user: DiscordenoUser }) {
            console.log(`Successfully logged in as ${payload.user.username}`);
        },
        interactionCreate: async (bot: Bot, interaction: DiscordenoInteraction) => {
            if (interaction.channelId === undefined) {
                return;
            }

            switch (interaction.data?.name) {
                case 'ping':
                    await bot.helpers.sendMessage(
                        interaction.channelId,
                        {
                            content: 'pong!',
                        }
                    );
                    break;
                case 'floorprice':
                    try {
                        const floorPrice = await getHDMFloorPrice();
                        await bot.helpers.sendMessage(
                            interaction.channelId,
                            {
                                content: `Novelty: ${floorPrice} ◎`,
                            }
                        );
                    } catch (error) {
                        console.error(error);
                    } 
                    break;
                default:
                    break;
            }
        },
    },
});

const bot: BotWithCache = enableCachePlugin(baseBot);
enableCacheSweepers(bot);

setInterval(async () => {
    await setFloorPriceDiscordStatus(bot);
}, 10000);

serve((_req) => new Response('still alive!'));
await startBot(bot);
