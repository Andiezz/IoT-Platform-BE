import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongoModule } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { ValidationService } from './validation.service';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [ConfigModule, JwtModule],
  providers: [ValidationService],
  exports: [ValidationService],
})
export class ValidationModule {}
