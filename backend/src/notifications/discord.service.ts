import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  async send(message: string): Promise<void> {
    const url = process.env.DISCORD_WEBHOOK_URL;
    if (!url) {
      this.logger.warn('DISCORD_WEBHOOK_URL nie je nastavená, správa sa neposiela.');
      return;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      });
      if (!response.ok) {
        this.logger.error(`Discord webhook vrátil stav ${response.status}`);
      }
    } catch (error) {
      this.logger.error('Odoslanie na Discord zlyhalo', error as Error);
    }
  }
}
