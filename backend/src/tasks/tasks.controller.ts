import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { TaskStatus } from '../generated/prisma/enums';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.create(createTaskDto, user.id);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTasksQueryDto,
  ) {
    const pagination =
      query.page !== undefined || query.limit !== undefined
        ? { page: query.page ?? 1, limit: query.limit ?? 50 }
        : undefined;
    return this.tasksService.findAll(user.id, query.teamId, pagination);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status', new ParseEnumPipe(TaskStatus)) status: TaskStatus,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.updateStatus(id, status, user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.delete(id, user.id);
  }
}
