import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class EmailDTO {
    @ApiPropertyOptional()
    @IsOptional()
    @IsNotEmpty()
    @IsEmail()
    public email: string;

    @ApiPropertyOptional()
    @IsOptional()
    public targets: [TargetDTO];
}

export class TargetDTO {
    @ApiPropertyOptional()
    @IsOptional()
    @IsNotEmpty()
    public target: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNotEmpty()
    public target_model: string;
}