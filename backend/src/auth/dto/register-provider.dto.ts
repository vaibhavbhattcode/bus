import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterProviderDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @Transform(({ value }) => value?.trim())
  @MaxLength(100)
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Transform(({ value }) => value?.replace(/\s/g, ''))
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone must be a valid 10-digit Indian mobile number',
  })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Please confirm your password' })
  confirmPassword: string;

  // Provider / business details
  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  @Transform(({ value }) => value?.trim())
  @MaxLength(150)
  companyName: string;

  @IsString()
  @IsNotEmpty({ message: 'Contact person name is required' })
  @Transform(({ value }) => value?.trim())
  @MaxLength(100)
  contactName: string;

  @IsString()
  @IsNotEmpty({ message: 'Contact phone is required' })
  @Transform(({ value }) => value?.replace(/\s/g, ''))
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Contact phone must be a valid 10-digit Indian mobile number',
  })
  contactPhone: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => value?.trim().toLowerCase())
  contactEmail?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @MaxLength(300)
  address?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @MaxLength(80)
  city?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @MaxLength(80)
  state?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @Matches(/^\d{6}$/, { message: 'Pincode must be 6 digits' })
  pincode?: string;
}
