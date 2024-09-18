require("dotenv").config();
import sqlite3 from "sqlite3";
import { Bot, Context } from "grammy";
import { Database, open } from "sqlite";
import { resolve } from "path";
import cron from "node-cron";
import moment from "moment-timezone";

const bot: Bot = new Bot(process.env.BOT_TOKEN || "");
let db: Database | null = null;

const GROUP_ID: number = parseInt(process.env.GROUP_ID || "0", 10);

async function isDBOpen(ctx: Context): Promise<boolean> {
  if (!db) {
    await ctx.reply(
      "База данных не открыта. Используйте команду /start для её открытия или создания."
    );
    return false;
  }
  return true;
}

async function openDb(): Promise<Database> {
  const dbFilePath = resolve(__dirname, "./birthday.db");

  try {
    const database = await open({
      filename: dbFilePath,
      driver: sqlite3.Database,
    });

    await database.run(`CREATE TABLE IF NOT EXISTS birthdays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      birthday TEXT NOT NULL
    )`);

    return database;
  } catch (error) {
    console.error(
      "Не удалось открыть базу данных или выполнить начальную настройку:",
      error
    );
    throw error;
  }
}

bot.command("start", async (ctx: Context) => {
  try {
    db = await openDb();
    console.log("База данных была успешно открыта или создана.");

    await ctx.reply(
      "Чтобы добавить день рождения, используйте - /addBday user_tag ДД-ММ-ГГГГ или ДД-ММ\n" +
        "Чтобы удалить день рождения, используйте - /deleteBday user_tag"
    );
  } catch (error) {
    console.error("Не удалось открыть или создать базу данных:", error);
    await ctx.reply(
      "Не удалось инициализировать базу данных. Проверьте логи для получения дополнительной информации."
    );
  }
});

function parseBday(date: string): string | null {
  const formats = ["DD-MM-YYYY", "DD-MM"];
  for (const format of formats) {
    const parsedDate = moment(date, format, true);
    if (parsedDate.isValid()) {
      if (format === "DD-MM" && !parsedDate.year()) {
        parsedDate.year(moment().year());
      }
      return parsedDate.format("DD-MM-YYYY");
    }
  }
  return null;
}

bot.command("addBday", async (ctx: Context) => {
  if (!(await isDBOpen(ctx))) return;

  const messageText = ctx.message?.text || "";
  const [command, user, date] = messageText.split(" ");

  if (command !== "/addBday" || !user || !date) {
    return ctx.reply(
      "Использование: /addBday user ДД-ММ-ГГГГ или ДД-ММ (например, /addBday enderguy77 14-12-2004 или /addBday enderguy77 14-12)"
    );
  }

  const formattedBday = parseBday(date);

  if (!formattedBday) {
    return ctx.reply("Неверный формат даты. Используйте DD-MM-YYYY или DD-MM.");
  }

  const isValidDate = moment(formattedBday, "DD-MM-YYYY", true).isValid();

  if (!isValidDate) {
    return ctx.reply(
      "Неверная дата. Пожалуйста, проверьте, что дата правильная, и попробуйте снова."
    );
  }

  try {
    await db!.run("INSERT INTO birthdays (user, birthday) VALUES (?, ?)", [
      user,
      formattedBday,
    ]);
    ctx.reply(`День рождения установлен для @${user} на ${formattedBday}! 🎉`);
  } catch (error) {
    console.error("Не удалось установить день рождения:", error);
    ctx.reply(
      "Произошла ошибка при установке дня рождения. Пожалуйста, попробуйте снова."
    );
  }
});

bot.command("deleteBday", async (ctx: Context) => {
  if (!(await isDBOpen(ctx))) return;

  const messageText = ctx.message?.text || "";
  const [command, user] = messageText.split(" ");

  if (command !== "/deleteBday" || !user) {
    return ctx.reply("Использование: /deleteBday user (например, /deleteBday enderguy77)");
  }

  try {
    const result = await db!.run("DELETE FROM birthdays WHERE user = ?", [
      user,
    ]);
    if (result.changes) {
      ctx.reply(`День рождения для @${user} успешно удален.`);
    } else {
      ctx.reply(`День рождения для @${user} не найден.`);
    }
  } catch (error) {
    console.error("Ошибка при удалении дня рождения:", error);
    ctx.reply(
      "Произошла ошибка при удалении дня рождения. Пожалуйста, попробуйте снова."
    );
  }
});

function calculateAge(birthday: string): number | null {
  const birthDate = moment(birthday, "DD-MM-YYYY");
  if (birthDate.isValid()) {
    const now = moment();
    return now.diff(birthDate, "years");
  }
  return null;
}

async function sendBday(): Promise<void> {
  try {
    const today = moment().format("MM-DD");
    const todayBday = await db!.all(
      "SELECT * FROM birthdays WHERE strftime('%m-%d', birthday) = ?",
      [today]
    );

    if (todayBday.length === 0) {
      return;
    }

    for (const user of todayBday) {
      const age = calculateAge(user.birthday);

      let message = `🎉 С днём рождения, @${user.user}! 🎂🥳`;

      if (age !== null) {
        message += ` Вам ${age} лет! 🎉`;
      }

      await bot.api.sendMessage(GROUP_ID, message);
    }
  } catch (error) {
    console.error("Ошибка при отправке сообщений о днях рождения:", error);
  }
}

cron.schedule(
  "0 9 * * *",
  async () => {
    console.log("Выполнение запланированной задачи в 9 утра");
    await sendBday();
  },
  { scheduled: true, timezone: "Europe/Kiev" }
);

bot.start();
