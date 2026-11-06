import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { EventsGateway } from './events/events.gateway';
import { DiscordService } from './notifications/discord.service';
import { TeamsModule } from './teams/teams.module';
import { TasksModule } from './tasks/tasks.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule, TeamsModule, TasksModule],
  controllers: [HealthController],
  providers: [EventsGateway, DiscordService],
})
export class AppModule {}
