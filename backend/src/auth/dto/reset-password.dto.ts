import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty({ description: 'Reset token received via email' })
    @IsString()
    token: string;

    @ApiProperty({ example: 'NewP@ssw0rd!', minLength: 8 })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @Matches(/(?=.*[A-Z])(?=.*[0-9])/, {
        message: 'Password must contain at least one uppercase letter and one number',
    })
    password: string;
}
