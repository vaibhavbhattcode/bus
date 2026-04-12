import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { SanitizeString, SanitizeEmail, SanitizePhone } from '../../common/decorators/sanitize.decorator';

export class RegisterPassengerDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @SanitizeString()
  @MaxLength(100)
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  @SanitizeEmail()
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @SanitizePhone()
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

  @IsString()
  @IsOptional()
  @SanitizeString()
  @MaxLength(300)
  address?: string;

  @IsString()
  @IsOptional()
  @SanitizeString()
  @MaxLength(80)
  city?: string;

  @IsString()
  @IsOptional()
  @SanitizeString()
  @MaxLength(80)
  state?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @Matches(/^\d{6}$/, { message: 'Pincode must be 6 digits' })
  pincode?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  @SanitizePhone()
  @Matches(/^[6-9]\d{9}$|^$/, {
    message: 'Alternate phone must be a valid 10-digit Indian mobile number',
  })
  alternatePhone?: string;
}
