"""
ORACLE TENNIS BOT v1.0 - MODE GEMINI AUTONOME
Bot Telegram dédié tennis - Méthode Oracle Bet ULTIMATE v4.0
Combiné du jour 4 picks (ATP/WTA/Challenger/ITF)
Marchés : Vainqueur + Over/Under sets + Handicap jeux
100% Gemini, aucune API odds requise.
"""

import os
import logging
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

from analyzer import generate_combine

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = (
        "🎾 *ORACLE TENNIS BOT v1.0*\n\n"
        "Méthode ORACLE BET ULTIMATE v4.0 — édition tennis.\n\n"
        "*Commandes disponibles :*\n"
        "• `/combine` — Combiné du jour (4 picks)\n"
        "• `/help` — Aide\n\n"
        "Ou envoie simplement `combiné` / `analyse`.\n\n"
        "*Couverture :* ATP, WTA, Challenger, ITF\n"
        "*Marchés :* Vainqueur, Sets O/U, Handicap jeux\n"
        "*Cible :* 80% fiabilité (ticket SAFE)"
    )
    await update.message.reply_text(msg, parse_mode="Markdown")


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = (
        "🎾 *AIDE — ORACLE TENNIS*\n\n"
        "*Méthode :*\n"
        "Score Oracle /100 — seuils GOLD 78+ / SILVER 70-77 / BRONZE 60-69 / NO BET <60\n\n"
        "*Combiné cible :*\n"
        "• 4 picks équilibrés\n"
        "• Cote totale 2.20 — 4.00\n"
        "• Fiabilité ≤ 85%\n"
        "• Kill-switch activé\n\n"
        "*Tier 1 :* Grand Slam, Masters 1000, WTA 1000, ATP/WTA 500\n"
        "*Tier 2 :* ATP/WTA 250, Challenger\n"
        "*Tier 3 :* ITF\n\n"
        "Tape `/combine` pour le ticket du jour."
    )
    await update.message.reply_text(msg, parse_mode="Markdown")


async def combine_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🎾 *Génération du combiné tennis en cours...*\n"
        "_Analyse ULTIMATE v4.0 — recherche autonome des matchs du jour_",
        parse_mode="Markdown",
    )

    try:
        ticket = generate_combine(GEMINI_API_KEY)
        for chunk in split_message(ticket, 4000):
            await update.message.reply_text(chunk, parse_mode="Markdown")
    except Exception as e:
        logger.error(f"Erreur combine: {e}", exc_info=True)
        await update.message.reply_text(
            f"❌ Erreur lors de la génération.\n`{str(e)[:200]}`",
            parse_mode="Markdown",
        )


async def text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.lower().strip()
    triggers = ["combine", "combiné", "analyse", "ticket", "tennis"]

    if any(t in text for t in triggers):
        await combine_command(update, context)
    else:
        await update.message.reply_text(
            "🎾 Tape `/combine` pour le ticket tennis du jour.\n"
            "Ou `/help` pour l'aide.",
            parse_mode="Markdown",
        )


def split_message(text: str, max_len: int = 4000):
    if len(text) <= max_len:
        return [text]
    chunks = []
    while len(text) > max_len:
        cut = text.rfind("\n", 0, max_len)
        if cut == -1:
            cut = max_len
        chunks.append(text[:cut])
        text = text[cut:]
    if text:
        chunks.append(text)
    return chunks


def main():
    if not BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN manquant.")
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY manquante.")

    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("combine", combine_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_handler))

    logger.info("🎾 Oracle Tennis Bot démarré (mode Gemini autonome).")
    app.run_polling()


if __name__ == "__main__":
    main()
