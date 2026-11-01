import { Module } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { HealthController } from './health/health.controller';
import { EventsGateway } from './events/events.gateway';
import { DiscordService } from './notifications/discord.service';

@Module({
  controllers: [HealthController],
  providers: [PrismaService, EventsGateway, DiscordService],
})
export class AppModule {}
