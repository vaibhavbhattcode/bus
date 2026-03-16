import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { TicketPriority } from 'prisma-client-custom';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsEnum(TicketPriority)
  @IsNotEmpty()
  priority: TicketPriority;
}
