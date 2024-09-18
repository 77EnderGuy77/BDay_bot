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
let db = null;
const GROUP_ID = parseInt(process.env.GROUP_ID || "0", 10);
function isDBOpen(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!db) {
            yield ctx.reply("База данных не открыта. Используйте команду /start для её открытия или создания.");
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
            console.error("Не удалось открыть базу данных или выполнить начальную настройку:", error);
            throw error;
        }
    });
}
bot.command("start", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        db = yield openDb();
        console.log("База данных была успешно открыта или создана.");
        yield ctx.reply("Чтобы добавить день рождения, используйте - /addBday user_tag ДД-ММ-ГГГГ или ДД-ММ\n" +
            "Чтобы удалить день рождения, используйте - /deleteBday user_tag");
    }
    catch (error) {
        console.error("Не удалось открыть или создать базу данных:", error);
        yield ctx.reply("Не удалось инициализировать базу данных. Проверьте логи для получения дополнительной информации.");
    }
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
    var _a;
    if (!(yield isDBOpen(ctx)))
        return;
    const messageText = ((_a = ctx.message) === null || _a === void 0 ? void 0 : _a.text) || "";
    const [command, user, date] = messageText.split(" ");
    if (command !== "/addBday" || !user || !date) {
        return ctx.reply("Использование: /addBday user ДД-ММ-ГГГГ или ДД-ММ (например, /addBday enderguy77 14-12-2004 или /addBday enderguy77 14-12)");
    }
    const formattedBday = parseBday(date);
    if (!formattedBday) {
        return ctx.reply("Неверный формат даты. Используйте DD-MM-YYYY или DD-MM.");
    }
    const isValidDate = (0, moment_timezone_1.default)(formattedBday, "DD-MM-YYYY", true).isValid();
    if (!isValidDate) {
        return ctx.reply("Неверная дата. Пожалуйста, проверьте, что дата правильная, и попробуйте снова.");
    }
    try {
        yield db.run("INSERT INTO birthdays (user, birthday) VALUES (?, ?)", [
            user,
            formattedBday,
        ]);
        ctx.reply(`День рождения установлен для @${user} на ${formattedBday}! 🎉`);
    }
    catch (error) {
        console.error("Не удалось установить день рождения:", error);
        ctx.reply("Произошла ошибка при установке дня рождения. Пожалуйста, попробуйте снова.");
    }
}));
bot.command("deleteBday", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!(yield isDBOpen(ctx)))
        return;
    const messageText = ((_a = ctx.message) === null || _a === void 0 ? void 0 : _a.text) || "";
    const [command, user] = messageText.split(" ");
    if (command !== "/deleteBday" || !user) {
        return ctx.reply("Использование: /deleteBday user (например, /deleteBday enderguy77)");
    }
    try {
        const result = yield db.run("DELETE FROM birthdays WHERE user = ?", [
            user,
        ]);
        if (result.changes) {
            ctx.reply(`День рождения для @${user} успешно удален.`);
        }
        else {
            ctx.reply(`День рождения для @${user} не найден.`);
        }
    }
    catch (error) {
        console.error("Ошибка при удалении дня рождения:", error);
        ctx.reply("Произошла ошибка при удалении дня рождения. Пожалуйста, попробуйте снова.");
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
                let message = `🎉 С днём рождения, @${user.user}! 🎂🥳`;
                if (age !== null) {
                    message += ` Вам ${age} лет! 🎉`;
                }
                yield bot.api.sendMessage(GROUP_ID, message);
            }
        }
        catch (error) {
            console.error("Ошибка при отправке сообщений о днях рождения:", error);
        }
    });
}
node_cron_1.default.schedule("0 9 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Выполнение запланированной задачи в 9 утра");
    yield sendBday();
}), { scheduled: true, timezone: "Europe/Kiev" });
bot.start();
