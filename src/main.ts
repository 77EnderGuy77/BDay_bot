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
    await ctx.reply("Database is not open. Use /start to open or create it.");
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
    console.error('Failed to open database or run initial setup:', error);
    throw error;
  }
}

bot.command("start", async (ctx: Context) => {
  try {
    db = await openDb();
    console.log("Database was opened or created");

    await ctx.reply(
      "To add a birthday use - /addBday user_tag DD-MM-YYYY or DD-MM\n" +
      "To delete a birthday use - /deleteBday user_tag"
    );
  } catch (error) {
    console.error("Failed to open or create the database:", error);
    await ctx.reply("Failed to initialize the database. Check the logs for more information.");
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
    return ctx.reply("Usage: /addBday user DD-MM-YYYY or DD-MM (e.g., /addBday enderguy77 14-12-2004 or /addBday enderguy77 14-12)");
  }

  const formattedBday = parseBday(date);

  if (!formattedBday) {
    return ctx.reply("Invalid date format. Please use DD-MM-YYYY or DD-MM.");
  }

  const isValidDate = moment(formattedBday, "DD-MM-YYYY", true).isValid();

  if (!isValidDate) {
    return ctx.reply("Invalid date. Please check that the date is correct and try again.");
  }

  try {
    await db!.run("INSERT INTO birthdays (user, birthday) VALUES (?, ?)", [user, formattedBday]);
    ctx.reply(`Birthday set for @${user} on ${formattedBday}! 🎉`);
  } catch (error) {
    console.error("Failed to set birthday:", error);
    ctx.reply("An error occurred while setting the birthday. Please try again.");
  }
});

bot.command("deleteBday", async (ctx: Context) => {
  if (!(await isDBOpen(ctx))) return;

  const messageText = ctx.message?.text || "";
  const [command, user] = messageText.split(" ");

  if (command !== "/deleteBday" || !user) {
    return ctx.reply("Usage: /deleteBday user (e.g., /deleteBday enderguy77)");
  }

  try {
    const result = await db!.run("DELETE FROM birthdays WHERE user = ?", [user]);
    if (result.changes) {
      ctx.reply(`Birthday for @${user} deleted successfully.`);
    } else {
      ctx.reply(`No birthday found for @${user}.`);
    }
  } catch (error) {
    console.error("Error deleting birthday:", error);
    ctx.reply("An error occurred while deleting the birthday. Please try again.");
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

      let message = `🎉 Happy Birthday, @${user.user}! 🎂🥳`;

      if (age !== null) {
        message += ` You are ${age} years old! 🎉`;
      }

      await bot.api.sendMessage(GROUP_ID, message);
    }
  } catch (error) {
    console.error("Error sending birthday messages:", error);
  }
}

const timer = cron.schedule(
  "0 9 * * *",
  async () => {
    console.log("Running scheduled task at 9 AM");
    await sendBday();
  },
  { scheduled: true, timezone: "Europe/Kiev" }
);

bot.start();
