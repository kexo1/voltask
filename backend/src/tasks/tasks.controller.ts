import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TaskStatus } from '../generated/prisma/enums';
import { CreateTaskDto } from './dto/create-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @Headers('authorization') authorization?: string,
  ) {
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!bearerToken) {
      throw new UnauthorizedException('A valid bearer token is required');
    }

    let payload: { sub?: unknown };
    try {
      payload = await this.jwtService.verifyAsync<{ sub?: unknown }>(bearerToken);
    } catch {
      throw new UnauthorizedException('A valid bearer token is required');
    }

    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new UnauthorizedException('A valid bearer token is required');
    }

    return this.tasksService.create(createTaskDto, payload.sub);
  }

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