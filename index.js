require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const WEBHOOK_URL = process.env.GOOGLE_SCRIPT_URL;

// Guardar el estado por usuario
const sessions = {};

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.trim().toLowerCase();
  const fecha = new Date().toISOString();

  if (!sessions[chatId]) {
    sessions[chatId] = {
      step: 0,
      initialKW: null,
      initialBattery: null,
      initialKM: null,
    };
  }

  const session = sessions[chatId];

  switch (session.step) {
    case 0:
      await bot.sendMessage(
        chatId,
        "Hola Juanito 👋\nVamos a registrar los datos. Por favor, dime la lectura actual del medidor (solo el número en kW)."
      );
      session.step = 1;
      break;

    case 1:
      if (!/^\d+(\.\d+)?$/.test(text)) {
        await bot.sendMessage(
          chatId,
          "Por favor ingresa solo un número para los kW."
        );
        return;
      }
      session.initialKW = parseFloat(text);
      session.step = 2;
      await bot.sendMessage(
        chatId,
        "Perfecto ✅\nAhora dime el porcentaje de batería actual (ej. 88)."
      );
      break;

    case 2:
      if (!/^\d+(\.\d+)?$/.test(text)) {
        await bot.sendMessage(
          chatId,
          "Por favor ingresa solo un número para el porcentaje."
        );
        return;
      }
      session.initialBattery = parseFloat(text);
      session.step = 3;
      await bot.sendMessage(
        chatId,
        "Gracias 😊\nFinalmente dime los kilómetros actuales del auto."
      );
      break;

    case 3:
      if (!/^\d+(\.\d+)?$/.test(text)) {
        await bot.sendMessage(
          chatId,
          "Por favor ingresa solo un número para los kilómetros."
        );
        return;
      }
      session.initialKM = parseFloat(text);

      // Enviar a Google Sheets
      try {
        await axios.post(WEBHOOK_URL, {
          fecha,
          initialKW: session.initialKW,
          initialBattery: session.initialBattery,
          initialKM: session.initialKM,
        });

        await bot.sendMessage(
          chatId,
          "✅ Todo registrado correctamente. ¡Buen trabajo, Juanito!"
        );

        // Limpiar sesión
        delete sessions[chatId];
      } catch (error) {
        console.error("Error enviando a Google Sheets:", error.message);
        await bot.sendMessage(
          chatId,
          "❌ Ocurrió un error al registrar los datos."
        );
      }
      break;
  }
});
