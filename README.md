
---

# Birthday telegram bot

BDay_bot is a Telegram bot designed to manage birthdays within a group. It can store, update, and notify group members of upcoming birthdays using SQLite as its database and cron jobs for scheduled tasks.

## Features
- Add and remove birthdays.
- Automatically send birthday wishes to the group.
- Store birthdays in SQLite.
- Timezone-aware scheduling for birthday notifications.

## Technologies Used
- **TypeScript**: Core language for bot logic.
- **grammY**: Bot framework for handling Telegram interactions.
- **SQLite**: Database for storing birthday data.
- **node-cron**: For scheduling birthday notifications.
- **moment-timezone**: To handle dates and times across different timezones.

## Prerequisites
- Node.js (version 16 or higher)
- npm (Node Package Manager)

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/77EnderGuy77/BDay_bot
   ```

2. Install the dependencies:

   ```bash
   cd BDay_bot
   npm install
   ```

3. Compile the TypeScript files:

   ```bash
   npm run build
   ```

4. Create a `.env` file in the root of the project with the following variables:

   ```bash
   BOT_TOKEN='your-telegram-bot-token'
   GROUP_ID='your-telegram-group-id'
   ```

## Usage

1. Start the bot in development mode (auto-restart with file changes):

   ```bash
   npm run dev
   ```

2. Or start the bot in production mode:

   ```bash
   npm start
   ```

## Commands

- **/start**: Initializes the bot and opens/creates the SQLite database.
- **/addBday**: Add a new birthday. Usage: `/addBday user_tag DD-MM-YYYY` or `/addBday user_tag DD-MM`
- **/deleteBday**: Remove a birthday. Usage: `/deleteBday user_tag`

## Scheduled Task

The bot automatically sends birthday messages to the group at 9 AM (Europe/Kiev timezone) using a cron job.

## License

This project is licensed under the ISC License.

## Author

Created by [77EnderGuy77](https://github.com/77EnderGuy77).

Feel free to fork this repository and make necessary changes.

---

