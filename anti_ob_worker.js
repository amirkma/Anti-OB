addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

addEventListener('scheduled', event => {
  event.waitUntil(handleScheduled(event));
});

const TELEGRAM_TOKEN = '8436981924:AAHvxRo0FYQdx9nrctGaDDF7pw_89l9vhpE';
const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY_HERE';
const WEBHOOK_URL = 'YOUR_CLOUDFLARE_WORKER_URL'; // بعد از دیپلوی تنظیم کن

const CHAT_IDS = new KVNamespace('CHAT_IDS');

async function sendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
    }),
  });
}

async function handleScheduled(event) {
  const chatIds = await CHAT_IDS.list();
  for (const chat of chatIds.keys) {
    try {
      await sendMessage(chat.name.replace('chat_', ''), 'انتی اوبی آماده خدمته! 😎 گی تو لگبت');
    } catch (e) {
      console.error(`Error sending message to ${chat.name}: ${e}`);
    }
  }
}

async function handleRequest(request) {
  if (request.method === 'POST') {
    const update = await request.json();
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = (update.message.text || '').toLowerCase();
      const userId = update.message.from.id;
      const username = update.message.from.username || '';

      await CHAT_IDS.put(`chat_${chatId}`, chatId.toString());

      if (text.startsWith('/start')) {
        await sendMessage(chatId, 'سلام! من ANTI OB هستم، آماده محافظت از گپ و پاسخ به سوالات شما! 😊 گی تو لگبت\nبرای سایلنت کردن: /mute @username مدت_دقیقه\nبرای جستجوی موزیک: بنویسید "موزیک [نام]"');
      } else if (text.startsWith('/mute') && update.message.chat.type.includes('group')) {
        const args = text.split(' ').slice(1);
        if (args.length < 2) {
          await sendMessage(chatId, 'لطفاً بنویسید: /mute @username مدت_دقیقه گی تو لگبت');
          return new Response('OK', { status: 200 });
        }
        const target = args[0];
        const minutes = parseInt(args[1]);
        if (isNaN(minutes)) {
          await sendMessage(chatId, 'مدت زمان باید عدد باشه (به دقیقه)! گی تو لگبت');
          return new Response('OK', { status: 200 });
        }
        try {
          const targetId = await getUserIdFromMention(chatId, target);
          if (!targetId) {
            await sendMessage(chatId, 'کاربر پیدا نشد یا ذکرش نکردی! گی تو لگبت');
            return new Response('OK', { status: 200 });
          }
          const untilDate = Math.floor(Date.now() / 1000) + minutes * 60;
          await restrictChatMember(chatId, targetId, untilDate);
          await sendMessage(chatId, `کاربر ${target} برای ${minutes} دقیقه سایلنت شد! گی تو لگبت`);
        } catch (e) {
          await sendMessage(chatId, 'خطایی پیش اومد! مطمئن شو که من ادمینم. گی تو لگبت');
        }
      } else if (text.includes('اوبی')) {
        await sendMessage(chatId, 'بله اوبی چی می‌خوای 😏 گی تو لگبت');
      } else if (text.includes('موزیک')) {
        const query = text.replace('موزیک', '').trim();
        if (query) {
          await searchMusic(chatId, query);
        } else {
          await sendMessage(chatId, 'لطفاً اسم موزیک رو بعد از "موزیک" بنویسید! گی تو لگبت');
        }
      } else {
        await sendMessage(chatId, 'سوال جالبی بود! 😄 چی تو سرته؟ گی تو لگبت');
      }
    }
    return new Response('OK', { status: 200 });
  }
  return new Response('Method not allowed', { status: 405 });
}

async function searchMusic(chatId, query) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}&maxResults=1`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const videoId = data.items[0].id.videoId;
      const videoTitle = data.items[0].snippet.title;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      await sendMessage(chatId, `موزیک پیدا شد: ${videoTitle}\nلینک: ${videoUrl} گی تو لگبت`);
    } else {
      await sendMessage(chatId, 'موزیکی پیدا نشد! 😔 یه چیز دیگه امتحان کن. گی تو لگبت');
    }
  } catch (e) {
    await sendMessage(chatId, 'خطایی پیش اومد! بعداً دوباره امتحان کن. گی تو لگبت');
  }
}

async function isAdmin(chatId, userId) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getChatAdministrators?chat_id=${chatId}`;
  const response = await fetch(url);
  const admins = await response.json();
  return admins.ok && admins.result.some(admin => admin.user.id === userId);
}

async function getUserIdFromMention(chatId, mention) {
  if (mention.startsWith('@')) {
    mention = mention.slice(1);
  }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${mention}`;
    const response = await fetch(url);
    const member = await response.json();
    return member.ok ? member.result.user.id : null;
  } catch (e) {
    return null;
  }
}

async function restrictChatMember(chatId, userId, untilDate) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/restrictChatMember`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId,
      permissions: { can_send_messages: false },
      until_date: untilDate,
    }),
  });
}
