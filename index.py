import asyncio
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
import aiohttp

# تنظیمات لاگ
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

# توکن ربات
TOKEN = "YOUR_BOT_TOKEN_HERE"
YOUTUBE_API_KEY = "YOUR_YOUTUBE_API_KEY_HERE"

# پیام دوره‌ای هر ۱۲ ساعت
async def send_periodic_message(context: ContextTypes.DEFAULT_TYPE):
    while True:
        for chat_id in context.bot_data.get('chat_ids', []):
            try:
                await context.bot.send_message(chat_id=chat_id, text="انتی اوبی آماده خدمته! 😎 گی تو لگبت")
            except Exception as e:
                logger.error(f"Error: {e}")
        await asyncio.sleep(12 * 3600)

# فرمان شروع
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    if 'chat_ids' not in context.bot_data:
        context.bot_data['chat_ids'] = set()
    context.bot_data['chat_ids'].add(chat_id)
    await update.message.reply_text("سلام! من ANTI OB هستم، آماده محافظت از گپ و پاسخ به سوالات شما! 😊 گی تو لگبت\nبرای سایلنت کردن: /mute @username مدت_دقیقه\nبرای جستجوی موزیک: بنویسید 'موزیک [نام]'")

# پاسخ به سوالات
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.lower()
    if 'موزیک' in text:
        query = text.replace('موزیک', '').strip()
        if query:
            await search_music(update, context, query)
        else:
            await update.message.reply_text("لطفاً اسم موزیک رو بعد از 'موزیک' بنویسید! گی تو لگبت")
        return
    await update.message.reply_text("سوال جالبی بود! 😄 چی تو سرته؟ گی تو لگبت")

# جستجوی موزیک
async def search_music(update: Update, context: ContextTypes.DEFAULT_TYPE, query: str):
    try:
        async with aiohttp.ClientSession() as session:
            url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q={query}&key={YOUTUBE_API_KEY}&maxResults=1"
            async with session.get(url) as response:
                data = await response.json()
                if 'items' in data and len(data['items']) > 0:
                    video_id = data['items'][0]['id']['videoId']
                    video_title = data['items'][0]['snippet']['title']
                    video_url = f"https://www.youtube.com/watch?v={video_id}"
                    await update.message.reply_text(f"موزیک پیدا شد: {video_title}\nلینک: {video_url} گی تو لگبت")
                else:
                    await update.message.reply_text("موزیکی پیدا نشد! 😔 یه چیز دیگه امتحان کن. گی تو لگبت")
    except Exception as e:
        logger.error(f"Error: {e}")
        await update.message.reply_text("خطایی پیش اومد! بعداً دوباره امتحان کن. گی تو لگبت")

# فرمان سایلنت
async def mute(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.effective_chat.type in ['group', 'supergroup']:
        await update.message.reply_text("این دستور فقط تو گروه کار می‌کنه! گی تو لگبت")
        return
    args = context.args
    if len(args) < 2:
        await update.message.reply_text("لطفاً بنویسید: /mute @username مدت_دقیقه گی تو لگبت")
        return
    target = args[0]
    try:
        minutes = int(args[1])
    except ValueError:
        await update.message.reply_text("مدت زمان باید عدد باشه (به دقیقه)! گی تو لگبت")
        return
    try:
        user_id = await get_user_id_from_mention(target, update, context)
        if not user_id:
            await update.message.reply_text("کاربر پیدا نشد یا ذکرش نکردی! گی تو لگبت")
            return
        until_date = context.bot.get_server_time() + minutes * 60
        await context.bot.restrict_chat_member(chat_id=update.effective_chat.id, user_id=user_id, permissions={'can_send_messages': False}, until_date=until_date)
        await update.message.reply_text(f"کاربر {target} برای {minutes} دقیقه سایلنت شد! گی تو لگبت")
    except Exception as e:
        logger.error(f"Error: {e}")
        await update.message.reply_text("خطایی پیش اومد! مطمئن شو که من ادمینم. گی تو لگبت")

# گرفتن آیدی کاربر
async def get_user_id_from_mention(mention: str, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if mention.startswith('@'):
        mention = mention[1:]
    try:
        members = await context.bot.get_chat_member(update.effective_chat.id, mention)
        return members.user.id
    except:
        return 0

# تابع اصلی
async def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("mute", mute))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.job_queue.run_repeating(send_periodic_message, interval=12 * 3600, first=0)
    await app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    asyncio.run(main())