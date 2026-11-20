import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController, DashboardController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
