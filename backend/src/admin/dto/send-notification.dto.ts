import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from 'prisma-client-custom';

export enum RecipientType {
  ALL_USERS = 'ALL_USERS',
  ALL_PROVIDERS = 'ALL_PROVIDERS',
  ALL_PASSENGERS = 'ALL_PASSENGERS',
  SPECIFIC_USER = 'SPECIFIC_USER',
}

export class SendNotificationDto {
  @ApiProperty({
    enum: RecipientType,
    description: 'Target audience for the notification',
    example: RecipientType.ALL_USERS,
  })
  @IsEnum(RecipientType)
  recipientType: RecipientType;

  @ApiPropertyOptional({
    description: 'Required when recipientType is SPECIFIC_USER — the user UUID',
    example: 'cly1abc23000008l6d1e2f3g4',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Notification title shown to the user',
    example: 'System Maintenance',
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Notification body message',
    example: 'Scheduled maintenance on Feb 20 from 2–4 AM IST.',
    minLength: 1,
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;

  @ApiPropertyOptional({
    enum: NotificationType,
    description: 'Notification category (defaults to SYSTEM)',
    example: 'SYSTEM',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType = NotificationType.SYSTEM;

  @ApiPropertyOptional({
    description: 'Optional city filter — only send to users in this city',
    example: 'Mumbai',
  })
  @IsOptional()
  @IsString()
  city?: string;
}
