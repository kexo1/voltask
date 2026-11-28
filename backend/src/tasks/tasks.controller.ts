import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { AddTaskDependencyDto } from './dto/add-task-dependency.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { ProjectContextQueryDto } from './dto/project-context-query.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

const TASK_CREATION_THROTTLE_WINDOW_MS = 60_000;

@Controller('tasks')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: TASK_CREATION_THROTTLE_WINDOW_MS } })
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
    const pagination = {
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    };
    return this.tasksService.findAll(user.id, query.projectId, pagination);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.update(id, updateTaskDto, user.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateTaskStatusDto: UpdateTaskStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.updateStatus(
      id,
      updateTaskStatusDto.projectId,
      updateTaskStatusDto.status,
      user.id,
    );
  }

  @Post(':id/dependencies')
  addDependency(
    @Param('id') id: string,
    @Body() addTaskDependencyDto: AddTaskDependencyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.addDependency(
      id,
      addTaskDependencyDto.projectId,
      addTaskDependencyDto.dependsOnId,
      user.id,
    );
  }

  @Delete(':id/dependencies/:dependsOnId')
  removeDependency(
    @Param('id') id: string,
    @Param('dependsOnId') dependsOnId: string,
    @Query() query: ProjectContextQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.removeDependency(
      id,
      query.projectId,
      dependsOnId,
      user.id,
    );
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Query() query: ProjectContextQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.delete(id, query.projectId, user.id);
  }
}
