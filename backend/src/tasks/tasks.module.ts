import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [PrismaService, TasksService],
})
export class TasksModule {}