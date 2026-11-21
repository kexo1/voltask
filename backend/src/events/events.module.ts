import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [AuthModule, ProjectsModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
