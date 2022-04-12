import { channelsRepo } from '../repository/channels-repository.js';
import { chatsRepo } from '../repository/chat-repository.js';
import { Console as console } from './logger-mod.js';

const getSessionKey = ({ from, chat }) => {
    if (from == null || chat == null) {
        return null;
    }

    return `${from.id}:${chat.id}`;
};

/**
 * 
 * @param {} sessionOptions 
 * @returns 
 */
export const chatSession = (sessionOptions => {
    const options = {
        sessionName: 'session',
        sessionKeyFn: getSessionKey,
        ...sessionOptions
    };

    const collection = chatsRepo;

    const saveSession = (key, data) => collection.updateOne(key, data);
    const getSession = async (key) => await collection.findOne(key);

    const { sessionKeyFn: getKey, sessionName } = options;

    const loadSession = async (ctx, sessionName) => {
        const key = getKey(ctx);
        if (!key) return;
        const data = key == null ? {} : await getSession(key);
        var now = new Date();
        var utc_timestamp = Math.floor(now.getTime() / 1000);

        if (!data.lasttime) {
            data.lasttime = utc_timestamp;
        }

        if (data && !!data.lasttime && data.lasttime > 0 && (!ctx.message || data.lasttime <= ctx.message.date)) {
            data.lasttime = utc_timestamp;
        }



        ctx[sessionName] = data;

        return key;
    }

    return async (ctx, next) => {
        try {
            const key = await loadSession(ctx, sessionName);
            if (ctx.update.channel_post) {
                console.debug('update from channel: ', ctx.update.channel_post.chat.id, ' title ', ctx.update.channel_post.chat.title);
                await updateChannel(ctx);
            }
            await next();

            if (ctx[sessionName] != null) {
                await saveSession(key, ctx[sessionName]);
            }
        } catch (err) {
            console.log("error ", err);
        }
    };

});

async function updateChannel(ctx) {
    try {
        if (ctx.update.channel_post.chat.type === 'channel') {
            const channelVerify = await channelsRepo.model.findOne({ chatId: ctx.update.channel_post.chat.id });
            if (!channelVerify || !channelVerify.chatId) {
                // chat id non presente nel db inseriscila
                await channelsRepo.model.updateOne({ chatId: ctx.update.channel_post.chat.id }, {
                    $set: {
                        chatId: ctx.update.channel_post.chat.id,
                        name: ctx.update.channel_post.chat.title
                    }
                }, {
                    upsert: true
                });
            }
        }
    } catch (err) {
        console.error(err);
    }
}
