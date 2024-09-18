"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const sqlite3_1 = __importDefault(require("sqlite3"));
const grammy_1 = require("grammy");
const sqlite_1 = require("sqlite");
const path_1 = require("path");
const node_cron_1 = __importDefault(require("node-cron"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const bot = new grammy_1.Bot(process.env.BOT_TOKEN || "");
let db;
const GROUP_ID = parseInt(process.env.GROUP_ID || "0", 10);
function isDBOpen(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!db) {
            yield ctx.reply("Database is not open. Use /start to open or create it.");
            return false;
        }
        return true;
    });
}
function openDb() {
    return __awaiter(this, void 0, void 0, function* () {
        const dbFilePath = (0, path_1.resolve)(__dirname, "./birthday.db");
        try {
            const database = yield (0, sqlite_1.open)({
                filename: dbFilePath,
                driver: sqlite3_1.default.Database,
            });
            yield database.run(`CREATE TABLE IF NOT EXISTS birthdays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      birthday TEXT NOT NULL
    )`);
            return database;
        }
        catch (error) {
            console.error('Failed to open database or run initial setup:', error);
            throw error;
        }
    });
}
bot.command("start", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        db = yield openDb();
        console.log("Database was opened or created");
        yield ctx.reply("To add BirthDay use - /addBday user_tag DD-MM-YYYY or DD-MM\n\
      To delete BirthDay use - /deleteBday user_tag");
    }
    catch (error) {
        console.error("Failed to open or create the database:", error);
    }
    ctx.reply("Bot is ready to work");
}));
function parseBday(date) {
    const formats = ["DD-MM-YYYY", "DD-MM"];
    for (const format of formats) {
        const parsedDate = (0, moment_timezone_1.default)(date, format, true);
        if (parsedDate.isValid()) {
            if (format === "DD-MM" && !parsedDate.year()) {
                parsedDate.year((0, moment_timezone_1.default)().year());
            }
            return parsedDate.format("DD-MM-YYYY");
        }
    }
    return null;
}
bot.command("addBday", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(yield isDBOpen(ctx)))
        return;
    if (!ctx.message || !ctx.message.text) {
        return ctx.reply("No message was found. Please send the command with a message.");
    }
    const messageText = ctx.message.text;
    const [command, user, date] = messageText.split(" ");
    if (command !== "/addBday" || !user || !date) {
        return yield ctx.reply("Usage: /addBday user DD-MM-YYYY or DD-MM (e.g., /addBday enderguy77 14-12-2004 or /addBday enderguy77 14-12)");
    }
    const formattedBday = parseBday(date);
    if (!formattedBday) {
        return ctx.reply("Invalid date format. Please use DD-MM-YYYY or DD-MM.");
    }
    const isValidDate = (0, moment_timezone_1.default)(formattedBday, "DD-MM-YYYY", true).isValid();
    if (!isValidDate) {
        return ctx.reply("Invalid date. Please check that the date is correct and try again.");
    }
    try {
        yield db.run("INSERT INTO birthdays (user, birthday) VALUES (?, ?)", [user, formattedBday]);
        ctx.reply(`Birthday set for @${user} on ${formattedBday}! 🎉`);
    }
    catch (error) {
        console.error("Failed to set birthday:", error);
        ctx.reply("An error occurred while setting the birthday. Please try again.");
    }
}));
bot.command("deleteBday", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(yield isDBOpen(ctx)))
        return;
    if (!ctx.message || !ctx.message.text) {
        return ctx.reply("No message was found. Please send the command with a message.");
    }
    const messageText = ctx.message.text;
    const [command, user] = messageText.split(" ");
    if (command !== "/deleteBday" || !user) {
        return yield ctx.reply("Usage: /deleteBday user (e.g., /deleteBday enderguy77)");
    }
    try {
        const result = yield db.run("DELETE FROM birthdays WHERE user = ?", [
            user,
        ]);
        if (result.changes) {
            ctx.reply(`Birthday for @${user} deleted successfully.`);
        }
        else {
            ctx.reply(`No birthday found for @${user}.`);
        }
    }
    catch (error) {
        console.error("Error deleting birthday:", error);
        ctx.reply("An error occurred while deleting the birthday. Please try again.");
    }
}));
function calculateAge(birthday) {
    const birthDate = (0, moment_timezone_1.default)(birthday, "DD-MM-YYYY");
    if (birthDate.isValid()) {
        const now = (0, moment_timezone_1.default)();
        return now.diff(birthDate, "years");
    }
    return null;
}
function sendBday() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const today = (0, moment_timezone_1.default)().format("MM-DD");
            const todayBday = yield db.all("SELECT * FROM birthdays WHERE strftime('%m-%d', birthday) = ?", [today]);
            if (todayBday.length === 0) {
                return;
            }
            for (const user of todayBday) {
                const age = calculateAge(user.birthday);
                let message = `🎉 Happy Birthday, @${user.user}! 🎂🥳`;
                if (age !== null) {
                    message += ` You are ${age} years old! 🎉`;
                }
                yield bot.api.sendMessage(GROUP_ID, message);
            }
        }
        catch (error) {
            console.error("Error sending birthday messages:", error);
        }
    });
}
const timer = node_cron_1.default.schedule("0 9 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Running scheduled task at 9 AM");
    yield sendBday();
}), { scheduled: true, timezone: "Europe/Kiev" });
bot.start();
