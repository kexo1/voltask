import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from '../generated/prisma/enums';
import { PrismaService } from '../database/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { ProjectsService } from '../projects/projects.service';

const MAX_TASKS_PER_PROJECT = 500;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

const taskInclude = {
  dependencies: {
    orderBy: { createdAt: 'asc' },
    select: {
      dependsOnId: true,
      dependsOn: {
        select: { id: true, title: true, status: true },
      },
    },
  },
  dependents: {
    orderBy: { createdAt: 'asc' },
    select: {
      taskId: true,
      task: {
        select: { id: true, title: true, status: true },
      },
    },
  },
} satisfies Prisma.TaskInclude;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async findAll(
    userId: string,
    projectId?: string,
    pagination: { page: number; limit: number } = {
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
    },
  ) {
    let projectIds: string[];
    if (projectId) {
      await this.projectsService.requireAccess(projectId, userId);
      projectIds = [projectId];
    } else {
      projectIds = await this.projectsService.findAccessibleProjectIds(userId);
    }

    if (projectIds.length === 0) {
      return [];
    }

    return this.prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
      },
      include: taskInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });
  }

  async create(createTaskDto: CreateTaskDto, creatorId: string) {
    const task = await this.prisma.$transaction(async (transaction) => {
      await this.lockProject(transaction, createTaskDto.projectId);
      await this.projectsService.requireAccess(
        createTaskDto.projectId,
        creatorId,
        transaction,
      );

      const taskCount = await transaction.task.count({
        where: { projectId: createTaskDto.projectId },
      });
      if (taskCount >= MAX_TASKS_PER_PROJECT) {
        throw new ConflictException(
          `A project cannot have more than ${MAX_TASKS_PER_PROJECT} tasks`,
        );
      }

      if (createTaskDto.assigneeId) {
        await this.ensureProjectMember(
          transaction,
          createTaskDto.projectId,
          createTaskDto.assigneeId,
        );
      }

      return transaction.task.create({
        data: {
          title: createTaskDto.title,
          description: createTaskDto.description || null,
          status: createTaskDto.status,
          projectId: createTaskDto.projectId,
          creatorId,
          assigneeId: createTaskDto.assigneeId ?? null,
        },
        include: taskInclude,
      });
    });

    this.eventsGateway.emitToProject(task.projectId, 'task:created', task);

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string) {
    const hasChanges =
      updateTaskDto.title !== undefined ||
      updateTaskDto.description !== undefined ||
      updateTaskDto.status !== undefined ||
      updateTaskDto.assigneeId !== undefined;

    if (!hasChanges) {
      throw new BadRequestException(
        'At least one task field must be provided',
      );
    }

    const updatedTask = await this.prisma.$transaction(async (transaction) => {
      await this.lockProject(transaction, updateTaskDto.projectId);
      await this.projectsService.requireAccess(
        updateTaskDto.projectId,
        userId,
        transaction,
      );

      const existing = await transaction.task.findFirst({
        where: { id, projectId: updateTaskDto.projectId },
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundException(`Task "${id}" was not found`);
      }

      if (typeof updateTaskDto.assigneeId === 'string') {
        await this.ensureProjectMember(
          transaction,
          updateTaskDto.projectId,
          updateTaskDto.assigneeId,
        );
      }

      return transaction.task.update({
        where: { id },
        data: {
          ...(updateTaskDto.title !== undefined
            ? { title: updateTaskDto.title }
            : {}),
          ...(updateTaskDto.description !== undefined
            ? { description: updateTaskDto.description || null }
            : {}),
          ...(updateTaskDto.status !== undefined
            ? { status: updateTaskDto.status }
            : {}),
          ...(updateTaskDto.assigneeId !== undefined
            ? { assigneeId: updateTaskDto.assigneeId }
            : {}),
        },
        include: taskInclude,
      });
    });

    this.eventsGateway.emitToProject(
      updatedTask.projectId,
      'task:updated',
      updatedTask,
    );

    return updatedTask;
  }

  async updateStatus(
    id: string,
    projectId: string,
    status: TaskStatus,
    userId: string,
  ) {
    await this.projectsService.requireAccess(projectId, userId);
    const task = await this.prisma.task.findFirst({
      where: { id, projectId },
      select: { id: true },
    });

    if (!task) {
      throw new NotFoundException(`Task "${id}" was not found`);
    }

    const updatedTask = await this.prisma.task.update({
      where: { id, projectId },
      data: { status },
      include: taskInclude,
    });

    this.eventsGateway.emitToProject(
      updatedTask.projectId,
      'task:updated',
      updatedTask,
    );

    return updatedTask;
  }

  async addDependency(
    taskId: string,
    projectId: string,
    dependsOnId: string,
    userId: string,
  ) {
    if (taskId === dependsOnId) {
      throw new BadRequestException('Úloha nemôže závisieť sama od seba');
    }

    const updatedTask = await this.prisma.$transaction(async (transaction) => {
      await this.lockProject(transaction, projectId);
      await this.projectsService.requireAccess(projectId, userId, transaction);

      const tasks = await transaction.task.findMany({
        where: { projectId, id: { in: [taskId, dependsOnId] } },
        select: { id: true },
      });

      if (!tasks.some((t) => t.id === taskId)) {
        throw new NotFoundException(`Task "${taskId}" was not found`);
      }
      if (!tasks.some((t) => t.id === dependsOnId)) {
        throw new NotFoundException(`Task "${dependsOnId}" was not found`);
      }

      const existing = await transaction.taskDependency.findUnique({
        where: { taskId_dependsOnId: { taskId, dependsOnId } },
        select: { taskId: true },
      });
      if (existing) {
        throw new ConflictException('Táto závislosť už existuje');
      }

      const projectDependencies = await transaction.taskDependency.findMany({
        where: { task: { projectId } },
        select: { taskId: true, dependsOnId: true },
      });

      if (this.wouldCreateCycle(projectDependencies, taskId, dependsOnId)) {
        throw new BadRequestException(
          'Pridaním tejto závislosti by vznikol cyklus',
        );
      }

      await transaction.taskDependency.create({
        data: { taskId, dependsOnId },
      });

      return transaction.task.findUniqueOrThrow({
        where: { id: taskId },
        include: taskInclude,
      });
    });

    this.eventsGateway.emitToProject(
      updatedTask.projectId,
      'task:updated',
      updatedTask,
    );

    return updatedTask;
  }

  async removeDependency(
    taskId: string,
    projectId: string,
    dependsOnId: string,
    userId: string,
  ) {
    const updatedTask = await this.prisma.$transaction(async (transaction) => {
      await this.lockProject(transaction, projectId);
      await this.projectsService.requireAccess(projectId, userId, transaction);

      const task = await transaction.task.findFirst({
        where: { id: taskId, projectId },
        select: { id: true },
      });
      if (!task) {
        throw new NotFoundException(`Task "${taskId}" was not found`);
      }

      const deleted = await transaction.taskDependency.deleteMany({
        where: { taskId, dependsOnId },
      });
      if (deleted.count === 0) {
        throw new NotFoundException('Závislosť úlohy nebola nájdená');
      }

      return transaction.task.findUniqueOrThrow({
        where: { id: taskId },
        include: taskInclude,
      });
    });

    this.eventsGateway.emitToProject(
      updatedTask.projectId,
      'task:updated',
      updatedTask,
    );

    return updatedTask;
  }

  async delete(id: string, projectId: string, userId: string) {
    await this.projectsService.requireAccess(projectId, userId);
    const task = await this.prisma.task.findFirst({
      where: { id, projectId },
      select: { id: true },
    });
    if (!task) {
      throw new NotFoundException(`Task "${id}" was not found`);
    }
    await this.prisma.task.delete({ where: { id } });

    this.eventsGateway.emitToProject(projectId, 'task:deleted', {
      projectId,
      taskId: id,
    });

    return { success: true };
  }

  private wouldCreateCycle(
    edges: Array<{ taskId: string; dependsOnId: string }>,
    taskId: string,
    dependsOnId: string,
  ): boolean {
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      const list = adjacency.get(edge.taskId) ?? [];
      list.push(edge.dependsOnId);
      adjacency.set(edge.taskId, list);
    }

    const visited = new Set<string>();
    const queue = [dependsOnId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === taskId) {
        return true;
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      for (const next of adjacency.get(current) ?? []) {
        if (!visited.has(next)) {
          queue.push(next);
        }
      }
    }

    return false;
  }

  private async ensureProjectMember(
    transaction: Prisma.TransactionClient,
    projectId: string,
    userId: string,
  ): Promise<void> {
    const assigneeMembership = await transaction.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      select: { userId: true },
    });

    if (!assigneeMembership) {
      throw new BadRequestException(
        'Assignee must be a member of this project',
      );
    }
  }

  private async lockProject(
    transaction: Prisma.TransactionClient,
    projectId: string,
  ): Promise<void> {
    const projects = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Project" WHERE "id" = ${projectId} FOR UPDATE
    `;
    if (projects.length === 0) {
      throw new NotFoundException(`Project "${projectId}" was not found`);
    }
  }
}
