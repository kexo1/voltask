import { Body, Controller, Get, Param, ParseEnumPipe, Patch, Query } from '@nestjs/common';
import { TaskStatus } from '../generated/prisma/enums';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Query('teamId') teamId?: string) {
    return this.tasksService.findAll(teamId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status', new ParseEnumPipe(TaskStatus)) status: TaskStatus,
  ) {
    return this.tasksService.updateStatus(id, status);
  }
}