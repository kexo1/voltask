import { IsNotEmpty, IsString } from 'class-validator';

export class ProjectContextQueryDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;
}
