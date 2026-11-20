import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { TaskStatus } from '../../generated/prisma/enums';

export class UpdateTaskStatusDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsEnum(TaskStatus)
  status!: TaskStatus;
}
