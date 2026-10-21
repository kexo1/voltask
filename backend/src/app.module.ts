import { Module } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { HealthController } from './health/health.controller';
import { EventsGateway } from './events/events.gateway';
import { DiscordService } from './notifications/discord.service';

@Module({
  controllers: [HealthController],
  providers: [DatabaseService, EventsGateway, DiscordService],
})
export class AppModule {}
