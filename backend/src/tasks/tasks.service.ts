import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus } from '../generated/prisma/enums';
import { PrismaService } from '../database/prisma.service';
import { ProjectsService } from '../projects/projects.service';

const MAX_TASKS_PER_PROJECT = 500;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async findAll(
    userId: string,
    projectId?: string,
    pagination?: { page: number; limit: number },
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
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(pagination
        ? {
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit,
          }
        : {}),
    });
  }

  async create(createTaskDto: CreateTaskDto, creatorId: string) {
    return this.prisma.$transaction(async (transaction) => {
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
        const assigneeMembership = await transaction.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId: createTaskDto.projectId,
              userId: createTaskDto.assigneeId,
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

      return transaction.task.create({
        data: {
          title: createTaskDto.title,
          description: createTaskDto.description || null,
          status: createTaskDto.status,
          projectId: createTaskDto.projectId,
          creatorId,
          assigneeId: createTaskDto.assigneeId ?? null,
        },
      });
    });
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

    return this.prisma.task.update({
      where: { id, projectId },
      data: { status },
    });
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
    return { success: true };
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
