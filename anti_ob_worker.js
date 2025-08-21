const TELEGRAM_API = 'https://api.telegram.org/bot';
const BOT_TOKEN = ''; // توکن ربات
const WEBHOOK_URL = ''; // URL کلادفلر ورکر
const BOT_ID = ; // ID ربات از توکن

// آرایه فحش‌های رندوم
const insults = [
  'گوه تو لگبت 🤬',
  'کص نگو چاقال 🤬',
  'خفه شو جنده 🤬',
  'دهنت سرویس 🤬',
  'گمشو بچه کونی 🤬',
  'کیرم تو کونت 🤬',
  'چرت نگو اوسکول 🤬',
  'فاک یو مادرجنده 🤬',
  'خاک تو سرت 🤬',
  'دیوث کصکش 🤬',
  'کون لقّت 🤬',
  'بی‌ناموس بی‌شرف 🤬',
  'جرت میدم بچه کص 🤬',
  ' بجه کونی سیکتیر کن🤬',
];

// تابع برای انتخاب فحش رندوم
function getRandomInsult() {
  return insults[Math.floor(Math.random() * insults.length)];
}

// تابع برای ارسال پیام
async function sendMessage(chatId, text) {
  const url = `${TELEGRAM_API}${BOT_TOKEN}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    });
    if (!response.ok) {
      console.log('Failed to send message:', await response.text());
    }
  } catch (e) {
    console.log('Error sending message:', e);
  }
}

// تابع برای بن کردن کاربر
async function banUser(chatId, userId) {
  const url = `${TELEGRAM_API}${BOT_TOKEN}/banChatMember`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
      }),
    });
    if (!response.ok) {
      console.log('Failed to ban user:', await response.text());
      return false;
    }
    return true;
  } catch (e) {
    console.log('Error banning user:', e);
    return false;
  }
}

// تابع برای سکوت کاربر
async function muteUser(chatId, userId) {
  const url = `${TELEGRAM_API}${BOT_TOKEN}/restrictChatMember`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        permissions: {
          can_send_messages: false,
          can_send_media_messages: false,
          can_send_polls: false,
          can_send_other_messages: false,
        },
        until_date: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 ساعت
      }),
    });
    if (!response.ok) {
      console.log('Failed to mute user:', await response.text());
      return false;
    }
    return true;
  } catch (e) {
    console.log('Error muting user:', e);
    return false;
  }
}

// تابع برای رفع سکوت کاربر
async function unmuteUser(chatId, userId) {
  const url = `${TELEGRAM_API}${BOT_TOKEN}/restrictChatMember`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        permissions: {
          can_send_messages: true,
          can_send_media_messages: true,
          can_send_polls: true,
          can_send_other_messages: true,
        },
      }),
    });
    if (!response.ok) {
      console.log('Failed to unmute user:', await response.text());
      return false;
    }
    return true;
  } catch (e) {
    console.log('Error unmuting user:', e);
    return false;
  }
}

// تابع برای چک کردن ادمین بودن کاربر
async function isAdmin(chatId, userId) {
  const url = `${TELEGRAM_API}${BOT_TOKEN}/getChatMember`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
      }),
    });
    const data = await response.json();
    return data.result.status === 'administrator' || data.result.status === 'creator';
  } catch (e) {
    console.log('Error checking admin status:', e);
    return false;
  }
}

// تابع برای انتخاب کاربر تصادفی (فقط اگر KV فعال باشه)
async function getRandomUser(chatId) {
  if (typeof USERS_KV === 'undefined') {
    console.log('KV not configured, skipping random user selection');
    return null;
  }
  try {
    const users = JSON.parse(await USERS_KV.get(`users_${chatId}`)) || [];
    if (users.length === 0) return null;
    return users[Math.floor(Math.random() * users.length)];
  } catch (e) {
    console.log('Error accessing KV:', e);
    return null;
  }
}

// تابع برای به‌روزرسانی لیست کاربران در KV (فقط اگر KV فعال باشه)
async function updateUserList(chatId, userId, username) {
  if (typeof USERS_KV === 'undefined') {
    console.log('KV not configured, skipping user list update');
    return;
  }
  try {
    let users = JSON.parse(await USERS_KV.get(`users_${chatId}`)) || [];
    if (!users.some(u => u.id === userId)) {
      users.push({ id: userId, username: username || 'ناشناس' });
      await USERS_KV.put(`users_${chatId}`, JSON.stringify(users));
    }
  } catch (e) {
    console.log('Error updating KV:', e);
  }
}

// تابع برای به‌روزرسانی لیست چت‌های فعال (فقط اگر KV فعال باشه)
async function updateChatList(chatId) {
  if (typeof USERS_KV === 'undefined') {
    console.log('KV not configured, skipping chat list update');
    return;
  }
  try {
    let chats = JSON.parse(await USERS_KV.get('active_chats')) || [];
    if (!chats.includes(chatId)) {
      chats.push(chatId);
      await USERS_KV.put('active_chats', JSON.stringify(chats));
    }
  } catch (e) {
    console.log('Error updating chat list:', e);
  }
}

// تابع اصلی برای مدیریت درخواست‌ها
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === 'POST') {
    const update = await request.json();

    // مدیریت درخواست‌های کرون (هر 15 دقیقه)
    if (update.cron) {
      if (typeof USERS_KV === 'undefined') {
        console.log('KV not configured, cron skipped');
        return new Response('Cron skipped due to missing KV', { status: 200 });
      }
      try {
        const chats = JSON.parse(await USERS_KV.get('active_chats')) || [];
        for (const chatId of chats) {
          const randomUser = await getRandomUser(chatId);
          if (randomUser) {
            await sendMessage(chatId, `@${randomUser.username} ${getRandomInsult()}`);
          }
        }
      } catch (e) {
        console.log('Error in cron:', e);
      }
      return new Response('Cron executed', { status: 200 });
    }

    if (update.message) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      const text = update.message.text || '';
      const username = update.message.from.username || 'ناشناس';
      const replyTo = update.message.reply_to_message;
      const entities = update.message.entities || [];
      const isMentioned = entities.some(e => e.type === 'mention' && text.substring(e.offset, e.offset + e.length).toLowerCase() === '@antiobibot');
      const isRepliedToBot = replyTo && replyTo.from.id === BOT_ID;

      // به‌روزرسانی لیست کاربران و چت‌ها در KV (اگر فعال باشه)
      await updateUserList(chatId, userId, username);
      await updateChatList(chatId);

      // دستور /help
      if (text === '/help') {
        const helpText = `دستورات ربات @AntiObiBot:
- /help: نمایش این راهنما
- سیکتیر (ریپلای به پیام کاربر): بن کردن کاربر (فقط ادمین)
- /mute (ریپلای به پیام کاربر): خفه کردن کاربر برای 24 ساعت (فقط ادمین)
- /unmute (ریپلای به پیام کاربر): رفع خفگی کاربر (فقط ادمین)
 کیرم کلفته میتونی گریه کنی هر 15 دقیقه یکی رو تگ می‌کنم و فحش میدم  ${getRandomInsult()}`;
        await sendMessage(chatId, helpText);
        return new Response('OK', { status: 200 });
      }

      // پاسخ به "واقعا؟" یا "واگعن؟" یا "واقعا" یا "واگعن"
      if (text.match(/^(واقعا\?|واگعن\?|واقعا|واگعن)$/i)) {
        await sendMessage(chatId, `نه واگعه گوه تو... ${getRandomInsult()}`);
        return new Response('OK', { status: 200 });
      }

      // پاسخ به "اوبی"
      if (text.toLowerCase() === 'اوبی') {
        await sendMessage(chatId, `چی میخوای اوبی؟ ${getRandomInsult()}`);
        return new Response('OK', { status: 200 });
      }

      if (text.toLowerCase() === 'کص ننت') {
        await sendMessage(chatId, ` کیر بلند قامتم دست ننت ${getRandomInsult()}`);
        return new Response('OK', { status: 200 });
      }
      if (text.toLowerCase() === 'سلام') {
        await sendMessage(chatId, ` من اینجا پول هاست ندادن بیام بهت سلام بدم پس سیکتیر کن${getRandomInsult()}`);
        return new Response('OK', { status: 200 });
      }
      if (text.toLowerCase() === 'کونی') {
        await sendMessage(chatId, ` بخور بستنی نونی زن ج...${getRandomInsult()}`);
        return new Response('OK', { status: 200 });
      }
      if (text.toLowerCase() === 'مادرجنده') {
        await sendMessage(chatId, ` کیر تو کص ناموست مادری${getRandomInsult()}`);
        return new Response('OK', { status: 200 });
      }
      if (text.toLowerCase() === 'ننت جندست') {
        await sendMessage(chatId, ` کیر خر تو کص مادرت${getRandomInsult()}`);
        return new Response('OK', { status: 200 });
      }
      if (text.toLowerCase() === 'کیر') {
        await sendMessage(chatId, ` غذای ننت ؟${getRandomInsult()}`);
        return new Response('OK', { status: 200 });
      }
      if (text.toLowerCase() === 'kir') {
        await sendMessage(chatId, ` غذای ننت ؟${getRandomInsult()}`);
        return new Response('OK', { status: 200 });
      }
      if (text.toLowerCase() === 'KIR') {
        await sendMessage(chatId, ` غذای ننت ؟${getRandomInsult()}`);
        return new Response('OK', { status: 200 });
      }
      // سیکتیر کردن با کلمه "سیکتیر" (باید ریپلای باشه)
      if (text.toLowerCase() === 'سیکتیر' && replyTo) {
        if (await isAdmin(chatId, userId)) {
          const targetUserId = replyTo.from.id;
          const targetUsername = replyTo.from.username || 'ناشناس';
          if (await banUser(chatId, targetUserId)) {
            await sendMessage(chatId, `@${targetUsername} سیکتیرش کردم! ${getRandomInsult()}`);
          } else {
            await sendMessage(chatId, `نشد سیکتیرش کنم، شاید خودم دسترسی ندارم یا کاربر ادمینه! ${getRandomInsult()}`);
          }
        } else {
          await sendMessage(chatId, `تو ادمین نیستی که سیکتیر کنی! ${getRandomInsult()}`);
        }
        return new Response('OK', { status: 200 });
      }

      // دستور /mute (باید ریپلای باشه)
      if (text.startsWith('/mute') && replyTo) {
        if (await isAdmin(chatId, userId)) {
          const targetUserId = replyTo.from.id;
          const targetUsername = replyTo.from.username || 'ناشناس';
          if (await muteUser(chatId, targetUserId)) {
            await sendMessage(chatId, `@${targetUsername} خفه ${getRandomInsult()}`);
          } else {
            await sendMessage(chatId, `نشد خفه اش کنم، شاید خودم دسترسی ندارم یا کاربر ادمینه! ${getRandomInsult()}`);
          }
        } else {
          await sendMessage(chatId, `تو ادمین نیستی بچه کونی که ساکت کنی! ${getRandomInsult()}`);
        }
        return new Response('OK', { status: 200 });
      }

      // دستور /unmute (باید ریپلای باشه)
      if (text.startsWith('/unmute') && replyTo) {
        if (await isAdmin(chatId, userId)) {
          const targetUserId = replyTo.from.id;
          const targetUsername = replyTo.from.username || 'ناشناس';
          if (await unmuteUser(chatId, targetUserId)) {
            await sendMessage(chatId, `@${targetUsername} گو بخور ${getRandomInsult()}`);
          } else {
            await sendMessage(chatId, `نشد گو بدم، شاید خودم دسترسی ندارم! ${getRandomInsult()}`);
          }
        } else {
          await sendMessage(chatId, `تو ادمین نیستی که گو بدی! ${getRandomInsult()}`);
        }
        return new Response('OK', { status: 200 });
      }

      // اگر تگ شد (@AntiObiBot)، فحش بده
      if (isMentioned) {
        await sendMessage(chatId, `@${username} ${getRandomInsult()}`);
        return new Response('OK', { status: 200 });
      }

      // اگر ریپلای به ربات، فحش بده
      if (isRepliedToBot) {
        await sendMessage(chatId, `@${username} ${getRandomInsult()}`);
        return new Response('OK', { status: 200 });
      }
    }
  }
  return new Response('OK', { status: 200 });
}
