import { IsEmail, IsNotEmpty, IsString, IsPhoneNumber, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from 'prisma-client-custom';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
